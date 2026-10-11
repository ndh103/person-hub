import { isRequestRateLimit, isUnavailable } from "@/lib/auth/errors";
import { safeNext } from "@/lib/auth/safe-next";
import { getSiteOrigin } from "@/lib/auth/site-url";
import { parseEmail, parseSignInPassword } from "@/lib/auth/validation";
import { jsonError, jsonOk, readJsonObject, rejectUnsafePost } from "@/lib/server/http";
import { createClient } from "@/lib/supabase/server";

/** AUTH-001: sign in with email and password. */
export async function POST(request: Request) {
  const rejected = rejectUnsafePost(request);
  if (rejected) return rejected;

  const body = await readJsonObject(request);
  const email = parseEmail(body?.email);
  const password = parseSignInPassword(body?.password);
  if (!body || !email || !password) return jsonError("invalid_request", 400);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (isRequestRateLimit(error)) return jsonError("rate_limited", 429);
    if (isUnavailable(error)) return jsonError("unavailable", 503);
    // Wrong password, unknown email and unconfirmed account all look the same (AUTH-008).
    return jsonError("invalid_credentials", 400);
  }

  return jsonOk({ redirectTo: safeNext(body.next, getSiteOrigin()) });
}
