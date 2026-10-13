import { zValidator } from "@hono/zod-validator";
import { Hono, type Context } from "hono";
import { z } from "zod";
import { cleanQuery, codePoints, LIMITS } from "@/features/events/domain/validation";
import { EventsError } from "@/features/events/server/errors";
import * as mutations from "@/features/events/server/mutations";
import * as queries from "@/features/events/server/queries";
import { requireUser, type AuthVariables } from "./auth";
import type { Bindings } from "./env";
import { apiError, readJsonObject } from "./http";

type Env = { Bindings: Bindings; Variables: AuthVariables };

/** Ids are UUIDs; anything else cannot exist, so it is "not found" rather than a bad request. */
const idParam = zValidator("param", z.object({ id: z.uuid() }), (result, c) => {
  if (!result.success) return apiError(c, "not_found", 404);
});

/**
 * The list request (EVT-002, EVT-009). Sent as a POST body, not a query
 * string, because Workers Logs records request URLs and search text is
 * personal (EVT-007, docs/architecture/events.md).
 */
const ListRequest = z.strictObject({
  q: z
    .string()
    .max(LIMITS.query * 4)
    .transform(cleanQuery)
    .refine((value) => codePoints(value) <= LIMITS.query)
    .nullish(),
  year: z.number().int().min(1900).max(2100).nullish(),
  cursor: z.string().max(512).nullish(),
});

/** The request body as a small JSON object, or a 400. */
async function body(c: Context): Promise<Record<string, unknown>> {
  const parsed = await readJsonObject(c.req.raw);
  if (!parsed) throw new EventsError("invalid_request", 400);
  return parsed;
}

/**
 * /api/events. Every route runs after requireUser, so each handler has a
 * verified caller and a Supabase client bound to their token; RLS scopes
 * every read and write to that caller (ADR-0004).
 */
export const events = new Hono<Env>()
  .use(requireUser)

  // Reads -------------------------------------------------------------------
  .post("/query", async (c) => {
    const request = ListRequest.safeParse(await body(c));
    if (!request.success) return apiError(c, "invalid_request", 400);
    const { q, year, cursor } = request.data;
    return c.json(await queries.listEvents(c.var.supabase, { q: q || null, year: year ?? null, cursor: cursor ?? null }));
  })
  .get("/years", async (c) => c.json({ years: await queries.listYears(c.var.supabase) }))

  // Writes ------------------------------------------------------------------
  // EVT-003 create; EVT-005 edit; EVT-006 delete.
  .post("/", async (c) => c.json({ item: await mutations.createEvent(c.var.supabase, await body(c)) }, 201))
  .patch("/:id", idParam, async (c) =>
    c.json({ item: await mutations.updateEvent(c.var.supabase, c.req.valid("param").id.toLowerCase(), await body(c)) }),
  )
  .delete("/:id", idParam, async (c) => {
    await mutations.deleteEvent(c.var.supabase, c.req.valid("param").id.toLowerCase());
    return c.json({ ok: true });
  });
