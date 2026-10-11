import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { sessionCookieOptions, supabaseEnv } from "./env";

/**
 * Supabase client bound to the caller's session cookies. Create one per
 * request (Server Components, Route Handlers, server-only services); never
 * share it between requests. Uses the publishable key, so RLS always applies.
 */
export async function createClient() {
  // Session checks compare token expiry with the current time, so they must
  // run at request time. With Cache Components and Partial Prefetching,
  // cookies() alone does not stop prerendering (the App Shell may include
  // session data), and Supabase's Date.now() then fails the build-time check.
  await connection();
  const cookieStore = await cookies();
  const { url, publishableKey } = supabaseEnv();

  return createServerClient(url, publishableKey, {
    cookieOptions: sessionCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Route Handlers own their response: every one of them already sends
        // Cache-Control: private, no-store, which covers the headers Supabase
        // asks for here.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. proxy.ts refreshes the
          // session before rendering, so this is safe to ignore.
        }
      },
    },
  });
}
