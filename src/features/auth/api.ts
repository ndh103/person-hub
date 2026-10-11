import type { AuthError } from "@supabase/supabase-js";
import {
  isRequestRateLimit,
  isSignupRefusal,
  isUnavailable,
  type AuthApiErrorCode,
} from "@/lib/auth/errors";
import { DEFAULT_NEXT, safeNext } from "@/lib/auth/safe-next";
import { siteOrigin, siteUrl } from "@/lib/auth/site-url";
import type { ConfirmType } from "@/lib/auth/validation";
import { supabase } from "@/lib/supabase/client";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Sign-in flows (AUTH-001 to AUTH-006), run in the browser with the Supabase
 * Auth client (ADR-0003). Every function maps Supabase errors to a small set
 * of codes and never throws, so pages show the same answer whether or not an
 * account exists (AUTH-008). Supabase's own responses are visible in the
 * browser's network tools either way; the uniform wording is about what the
 * page says, and Supabase's rate limits are the real control.
 */
export type AuthApiResult<T> = { ok: true; data: T } | { ok: false; error: AuthApiErrorCode | "network" };

const ok = <T>(data: T): AuthApiResult<T> => ({ ok: true, data });
const fail = (error: AuthApiErrorCode | "network"): AuthApiResult<never> => ({ ok: false, error });

/** Rate limits and outages are safe to report: they don't depend on which email was entered. */
function serviceFailure(error: AuthError): AuthApiResult<never> | null {
  if (isRequestRateLimit(error)) return fail("rate_limited");
  if (isUnavailable(error)) return fail("unavailable");
  return null;
}

async function attempt<T>(run: () => Promise<AuthApiResult<T>>): Promise<AuthApiResult<T>> {
  try {
    return await run();
  } catch {
    return fail("network");
  }
}

/** AUTH-001. Wrong password, unknown email and unconfirmed account all look the same. */
export function signInWithPassword(email: string, password: string, next?: string) {
  return attempt(async () => {
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) return serviceFailure(error) ?? fail("invalid_credentials");
    return ok({ redirectTo: safeNext(next) });
  });
}

/**
 * AUTH-002: email a magic link and a 6-digit code. Answers "sent" unless the
 * whole service or client is limited: an unknown address (sign-up disabled)
 * and a per-address send limit look like success. The page enforces its own
 * resend cooldown.
 */
export function sendSignInEmail(email: string, next?: string) {
  return attempt(async () => {
    // The template passes this URL back as `next`; only the path is kept,
    // since a query string would not survive being embedded in the email link.
    const path = siteUrl(safeNext(next)).pathname;
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: siteUrl(path).toString() },
    });
    if (error) return serviceFailure(error) ?? ok({ sent: true });
    return ok({ sent: true });
  });
}

/** AUTH-002: sign in with the code from the email. */
export function verifySignInCode(email: string, code: string, next?: string) {
  return attempt(async () => {
    const { error } = await supabase().auth.verifyOtp({ email, token: code, type: "email" });
    if (error) return serviceFailure(error) ?? fail("invalid_code");
    return ok({ redirectTo: safeNext(next) });
  });
}

/**
 * AUTH-003: leave for Google. The PKCE code verifier stays in this browser's
 * storage and is used by /auth/callback.
 */
export function startGoogleSignIn(next?: string) {
  return attempt(async () => {
    const callback = siteUrl("/auth/callback");
    callback.searchParams.set("next", safeNext(next));
    const { data, error } = await supabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
    });
    // Only ever send the browser to this project's Auth server.
    if (error || !data.url || new URL(data.url).origin !== new URL(supabaseEnv().url).origin) return fail("unavailable");
    return ok({ url: data.url });
  });
}

/** AUTH-005: request a reset email. Same answer for every address. */
export function requestPasswordReset(email: string) {
  return attempt(async () => {
    const { error } = await supabase().auth.resetPasswordForEmail(email, {
      redirectTo: siteUrl("/account/set-password").toString(),
    });
    if (error) return serviceFailure(error) ?? ok({ sent: true });
    return ok({ sent: true });
  });
}

/**
 * AUTH-004, AUTH-005: set a new password for the signed-in (invited or
 * recovering) user. updateUser is checked by the Auth server itself, so a
 * revoked session is refused immediately.
 */
export function updatePassword(password: string) {
  return attempt(async () => {
    const { error } = await supabase().auth.updateUser({ password });
    if (!error) return ok({ redirectTo: DEFAULT_NEXT });
    const service = serviceFailure(error);
    if (service) return service;
    if (error.code === "same_password") return fail("same_password");
    if (error.code === "reauthentication_needed") return fail("reauthentication_needed");
    if (error.name === "AuthSessionMissingError" || error.code === "session_not_found" || error.status === 401) {
      return fail("unauthenticated");
    }
    return fail("weak_password");
  });
}

/**
 * AUTH-006: end this browser's session (local scope, requirements A4). Even if
 * revoking the refresh token fails, the local session is removed.
 */
export async function signOut(): Promise<void> {
  try {
    await supabase().auth.signOut({ scope: "local" });
  } catch {
    // The local session is cleared before the network call; nothing else to do.
  }
}

/**
 * Email links (magic link, invitation, password reset) land on /auth/confirm
 * (AUTH-002, 004, 005, 009). Returns where to go next, or null for an
 * invalid, expired or used link.
 */
export function confirmEmailLink(tokenHash: string, type: ConfirmType, next: string | undefined) {
  return attempt(async () => {
    const { error } = await supabase().auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail("invalid_code");
    if (type === "invite" || type === "recovery") return ok({ redirectTo: "/account/set-password" });
    return ok({ redirectTo: safeNext(next, siteOrigin()) });
  });
}

/** The Google return (AUTH-003): exchanges the one-time code for a session. Returns the sign-in notice on failure. */
export async function finishGoogleSignIn(params: {
  code?: string;
  error?: string;
  errorCode?: string;
  errorDescription?: string;
  next?: string;
}): Promise<{ redirectTo: string }> {
  if (params.error || params.errorCode) {
    return { redirectTo: isSignupRefusal(params.errorCode, params.errorDescription) ? "/sign-in?error=google_no_access" : "/sign-in?error=google" };
  }
  if (!params.code || params.code.length > 512) return { redirectTo: "/sign-in?error=google" };
  try {
    const { error } = await supabase().auth.exchangeCodeForSession(params.code);
    if (error) return { redirectTo: isSignupRefusal(error.code) ? "/sign-in?error=google_no_access" : "/sign-in?error=google" };
  } catch {
    return { redirectTo: "/sign-in?error=google" };
  }
  return { redirectTo: safeNext(params.next, siteOrigin()) };
}

/**
 * Full page load after signing in or out, so nothing from the previous
 * session (cached queries, component state) survives in memory.
 */
export function navigateTo(path: string) {
  window.location.assign(path);
}
