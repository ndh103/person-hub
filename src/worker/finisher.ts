import { zValidator } from "@hono/zod-validator";
import { Hono, type Context } from "hono";
import { z } from "zod";
import { finisherContext, TIME_ZONE_HEADER, type FinisherContext } from "@/features/finisher/server/context";
import { FinisherError } from "@/features/finisher/server/errors";
import * as mutations from "@/features/finisher/server/mutations";
import * as queries from "@/features/finisher/server/queries";
import { TASK_GROUPS } from "@/features/finisher/types";
import { requireUser, type AuthVariables } from "./auth";
import type { Bindings } from "./env";
import { apiError, readJsonObject } from "./http";

type Env = { Bindings: Bindings; Variables: AuthVariables & { finisher: FinisherContext } };

/** Pages for "Load more" never go past this offset (FIN-022). */
const MAX_TASK_OFFSET = 10_000;

/** Ids are UUIDs; anything else cannot exist, so it is "not found" rather than a bad request. */
const idParam = zValidator("param", z.object({ id: z.uuid() }), (result, c) => {
  if (!result.success) return apiError(c, "not_found", 404);
});

/** Query strings are bounded; filters with unknown values fall back to "all" in the query layer. */
function query<T extends z.ZodType>(schema: T) {
  return zValidator("query", schema, (result, c) => {
    if (!result.success) return apiError(c, "invalid_request", 400);
  });
}

const short = z.string().max(64).optional();

/** The request body as a small JSON object, or a 400 FinisherError. */
async function body(c: Context): Promise<Record<string, unknown>> {
  const parsed = await readJsonObject(c.req.raw);
  if (!parsed) throw new FinisherError("invalid_request", 400);
  return parsed;
}

/**
 * /api/finisher. Every route runs after requireUser, so each handler has a
 * verified caller and a Supabase client bound to their token. Reads return
 * the same narrow view models the pages render (types.ts); writes go through
 * the database write functions (ADR-0002).
 */
export const finisher = new Hono<Env>()
  .use(requireUser)
  .use(async (c, next) => {
    c.set("finisher", finisherContext(c.var.user, c.var.supabase, c.req.header(TIME_ZONE_HEADER)));
    await next();
  })

  // Reads -------------------------------------------------------------------
  .get("/basics", async (c) => c.json(await queries.getFinisherBasics(c.var.finisher)))
  .get("/today", async (c) => c.json(await queries.getToday(c.var.finisher)))
  .get("/tasks", query(z.object({ project: short })), async (c) =>
    c.json(await queries.getTasksTab(c.var.finisher, c.req.valid("query").project)),
  )
  .get(
    "/task-groups/:group",
    zValidator("param", z.object({ group: z.enum(TASK_GROUPS) }), (result, c) => {
      if (!result.success) return apiError(c, "invalid_request", 400);
    }),
    query(
      z.object({
        project: short,
        offset: z.coerce
          .number()
          .int()
          .min(0)
          .max(MAX_TASK_OFFSET)
          .refine((value) => value % queries.TASK_PAGE_SIZE === 0)
          .default(0),
      }),
    ),
    async (c) => {
      const { project, offset } = c.req.valid("query");
      return c.json(await queries.getTaskGroup(c.var.finisher, c.req.valid("param").group, project, offset));
    },
  )
  .get("/tasks/:id", idParam, async (c) => {
    const page = await queries.getTaskPage(c.var.finisher, c.req.valid("param").id);
    return page ? c.json(page) : apiError(c, "not_found", 404);
  })
  .get("/projects", async (c) => c.json(await queries.getProjectsTab(c.var.finisher)))
  .get("/projects/:id", idParam, async (c) => {
    const project = await queries.getProject(c.var.finisher, c.req.valid("param").id);
    return project ? c.json(project) : apiError(c, "not_found", 404);
  })
  .get("/closed", query(z.object({ type: short, outcome: short, cursor: short })), async (c) => {
    const { type, outcome, cursor } = c.req.valid("query");
    return c.json(await queries.getClosed(c.var.finisher, type, outcome, cursor));
  })

  // Writes ------------------------------------------------------------------
  // FIN-019 create a task; FIN-020 edit; FIN-021 lifecycle; FIN-016 delete.
  .post("/tasks", async (c) => c.json(await mutations.createTask(c.var.finisher, await body(c))))
  .patch("/tasks/:id", idParam, async (c) => {
    await mutations.updateTask(c.var.finisher, c.req.valid("param").id, await body(c));
    return c.json({ ok: true });
  })
  .post("/tasks/:id/actions", idParam, async (c) =>
    c.json(await mutations.taskAction(c.var.finisher, c.req.valid("param").id, await body(c))),
  )
  // FIN-037 quick due date (only dueDate and dueTime); FIN-038 order. Both idempotent.
  .put("/tasks/:id/due", idParam, async (c) => {
    await mutations.setTaskDue(c.var.finisher, c.req.valid("param").id, await body(c));
    return c.json({ ok: true });
  })
  .put("/tasks/:id/position", idParam, async (c) => {
    await mutations.moveTask(c.var.finisher, c.req.valid("param").id, await body(c));
    return c.json({ ok: true });
  })
  .delete("/tasks/:id", idParam, async (c) => {
    await mutations.deleteTask(c.var.finisher, c.req.valid("param").id);
    return c.json({ ok: true });
  })
  // FIN-023 create a project; FIN-024 edit and lifecycle; FIN-016 delete.
  .post("/projects", async (c) => c.json(await mutations.createProject(c.var.finisher, await body(c))))
  .patch("/projects/:id", idParam, async (c) => {
    await mutations.updateProject(c.var.finisher, c.req.valid("param").id, await body(c));
    return c.json({ ok: true });
  })
  .post("/projects/:id/actions", idParam, async (c) =>
    c.json(await mutations.projectAction(c.var.finisher, c.req.valid("param").id, await body(c))),
  )
  .delete("/projects/:id", idParam, async (c) => {
    await mutations.deleteProject(c.var.finisher, c.req.valid("param").id);
    return c.json({ ok: true });
  })
  // FIN-025 weekly slots.
  .post("/projects/:id/slots", idParam, async (c) =>
    c.json(await mutations.addSlot(c.var.finisher, c.req.valid("param").id, await body(c))),
  )
  .patch("/slots/:id", idParam, async (c) => {
    await mutations.updateSlot(c.var.finisher, c.req.valid("param").id, await body(c));
    return c.json({ ok: true });
  })
  .delete("/slots/:id", idParam, async (c) => {
    await mutations.removeSlot(c.var.finisher, c.req.valid("param").id);
    return c.json({ ok: true });
  })
  // FIN-027 mark a session done | skipped | unmarked. Idempotent.
  .put("/sessions", async (c) => c.json(await mutations.markSession(c.var.finisher, await body(c))));
