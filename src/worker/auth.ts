import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createMiddleware } from "hono/factory";
import type { Bindings } from "./env";
import { apiError } from "./http";

/** The only identity application code may rely on. */
export type SessionUser = {
  id: string;
  email: string | null;
};

export type AuthVariables = {
  user: SessionUser;
  /** Bound to the caller's access token; use only for this request. */
  supabase: SupabaseClient;
};

/** Access tokens are compact JWTs; anything longer is not one of ours. */
const MAX_TOKEN_LENGTH = 8192;
const BEARER = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;

export function bearerToken(header: string | undefined): string | null {
  if (!header || header.length > MAX_TOKEN_LENGTH + 7) return null;
  return BEARER.exec(header)?.[1] ?? null;
}

/**
 * Supabase client that acts as the caller: the publishable key plus the
 * caller's access token, so PostgREST applies RLS for that user. Created per
 * request and never shared between requests.
 */
export function createUserClient(env: Bindings, token: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Identity from a verified access token. getClaims(token) checks the expiry and
 * the signature (locally against the project's cached JWKS for asymmetric
 * keys, otherwise with the Auth server). A session revoked elsewhere stays
 * accepted until its access token expires (architecture R3).
 */
export async function verifyUser(supabase: SupabaseClient, token: string): Promise<SessionUser | null> {
  const { data, error } = await supabase.auth.getClaims(token);
  const claims = error ? null : data?.claims;
  if (!claims || typeof claims.sub !== "string" || claims.role !== "authenticated" || claims.is_anonymous === true) {
    return null;
  }
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}

/**
 * Requires `Authorization: Bearer <access token>` on every request it guards
 * and answers 401 before any handler or database access otherwise. Handlers
 * read `c.var.user` and `c.var.supabase`; they never take a user ID from input.
 */
export const requireUser = createMiddleware<{ Bindings: Bindings; Variables: AuthVariables }>(async (c, next) => {
  const token = bearerToken(c.req.header("authorization"));
  if (!token) return apiError(c, "unauthenticated", 401);
  const supabase = createUserClient(c.env, token);
  const user = await verifyUser(supabase, token);
  if (!user) return apiError(c, "unauthenticated", 401);
  c.set("user", user);
  c.set("supabase", supabase);
  await next();
});
