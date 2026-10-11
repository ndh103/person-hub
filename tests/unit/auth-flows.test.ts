import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The browser sign-in functions (src/features/auth/api.ts) with the Supabase
 * Auth client replaced by a stub. These check the rules the hub adds on top
 * of Supabase: uniform (non-enumerating) answers, no account creation, safe
 * redirects and only this project's Auth origin. They do not prove Supabase's
 * own behaviour; see docs/implementation/auth.md.
 */
const auth = {
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@/lib/supabase/client", () => ({ supabase: () => ({ auth }) }));

const SITE = "https://hub.example.test";
const SUPABASE = "https://project-ref.supabase.co";

const api = await import("@/features/auth/api");

function authError(code: string, status = 400, name = "AuthApiError") {
  return { data: {}, error: { code, status, name, message: "raw supabase message" } };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("window", { location: { origin: SITE } });
  vi.stubEnv("VITE_SUPABASE_URL", SUPABASE);
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});

describe("password sign-in (AUTH-001, AUTH-008)", () => {
  it("signs in and returns a sanitised destination", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    expect(await api.signInWithPassword("me@example.com", "pw", "//evil.test")).toEqual({ ok: true, data: { redirectTo: "/home" } });
    expect(await api.signInWithPassword("me@example.com", "pw", "/finisher/tasks?project=none")).toEqual({
      ok: true,
      data: { redirectTo: "/finisher/tasks?project=none" },
    });
  });

  it("gives the same answer for a wrong password, an unknown email and an unconfirmed account", async () => {
    const results = [];
    for (const code of ["invalid_credentials", "user_not_found", "email_not_confirmed"]) {
      auth.signInWithPassword.mockResolvedValueOnce(authError(code));
      results.push(JSON.stringify(await api.signInWithPassword("me@example.com", "pw")));
    }
    expect(new Set(results).size).toBe(1);
    expect(JSON.parse(results[0])).toEqual({ ok: false, error: "invalid_credentials" });
    expect(results[0]).not.toContain("raw supabase message");
  });

  it("reports client-wide limits, outages and network failures", async () => {
    auth.signInWithPassword.mockResolvedValueOnce(authError("over_request_rate_limit", 429));
    auth.signInWithPassword.mockResolvedValueOnce(authError("unexpected_failure", 500));
    auth.signInWithPassword.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const errors = [];
    for (let i = 0; i < 3; i++) errors.push(await api.signInWithPassword("me@example.com", "pw"));
    expect(errors).toEqual([
      { ok: false, error: "rate_limited" },
      { ok: false, error: "unavailable" },
      { ok: false, error: "network" },
    ]);
  });
});

describe("email link and code (AUTH-002, AUTH-008)", () => {
  it("never creates users and points the email back at the hub (path only)", async () => {
    auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
    await api.sendSignInEmail("me@example.com", "/finisher?tab=tasks");
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "me@example.com",
      options: { shouldCreateUser: false, emailRedirectTo: `${SITE}/finisher` },
    });
  });

  it.each(["signup_disabled", "otp_disabled", "over_email_send_rate_limit", "user_not_found"])(
    "answers 'sent' when Supabase refuses with %s",
    async (code) => {
      auth.signInWithOtp.mockResolvedValue(authError(code, code.startsWith("over") ? 429 : 422));
      expect(await api.sendSignInEmail("unknown@example.com")).toEqual({ ok: true, data: { sent: true } });
    },
  );

  it("reports an IP-wide rate limit, which does not depend on the address", async () => {
    auth.signInWithOtp.mockResolvedValue(authError("over_request_rate_limit", 429));
    expect(await api.sendSignInEmail("me@example.com")).toEqual({ ok: false, error: "rate_limited" });
  });

  it("maps a wrong or expired code to one message", async () => {
    auth.verifyOtp.mockResolvedValue(authError("otp_expired", 403));
    expect(await api.verifySignInCode("me@example.com", "123456")).toEqual({ ok: false, error: "invalid_code" });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: "me@example.com", token: "123456", type: "email" });
  });
});

describe("password reset (AUTH-005, AUTH-008)", () => {
  it("answers 'sent' whether or not the address exists", async () => {
    auth.resetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null });
    const known = await api.requestPasswordReset("me@example.com");
    auth.resetPasswordForEmail.mockResolvedValueOnce(authError("user_not_found"));
    const unknown = await api.requestPasswordReset("nobody@example.com");
    expect(known).toEqual(unknown);
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("me@example.com", { redirectTo: `${SITE}/account/set-password` });
  });
});

describe("set password (AUTH-004, AUTH-005)", () => {
  it.each([
    [authError("session_not_found", 403), "unauthenticated"],
    [authError("", 400, "AuthSessionMissingError"), "unauthenticated"],
    [authError("same_password", 422), "same_password"],
    [authError("reauthentication_needed", 400), "reauthentication_needed"],
    [authError("weak_password", 422), "weak_password"],
  ])("maps %j to %s", async (response, code) => {
    auth.updateUser.mockResolvedValue(response);
    expect(await api.updatePassword("long-enough")).toEqual({ ok: false, error: code });
  });

  it("lands on Home afterwards", async () => {
    auth.updateUser.mockResolvedValue({ data: {}, error: null });
    expect(await api.updatePassword("long-enough")).toEqual({ ok: true, data: { redirectTo: "/home" } });
  });
});

describe("Google (AUTH-003)", () => {
  it("only hands back URLs on this project's Supabase origin", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://evil.test/authorize" }, error: null });
    expect(await api.startGoogleSignIn()).toEqual({ ok: false, error: "unavailable" });
  });

  it("returns the provider URL and asks Supabase to come back to /auth/callback", async () => {
    const url = `${SUPABASE}/auth/v1/authorize?provider=google`;
    auth.signInWithOAuth.mockResolvedValue({ data: { url }, error: null });
    expect(await api.startGoogleSignIn("/finisher")).toEqual({ ok: true, data: { url } });
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${SITE}/auth/callback?next=%2Ffinisher`, skipBrowserRedirect: true },
    });
  });

  it("explains when Google is refused because the account doesn't exist", async () => {
    expect(
      await api.finishGoogleSignIn({ error: "access_denied", errorCode: "signup_disabled", errorDescription: "Signups not allowed for this instance" }),
    ).toEqual({ redirectTo: "/sign-in?error=google_no_access" });
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("treats a cancelled consent or a missing code as a generic Google failure", async () => {
    expect(await api.finishGoogleSignIn({ error: "access_denied" })).toEqual({ redirectTo: "/sign-in?error=google" });
    expect(await api.finishGoogleSignIn({})).toEqual({ redirectTo: "/sign-in?error=google" });
  });

  it("exchanges the code and follows a safe next only", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
    expect(await api.finishGoogleSignIn({ code: "abc", next: "/finisher" })).toEqual({ redirectTo: "/finisher" });
    expect(await api.finishGoogleSignIn({ code: "abc", next: "https://evil.test" })).toEqual({ redirectTo: "/home" });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
  });

  it("sends a failed exchange (e.g. missing PKCE verifier) back to sign-in", async () => {
    auth.exchangeCodeForSession.mockResolvedValue(authError("bad_code_verifier"));
    expect(await api.finishGoogleSignIn({ code: "abc" })).toEqual({ redirectTo: "/sign-in?error=google" });
  });
});

describe("email links (AUTH-002, 004, 005, 009)", () => {
  it("sends expired or used links to the link-error page", async () => {
    auth.verifyOtp.mockResolvedValue(authError("otp_expired", 403));
    expect(await api.confirmEmailLink("abc", "email", undefined)).toEqual({ ok: false, error: "invalid_code" });
  });

  it("sends invitations and resets to set-password regardless of next", async () => {
    auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
    for (const type of ["invite", "recovery"] as const) {
      expect(await api.confirmEmailLink("abc", type, "/finisher")).toEqual({ ok: true, data: { redirectTo: "/account/set-password" } });
    }
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: "invite", token_hash: "abc" });
  });

  it("follows a same-site next for magic links and drops foreign ones", async () => {
    auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
    expect(await api.confirmEmailLink("abc", "email", `${SITE}/finisher`)).toEqual({ ok: true, data: { redirectTo: "/finisher" } });
    expect(await api.confirmEmailLink("abc", "email", "https://evil.test")).toEqual({ ok: true, data: { redirectTo: "/home" } });
  });
});

describe("sign out (AUTH-006)", () => {
  it("ends only this browser's session and never throws", async () => {
    auth.signOut.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api.signOut()).resolves.toBeUndefined();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
