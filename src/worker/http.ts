import type { Context } from "hono";
import { createMiddleware } from "hono/factory";

/** Personal responses must never be stored by shared caches (or the browser's). */
export const NO_STORE = "private, no-store";

/** Largest accepted body: a new project with 20 slots and every text at its limit fits comfortably. */
export const MAX_BODY_BYTES = 32 * 1024;

/** Every API error is `{ error, fields? }` with a safe code; never database or Auth text. */
export function apiError(c: Context, code: string, status: number, fields?: Record<string, unknown>): Response {
  c.header("Cache-Control", NO_STORE);
  return c.json(fields ? { error: code, fields } : { error: code }, status as 400);
}

/** Sets no-store on every API response, including errors and 404s. */
export const noStore = createMiddleware(async (c, next) => {
  await next();
  c.res.headers.set("Cache-Control", NO_STORE);
});

/**
 * Defence in depth for writes. Auth is a Bearer token, which browsers never
 * attach on their own, so classic CSRF does not apply (ADR-0003). Still:
 * - a browser request from another site (Origin present and different) is refused;
 * - writes with a body must be JSON, which a cross-site form cannot send
 *   without a CORS preflight, and this API sends no CORS headers.
 */
export const guardWrites = createMiddleware(async (c, next) => {
  const method = c.req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
  const origin = c.req.header("origin");
  if (origin !== undefined && origin !== new URL(c.req.url).origin) return apiError(c, "invalid_origin", 403);
  if (method !== "DELETE") {
    const contentType = c.req.header("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) return apiError(c, "unsupported_media_type", 415);
  }
  await next();
});

/** Reads a small JSON object body; returns null when it is missing, too large or not an object. */
export async function readJsonObject(request: Request, maxBytes: number = MAX_BODY_BYTES): Promise<Record<string, unknown> | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return null;
  let text: string;
  try {
    text = await request.text();
  } catch {
    return null;
  }
  if (text.length > maxBytes) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
