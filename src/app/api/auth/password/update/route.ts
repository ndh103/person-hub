import { isRequestRateLimit, isUnavailable } from "@/lib/auth/errors";
import { DEFAULT_NEXT } from "@/lib/auth/safe-next";
import { parseNewPassword } from "@/lib/auth/validation";
import { requireFreshUser, UnauthenticatedError } from "@/lib/server/auth";
import { jsonError, jsonOk, readJsonObject, rejectUnsafePost } from "@/lib/server/http";
import { createClient } from "@/lib/supabase/server";

/** AUTH-004, AUTH-005: set a new password for the signed-in (invited or recovering) user. */
export async function POST(request: Request) {
  const rejected = rejectUnsafePost(request);
  if (rejected) return rejected;

  try {
    await requireFreshUser();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return jsonError("unauthenticated", 401);
    throw error;
  }

  const body = await readJsonObject(request);
  if (!body) return jsonError("invalid_request", 400);
  const password = parseNewPassword(body.password);
  if (!password) return jsonError("weak_password", 400);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (isRequestRateLimit(error)) return jsonError("rate_limited", 429);
    if (isUnavailable(error)) return jsonError("unavailable", 503);
    if (error.code === "same_password") return jsonError("same_password", 400);
    if (error.code === "reauthentication_needed") return jsonError("reauthentication_needed", 400);
    if (error.code === "session_not_found" || error.status === 401) return jsonError("unauthenticated", 401);
    return jsonError("weak_password", 400);
  }

  return jsonOk({ redirectTo: DEFAULT_NEXT });
}
