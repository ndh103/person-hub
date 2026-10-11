import type { AuthApiErrorCode } from "@/lib/auth/errors";

export type AuthApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AuthApiErrorCode | "network" };

/** POSTs JSON to a same-origin /api/auth endpoint. Never throws. */
export async function postAuth<T>(path: string, body: Record<string, unknown> = {}): Promise<AuthApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "network" };
  }

  const data: unknown = await response.json().catch(() => ({}));
  if (response.ok) return { ok: true, data: data as T };

  const code = (data as { error?: AuthApiErrorCode }).error;
  return { ok: false, error: code ?? "unavailable" };
}

/** Full navigation so server-rendered pages read the new session cookies. */
export function navigateTo(path: string) {
  window.location.assign(path);
}
