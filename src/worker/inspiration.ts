import { zValidator } from "@hono/zod-validator";
import { Hono, type Context } from "hono";
import { z } from "zod";
import { STORED_TYPES } from "@/features/inspiration/domain/image";
import { cleanQuery, cleanTag, codePointsOf, LIMITS } from "@/features/inspiration/domain/validation";
import { InspirationError } from "@/features/inspiration/server/errors";
import * as mutations from "@/features/inspiration/server/mutations";
import * as queries from "@/features/inspiration/server/queries";
import { requireUser, type AuthVariables } from "./auth";
import type { Bindings } from "./env";
import { apiError, readJsonObject } from "./http";

type Env = { Bindings: Bindings; Variables: AuthVariables };

/** Create and update bodies may carry up to 50,000 characters of article text. */
const MAX_ITEM_BODY_BYTES = 256 * 1024;

/** Ids and upload keys are UUIDs; anything else cannot exist, so it is "not found". */
const idParam = zValidator("param", z.object({ id: z.uuid() }), (result, c) => {
  if (!result.success) return apiError(c, "not_found", 404);
});
const keyParam = zValidator("param", z.object({ key: z.uuid() }), (result, c) => {
  if (!result.success) return apiError(c, "not_found", 404);
});

/**
 * The list request (INS-002, INS-008). A POST body, not a query string,
 * because Workers Logs records request URLs and search text is personal.
 */
const ListRequest = z.strictObject({
  q: z
    .string()
    .max(LIMITS.query * 4)
    .transform(cleanQuery)
    .refine((value) => codePointsOf(value) <= LIMITS.query)
    .nullish(),
  kind: z.enum(["article", "image"]).nullish(),
  tag: z
    .string()
    .max(LIMITS.tag * 4)
    .transform(cleanTag)
    .refine((value) => codePointsOf(value) <= LIMITS.tag)
    .nullish(),
  cursor: z.string().max(512).nullish(),
});

const UploadRequest = z.strictObject({ contentType: z.enum(STORED_TYPES) });

/** The request body as a JSON object, or a 400. */
async function body(c: Context, maxBytes?: number): Promise<Record<string, unknown>> {
  const parsed = await readJsonObject(c.req.raw, maxBytes);
  if (!parsed) throw new InspirationError("invalid_request", 400);
  return parsed;
}

/**
 * /api/inspiration. Every route runs after requireUser, so each handler has a
 * verified caller and a Supabase client bound to their token; RLS scopes
 * every read and write, in the database and in Storage, to that caller
 * (ADR-0004, ADR-0009).
 */
export const inspiration = new Hono<Env>()
  .use(requireUser)

  // Reads -------------------------------------------------------------------
  .post("/query", async (c) => {
    const request = ListRequest.safeParse(await body(c));
    if (!request.success) return apiError(c, "invalid_request", 400);
    const { q, kind, tag, cursor } = request.data;
    return c.json(
      await queries.listItems(c.var.supabase, c.var.user.id, { q: q || null, kind: kind ?? null, tag: tag || null, cursor: cursor ?? null }),
    );
  })
  .get("/tags", async (c) => c.json({ tags: await queries.listTags(c.var.supabase) }))
  .get("/usage", async (c) => c.json({ bytes: await queries.getUsage(c.var.supabase) }))

  // Uploads (INS-004, ADR-0009) ---------------------------------------------
  .post("/uploads", async (c) => {
    const request = UploadRequest.safeParse(await body(c));
    if (!request.success) return apiError(c, "invalid_request", 400);
    return c.json(await mutations.createUpload(c.var.supabase, c.var.user.id, request.data.contentType), 201);
  })
  .delete("/uploads/:key", keyParam, async (c) => {
    await mutations.discardUpload(c.var.supabase, c.var.user.id, c.req.valid("param").key.toLowerCase());
    return c.json({ ok: true });
  })

  // Entries -----------------------------------------------------------------
  // INS-003/004 create; INS-005 view; INS-006 edit; INS-007 delete.
  .post("/", async (c) =>
    c.json({ item: await mutations.createItem(c.var.supabase, c.var.user.id, await body(c, MAX_ITEM_BODY_BYTES)) }, 201),
  )
  .get("/:id", idParam, async (c) => c.json({ item: await queries.getItem(c.var.supabase, c.req.valid("param").id.toLowerCase()) }))
  .patch("/:id", idParam, async (c) =>
    c.json({
      item: await mutations.updateItem(c.var.supabase, c.req.valid("param").id.toLowerCase(), await body(c, MAX_ITEM_BODY_BYTES)),
    }),
  )
  .delete("/:id", idParam, async (c) => {
    await mutations.deleteItem(c.var.supabase, c.req.valid("param").id.toLowerCase());
    return c.json({ ok: true });
  });
