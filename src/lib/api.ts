import { currentSession } from "@/lib/supabase/client";

export type ApiFailure<E extends string> = { ok: false; error: E | "network" | "unauthenticated" | "unavailable"; fields?: Record<string, string> };
export type ApiResult<T, E extends string = string> = { ok: true; data: T } | ApiFailure<E>;

export type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

let onUnauthenticated: (() => void) | null = null;

/** Called when the API rejects the session (expired or revoked); the app signs out and shows sign-in. */
export function setUnauthenticatedHandler(handler: () => void) {
  onUnauthenticated = handler;
}

/**
 * Calls a same-origin /api endpoint with JSON and the caller's access token.
 * Never throws. The token is read per call, so a refreshed one is always used.
 */
export async function apiFetch<T, E extends string = string>(
  method: ApiMethod,
  path: string,
  body?: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<ApiResult<T, E>> {
  const session = await currentSession();
  if (!session) {
    onUnauthenticated?.();
    return { ok: false, error: "unauthenticated" };
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: {
        ...headers,
        Authorization: `Bearer ${session.access_token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "omit",
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "network" };
  }

  const data: unknown = await response.json().catch(() => ({}));
  if (response.ok) return { ok: true, data: data as T };
  if (response.status === 401) onUnauthenticated?.();
  const { error, fields } = data as { error?: E; fields?: Record<string, string> };
  return { ok: false, error: error ?? "unavailable", fields };
}
