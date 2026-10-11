import type { AuthApiErrorCode } from "@/lib/auth/errors";

/** User-facing copy from requirements/auth.md. */
export const authMessages = {
  invalidCredentials: "Email or password is incorrect.",
  invalidCode: "That code is invalid or has expired.",
  emailSent: "If this email has an account, we sent a sign-in link and code.",
  resetSent: "If this email has an account, we sent a reset link.",
  rateLimited: "Please wait a moment before trying again.",
  unavailable: "Something went wrong on our side. Please try again.",
  network: "Couldn’t reach the server. Check your connection and try again.",
  googleFailed: "Google sign-in was cancelled or failed. Try again or use another method.",
  googleNoAccess: "This Google account doesn’t have access to the hub.",
  signedOut: "You have signed out.",
  sessionEnded: "Your session has ended. Please sign in again.",
  weakPassword: "Use at least 8 characters.",
  samePassword: "Choose a password different from your current one.",
  reauthenticationNeeded: "For security, sign in again before changing your password.",
  unauthenticated: "Your session has ended. Open the link from your email again, or sign in.",
} as const;

/** Message for an API failure that is not tied to a single field. */
export function generalErrorMessage(error: AuthApiErrorCode | "network"): string {
  switch (error) {
    case "network":
      return authMessages.network;
    case "rate_limited":
      return authMessages.rateLimited;
    case "invalid_credentials":
      return authMessages.invalidCredentials;
    case "invalid_code":
      return authMessages.invalidCode;
    case "weak_password":
      return authMessages.weakPassword;
    case "same_password":
      return authMessages.samePassword;
    case "reauthentication_needed":
      return authMessages.reauthenticationNeeded;
    case "unauthenticated":
      return authMessages.unauthenticated;
    default:
      return authMessages.unavailable;
  }
}

/** The sign-in page's query string, validated by its route (src/app/router.tsx). */
export type SignInSearch = {
  next?: string;
  error?: string;
  reason?: string;
  signed_out?: string;
};

/** Notice shown on the sign-in page from its query string. */
export function signInNotice(search: SignInSearch): { tone: "info" | "error"; text: string } | null {
  if (search.error === "google_no_access") return { tone: "error", text: authMessages.googleNoAccess };
  if (search.error === "google") return { tone: "error", text: authMessages.googleFailed };
  if (search.reason === "expired") return { tone: "info", text: authMessages.sessionEnded };
  if (search.signed_out === "1") return { tone: "info", text: authMessages.signedOut };
  return null;
}
