import "server-only";
import { createClient } from "@/lib/supabase/server";

/** The only identity application code may rely on. */
export type SessionUser = {
  id: string;
  email: string | null;
};

export class UnauthenticatedError extends Error {
  constructor() {
    super("Unauthenticated");
    this.name = "UnauthenticatedError";
  }
}

/**
 * Identity from the verified access token (getClaims checks its signature).
 * A session revoked elsewhere stays accepted until the token expires; use
 * requireFreshUser where that delay is not acceptable.
 * Never use getSession() for authorization.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;
  if (!claims || typeof claims.sub !== "string" || claims.is_anonymous === true) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}

/** For Route Handlers and services: throws UnauthenticatedError when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}

/** Checks the session with the Auth server (sees revocation immediately). */
export async function requireFreshUser(): Promise<SessionUser> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) throw new UnauthenticatedError();
  return { id: data.user.id, email: data.user.email ?? null };
}
