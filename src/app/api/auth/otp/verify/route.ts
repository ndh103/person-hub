import { isRequestRateLimit, isUnavailable } from "@/lib/auth/errors";
import { safeNext } from "@/lib/auth/safe-next";
import { getSiteOrigin } from "@/lib/auth/site-url";
import { parseEmail, parseOtpCode } from "@/lib/auth/validation";
import { jsonError, jsonOk, readJsonObject, rejectUnsafePost } from "@/lib/server/http";
import { createClient } from "@/lib/supabase/server";

/** AUTH-002: sign in with the 6-digit code from the sign-in email. */
export async function POST(request: Request) {
  const rejected = rejectUnsafePost(request);
  if (rejected) return rejected;

  const body = await readJsonObject(request);
  const email = parseEmail(body?.email);
  const token = parseOtpCode(body?.code);
  if (!body || !email) return jsonError("invalid_request", 400);
  if (!token) return jsonError("invalid_code", 400);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

  if (error) {
    if (isRequestRateLimit(error)) return jsonError("rate_limited", 429);
    if (isUnavailable(error)) return jsonError("unavailable", 503);
    return jsonError("invalid_code", 400);
  }

  return jsonOk({ redirectTo: safeNext(body.next, getSiteOrigin()) });
}
