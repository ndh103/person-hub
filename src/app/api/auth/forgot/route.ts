import { isRequestRateLimit, isUnavailable } from "@/lib/auth/errors";
import { siteUrl } from "@/lib/auth/site-url";
import { parseEmail } from "@/lib/auth/validation";
import { jsonError, jsonOk, readJsonObject, rejectUnsafePost } from "@/lib/server/http";
import { createClient } from "@/lib/supabase/server";

/** AUTH-005: request a password reset email. Same answer for every address (AUTH-008). */
export async function POST(request: Request) {
  const rejected = rejectUnsafePost(request);
  if (rejected) return rejected;

  const body = await readJsonObject(request);
  const email = parseEmail(body?.email);
  if (!body || !email) return jsonError("invalid_request", 400);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: siteUrl("/account/set-password").toString(),
  });

  if (error) {
    if (isRequestRateLimit(error)) return jsonError("rate_limited", 429);
    if (isUnavailable(error)) return jsonError("unavailable", 503);
  }

  return jsonOk({ sent: true });
}
