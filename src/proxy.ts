import type { NextRequest } from "next/server";
import { DEFAULT_NEXT } from "@/lib/auth/safe-next";
import { redirectKeepingSession, refreshSession } from "@/lib/supabase/proxy";

/** Pages a signed-out visitor may open. Everything else requires a session. */
const PUBLIC_PATHS = ["/sign-in", "/forgot-password", "/auth/confirm", "/auth/callback", "/auth/error"];
/** Pages that make no sense once signed in. */
const SIGNED_OUT_ONLY_PATHS = ["/sign-in", "/forgot-password"];

function matches(pathname: string, paths: string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Session refresh and page protection (architecture FLOW-0, AUTH-007).
 * This is an extra layer only: layouts, Route Handlers and services verify the
 * session again themselves.
 */
export async function proxy(request: NextRequest) {
  const { response, userId, hadSessionCookie } = await refreshSession(request);
  const { pathname, search } = request.nextUrl;

  let result = response;

  if (pathname.startsWith("/api/")) {
    // APIs answer 401 themselves; never redirect them.
  } else if (!userId && !matches(pathname, PUBLIC_PATHS)) {
    const signIn = new URL("/sign-in", request.url);
    if (pathname !== "/") signIn.searchParams.set("next", pathname + search);
    if (hadSessionCookie) signIn.searchParams.set("reason", "expired");
    result = redirectKeepingSession(signIn, response);
  } else if (userId && matches(pathname, SIGNED_OUT_ONLY_PATHS)) {
    result = redirectKeepingSession(new URL(DEFAULT_NEXT, request.url), response);
  }

  result.headers.set("Cache-Control", "private, no-store");
  return result;
}

export const config = {
  matcher: [
    // Everything except build assets, image optimisation and static files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
