import type { NextRequest } from "next/server";
import { isSignupRefusal } from "@/lib/auth/errors";
import { safeNext } from "@/lib/auth/safe-next";
import { getSiteOrigin } from "@/lib/auth/site-url";
import { redirectTo } from "@/lib/server/http";
import { createClient } from "@/lib/supabase/server";

/**
 * Google sign-in return (AUTH-003). Exchanges the one-time code for a session
 * using the PKCE verifier cookie set by POST /api/auth/google.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const providerError = params.get("error_code") ?? params.get("error");
  if (providerError) {
    return redirectTo(
      isSignupRefusal(params.get("error_code"), params.get("error_description"))
        ? "/sign-in?error=google_no_access"
        : "/sign-in?error=google",
    );
  }

  const code = params.get("code");
  if (!code || code.length > 512) return redirectTo("/sign-in?error=google");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectTo(isSignupRefusal(error.code) ? "/sign-in?error=google_no_access" : "/sign-in?error=google");
  }

  return redirectTo(safeNext(params.get("next"), getSiteOrigin()));
}
