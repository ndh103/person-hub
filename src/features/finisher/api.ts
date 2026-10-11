import type { FieldErrors } from "./domain/validation";
import type { FinisherApiErrorCode } from "./messages";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: FinisherApiErrorCode; fields?: FieldErrors };

/**
 * Calls a same-origin /api/finisher endpoint with JSON. Never throws.
 * The browser sends the Origin header the server checks for CSRF.
 */
export async function finisherApi<T = Record<string, unknown>>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "network" };
  }
  const data: unknown = await response.json().catch(() => ({}));
  if (response.ok) return { ok: true, data: data as T };
  const { error, fields } = data as { error?: FinisherApiErrorCode; fields?: FieldErrors };
  return { ok: false, error: error ?? "unavailable", fields };
}
