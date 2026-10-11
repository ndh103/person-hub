import "server-only";
import { getSiteOrigin } from "@/lib/auth/site-url";
import type { AuthApiErrorCode } from "@/lib/auth/errors";

/** Personal and auth responses must never be stored by shared caches. */
export const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" } as const;

const MAX_JSON_BYTES = 4096;

export function jsonOk(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}

export function jsonError(code: AuthApiErrorCode, status: number): Response {
  return Response.json({ error: code }, { status, headers: NO_STORE_HEADERS });
}

/** 303 redirect to a path on the hub's own origin. */
export function redirectTo(path: string): Response {
  return new Response(null, {
    status: 303,
    headers: { ...NO_STORE_HEADERS, Location: new URL(path, getSiteOrigin()).toString() },
  });
}

/**
 * CSRF guard for cookie-authenticated POSTs: the request must come from the
 * hub's own origin and be JSON (a cross-site HTML form cannot send JSON
 * without a CORS preflight, which this app never allows).
 * Returns an error response to send, or null when the request may proceed.
 */
export function rejectUnsafePost(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin || origin !== getSiteOrigin()) return jsonError("invalid_origin", 403);
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return jsonError("unsupported_media_type", 415);
  }
  return null;
}

/** Reads a small JSON object body; returns null when it is missing, too large or not an object. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_JSON_BYTES) return null;
  let text: string;
  try {
    text = await request.text();
  } catch {
    return null;
  }
  if (text.length > MAX_JSON_BYTES) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
