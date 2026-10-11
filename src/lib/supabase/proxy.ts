import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieOptions, supabaseEnv } from "./env";

export type SessionRefresh = {
  /** The response to return. It carries any refreshed session cookies. */
  response: NextResponse;
  /** Verified identity, or null when there is no valid session. */
  userId: string | null;
  /** The request carried a Supabase auth cookie (used to tell "expired" from "never signed in"). */
  hadSessionCookie: boolean;
};

/**
 * Verifies and, when close to expiry, refreshes the session for one request.
 * Runs once per request in proxy.ts (architecture FLOW-0). Do not refresh in a
 * second place: refresh-token reuse detection can revoke the whole session.
 */
export async function refreshSession(request: NextRequest): Promise<SessionRefresh> {
  const { url, publishableKey } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookieOptions: sessionCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Make refreshed tokens visible to the route being rendered…
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        // …and to the browser.
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;
  const userId = claims && typeof claims.sub === "string" && claims.is_anonymous !== true ? claims.sub : null;

  const hadSessionCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));

  return { response, userId, hadSessionCookie };
}

/** Builds a redirect that keeps the refreshed cookies and cache headers from `from`. */
export function redirectKeepingSession(target: URL, from: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(target);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}
