import { isRequestRateLimit, isUnavailable } from "@/lib/auth/errors";
import { safeNext } from "@/lib/auth/safe-next";
import { getSiteOrigin, siteUrl } from "@/lib/auth/site-url";
import { parseEmail } from "@/lib/auth/validation";
import { jsonError, jsonOk, readJsonObject, rejectUnsafePost } from "@/lib/server/http";
import { createClient } from "@/lib/supabase/server";

/**
 * AUTH-002: send a sign-in email with a magic link and a 6-digit code.
 * Always answers `sent: true` unless the whole service or client is limited,
 * so the response never reveals whether the address has an account (AUTH-008).
 */
export async function POST(request: Request) {
  const rejected = rejectUnsafePost(request);
  if (rejected) return rejected;

  const body = await readJsonObject(request);
  const email = parseEmail(body?.email);
  if (!body || !email) return jsonError("invalid_request", 400);

  // The template passes this URL back as `next`; only the path is kept, since
  // a query string would not survive being embedded in the email link.
  const next = new URL(safeNext(body.next, getSiteOrigin()), getSiteOrigin()).pathname;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: siteUrl(next).toString() },
  });

  if (error) {
    if (isRequestRateLimit(error)) return jsonError("rate_limited", 429);
    if (isUnavailable(error)) return jsonError("unavailable", 503);
    // Unknown address (sign-ups disabled) or per-address send limit: answer as
    // if sent. The page enforces its own resend cooldown.
  }

  return jsonOk({ sent: true });
}
