import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

let client: SupabaseClient | null = null;

/**
 * The browser's Supabase Auth client (ADR-0003). It signs in, keeps the
 * session in localStorage and refreshes the access token. Application data
 * never goes through it: pages call the API (src/lib/api.ts), which verifies
 * the token and queries Supabase as the caller.
 */
export function supabase(): SupabaseClient {
  client ??= createClient(supabaseEnv().url, supabaseEnv().publishableKey, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      // Email links and the Google return are handled explicitly by
      // /auth/confirm and /auth/callback, never implicitly on any page.
      detectSessionInUrl: false,
    },
  });
  return client;
}

/**
 * The current session, refreshed if its access token has expired. For
 * navigation decisions and the API's Bearer header only: the API verifies the
 * token itself and never trusts this client-side view.
 */
export async function currentSession(): Promise<Session | null> {
  return (await sessionStatus()).session;
}

/** Like currentSession, and tells an ended session (refresh failed) from never having signed in. */
export async function sessionStatus(): Promise<{ session: Session | null; expired: boolean }> {
  try {
    const { data, error } = await supabase().auth.getSession();
    return { session: data.session, expired: !data.session && error !== null };
  } catch {
    return { session: null, expired: false };
  }
}
