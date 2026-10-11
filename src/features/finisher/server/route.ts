import "server-only";
import { requireUser, UnauthenticatedError } from "@/lib/server/auth";
import { isSameOrigin, NO_STORE_HEADERS, readJsonObject } from "@/lib/server/http";
import type { FinisherApiErrorCode } from "../messages";
import { FinisherError } from "./errors";

/** Largest accepted body: a new project with 20 slots and every text at its limit fits comfortably. */
const MAX_BODY_BYTES = 32 * 1024;

type Body = Record<string, unknown>;

export function finisherJson(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}

function errorResponse(code: FinisherApiErrorCode, status: number, fields?: Record<string, unknown>): Response {
  return finisherJson(fields ? { error: code, fields } : { error: code }, status);
}

/**
 * Wraps every /api/finisher handler:
 * - mutations require the hub's own Origin (CSRF) and, when they carry a body,
 *   a JSON content type (a cross-site form can't send one without a CORS
 *   preflight, which this app never allows);
 * - the session is verified before any input is parsed (401 otherwise);
 * - expected failures become `{ error, fields? }` with safe codes, anything
 *   else a generic 503; responses are never cacheable.
 */
export async function handleFinisherRequest(
  request: Request,
  options: { mutation: boolean; body?: boolean },
  run: (body: Body) => Promise<Record<string, unknown>>,
): Promise<Response> {
  if (options.mutation && !isSameOrigin(request)) return errorResponse("invalid_origin", 403);

  let body: Body = {};
  if (options.body) {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) return errorResponse("unsupported_media_type", 415);
  }

  try {
    await requireUser();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return errorResponse("unauthenticated", 401);
    throw error;
  }

  if (options.body) {
    const parsed = await readJsonObject(request, MAX_BODY_BYTES);
    if (!parsed) return errorResponse("invalid_request", 400);
    body = parsed;
  }

  try {
    return finisherJson(await run(body));
  } catch (error) {
    if (error instanceof FinisherError) return errorResponse(error.code, error.status, error.fields);
    if (error instanceof UnauthenticatedError) return errorResponse("unauthenticated", 401);
    console.error("finisher: unexpected error", error instanceof Error ? error.name : "unknown");
    return errorResponse("unavailable", 503);
  }
}
