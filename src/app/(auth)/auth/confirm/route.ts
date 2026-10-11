import type { NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/safe-next";
import { getSiteOrigin } from "@/lib/auth/site-url";
import { parseConfirmType } from "@/lib/auth/validation";
import { redirectTo } from "@/lib/server/http";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing route for email links: magic link (type=email), invitation
 * (type=invite) and password reset (type=recovery). AUTH-002, 004, 005, 009.
 *
 * A GET that creates a session is a documented exception to "no
 * state-changing GET" (architecture, Routes): the single-use token hash only
 * ever signs in the user it was issued for.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = parseConfirmType(params.get("type"));

  if (!tokenHash || tokenHash.length > 512 || !type) return redirectTo("/auth/error");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return redirectTo("/auth/error");

  if (type === "invite" || type === "recovery") return redirectTo("/account/set-password");
  return redirectTo(safeNext(params.get("next"), getSiteOrigin()));
}
