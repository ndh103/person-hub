/**
 * Error codes the sign-in functions (src/features/auth/api.ts) report to the
 * pages. Supabase messages are never shown; they are mapped to these codes so
 * the page never reveals whether an account exists (AUTH-008).
 */
export type AuthApiErrorCode =
  | "invalid_credentials"
  | "invalid_code"
  | "weak_password"
  | "same_password"
  | "reauthentication_needed"
  | "unauthenticated"
  | "rate_limited"
  | "unavailable";

/** Minimal shape of a Supabase AuthError that the mapping relies on. */
export type AuthErrorLike = { code?: string | null; status?: number | null; name?: string | null };

/**
 * IP or client-wide limit. It doesn't depend on which email was entered, so it
 * is safe to report.
 */
export function isRequestRateLimit(error: AuthErrorLike): boolean {
  return error.code === "over_request_rate_limit" || (error.status === 429 && error.code !== "over_email_send_rate_limit");
}

/** Per-address email limit. Reporting it would reveal that the address exists. */
export function isEmailSendRateLimit(error: AuthErrorLike): boolean {
  return error.code === "over_email_send_rate_limit";
}

/** Auth server or network failure, rather than an answer about the user. */
export function isUnavailable(error: AuthErrorLike): boolean {
  if (error.name === "AuthRetryableFetchError") return true;
  return typeof error.status === "number" && error.status >= 500;
}

/** Google sign-in refused because the account doesn't exist and sign-up is disabled. */
export function isSignupRefusal(code: string | null | undefined, description?: string | null): boolean {
  if (code === "signup_disabled" || code === "user_not_found") return true;
  return typeof description === "string" && /signups? not allowed/i.test(description);
}
