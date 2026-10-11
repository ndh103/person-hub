import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Route Handler behaviour with Supabase Auth replaced by a stub. These check
 * the boundary rules the hub adds on top of Supabase: CSRF guard, uniform
 * (non-enumerating) responses, safe redirects and no-store caching.
 * They do not prove Supabase's own behaviour; see docs/implementation/auth.md.
 */
const auth = {
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
  getClaims: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth }),
}));

const SITE = "http://localhost:3000";

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${SITE}${path}`, {
    method: "POST",
    headers: { origin: SITE, "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function get(pathAndQuery: string) {
  return new NextRequest(`${SITE}${pathAndQuery}`);
}

async function json(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

function authError(code: string, status = 400) {
  return { error: { code, status, name: "AuthApiError", message: "raw supabase message" } };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("CSRF guard on auth POSTs (T7)", () => {
  it("rejects a cross-origin request", async () => {
    const { POST } = await import("@/app/api/auth/password/route");
    const response = await POST(post("/api/auth/password", {}, { origin: "https://evil.test" }));
    expect(response.status).toBe(403);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects a request with no Origin header", async () => {
    const { POST } = await import("@/app/api/auth/sign-out/route");
    const request = new Request(`${SITE}/api/auth/sign-out`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect((await POST(request)).status).toBe(403);
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("rejects form-encoded bodies (what a cross-site HTML form would send)", async () => {
    const { POST } = await import("@/app/api/auth/password/route");
    const response = await POST(
      post("/api/auth/password", "email=a%40b.c&password=x", { "content-type": "application/x-www-form-urlencoded" }),
    );
    expect(response.status).toBe(415);
  });
});

describe("POST /api/auth/password (AUTH-001, AUTH-008)", () => {
  it("signs in and returns a sanitised destination with no-store", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    const { POST } = await import("@/app/api/auth/password/route");
    const response = await POST(post("/api/auth/password", { email: "me@example.com", password: "pw", next: "//evil.test" }));
    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({ redirectTo: "/home" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("gives the same answer for a wrong password, an unknown email and an unconfirmed account", async () => {
    const { POST } = await import("@/app/api/auth/password/route");
    const bodies = [];
    for (const code of ["invalid_credentials", "user_not_found", "email_not_confirmed"]) {
      auth.signInWithPassword.mockResolvedValueOnce(authError(code));
      const response = await POST(post("/api/auth/password", { email: "me@example.com", password: "pw" }));
      bodies.push({ status: response.status, body: await json(response) });
    }
    expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);
    expect(bodies[0]).toEqual({ status: 400, body: { error: "invalid_credentials" } });
  });

  it("never forwards Supabase error text", async () => {
    auth.signInWithPassword.mockResolvedValue(authError("invalid_credentials"));
    const { POST } = await import("@/app/api/auth/password/route");
    const text = await (await POST(post("/api/auth/password", { email: "me@example.com", password: "pw" }))).text();
    expect(text).not.toContain("raw supabase message");
  });

  it("rejects malformed input without calling Supabase", async () => {
    const { POST } = await import("@/app/api/auth/password/route");
    for (const body of [{ email: "nope", password: "pw" }, { email: "me@example.com" }, "not json", "[]"]) {
      expect((await POST(post("/api/auth/password", body))).status).toBe(400);
    }
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/otp (AUTH-002, AUTH-008)", () => {
  it("never creates users and points the email back at the hub", async () => {
    auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
    const { POST } = await import("@/app/api/auth/otp/route");
    await POST(post("/api/auth/otp", { email: "me@example.com", next: "/finisher?tab=tasks" }));
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "me@example.com",
      options: { shouldCreateUser: false, emailRedirectTo: `${SITE}/finisher` },
    });
  });

  it.each(["signup_disabled", "otp_disabled", "over_email_send_rate_limit"])(
    "answers 'sent' when Supabase refuses with %s",
    async (code) => {
      auth.signInWithOtp.mockResolvedValue(authError(code, code.startsWith("over") ? 429 : 422));
      const { POST } = await import("@/app/api/auth/otp/route");
      const response = await POST(post("/api/auth/otp", { email: "unknown@example.com" }));
      expect(response.status).toBe(200);
      expect(await json(response)).toEqual({ sent: true });
    },
  );

  it("reports an IP-wide rate limit, which does not depend on the address", async () => {
    auth.signInWithOtp.mockResolvedValue(authError("over_request_rate_limit", 429));
    const { POST } = await import("@/app/api/auth/otp/route");
    expect((await POST(post("/api/auth/otp", { email: "me@example.com" }))).status).toBe(429);
  });
});

describe("POST /api/auth/forgot (AUTH-005, AUTH-008)", () => {
  it("answers 'sent' whether or not the address exists", async () => {
    const { POST } = await import("@/app/api/auth/forgot/route");
    auth.resetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null });
    const known = await POST(post("/api/auth/forgot", { email: "me@example.com" }));
    auth.resetPasswordForEmail.mockResolvedValueOnce(authError("user_not_found"));
    const unknown = await POST(post("/api/auth/forgot", { email: "nobody@example.com" }));
    expect([known.status, unknown.status]).toEqual([200, 200]);
    expect(await json(known)).toEqual(await json(unknown));
  });
});

describe("POST /api/auth/password/update (AUTH-004, AUTH-005)", () => {
  it("refuses a caller without a live session", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    const { POST } = await import("@/app/api/auth/password/update/route");
    const response = await POST(post("/api/auth/password/update", { password: "long-enough" }));
    expect(response.status).toBe(401);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("rejects short passwords before calling Supabase", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "u1", email: "me@example.com" } }, error: null });
    const { POST } = await import("@/app/api/auth/password/update/route");
    const response = await POST(post("/api/auth/password/update", { password: "short" }));
    expect(response.status).toBe(400);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/google (AUTH-003)", () => {
  it("only hands back URLs on this project's Supabase origin", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://evil.test/authorize" }, error: null });
    const { POST } = await import("@/app/api/auth/google/route");
    expect((await POST(post("/api/auth/google", {}))).status).toBe(503);
  });

  it("returns the provider URL and asks Supabase to come back to /auth/callback", async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: "https://project-ref.supabase.co/auth/v1/authorize?provider=google" },
      error: null,
    });
    const { POST } = await import("@/app/api/auth/google/route");
    const response = await POST(post("/api/auth/google", { next: "/finisher" }));
    expect(await json(response)).toEqual({ url: "https://project-ref.supabase.co/auth/v1/authorize?provider=google" });
    expect(auth.signInWithOAuth.mock.calls[0][0].options.redirectTo).toBe(`${SITE}/auth/callback?next=%2Ffinisher`);
  });
});

describe("GET /auth/confirm (AUTH-002, 004, 005, 009)", () => {
  it.each([
    ["missing token", "/auth/confirm?type=email"],
    ["unsupported type", "/auth/confirm?token_hash=abc&type=email_change"],
  ])("sends %s to the link-error page without calling Supabase", async (_label, url) => {
    const { GET } = await import("@/app/(auth)/auth/confirm/route");
    const response = await GET(get(url));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${SITE}/auth/error`);
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("sends expired or used links to the link-error page", async () => {
    auth.verifyOtp.mockResolvedValue(authError("otp_expired", 403));
    const { GET } = await import("@/app/(auth)/auth/confirm/route");
    const response = await GET(get("/auth/confirm?token_hash=abc&type=email"));
    expect(response.headers.get("location")).toBe(`${SITE}/auth/error`);
  });

  it("sends invitations and resets to set-password regardless of next", async () => {
    auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
    const { GET } = await import("@/app/(auth)/auth/confirm/route");
    for (const type of ["invite", "recovery"]) {
      const response = await GET(get(`/auth/confirm?token_hash=abc&type=${type}&next=/finisher`));
      expect(response.headers.get("location")).toBe(`${SITE}/account/set-password`);
    }
  });

  it("follows a same-site next for magic links and drops foreign ones", async () => {
    auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
    const { GET } = await import("@/app/(auth)/auth/confirm/route");
    const sameSite = await GET(get(`/auth/confirm?token_hash=abc&type=email&next=${encodeURIComponent(`${SITE}/finisher`)}`));
    expect(sameSite.headers.get("location")).toBe(`${SITE}/finisher`);
    const foreign = await GET(get(`/auth/confirm?token_hash=abc&type=email&next=${encodeURIComponent("https://evil.test")}`));
    expect(foreign.headers.get("location")).toBe(`${SITE}/home`);
    expect(foreign.headers.get("cache-control")).toBe("private, no-store");
  });
});

describe("GET /auth/callback (AUTH-003)", () => {
  it("explains when Google is refused because the account doesn't exist", async () => {
    const { GET } = await import("@/app/(auth)/auth/callback/route");
    const response = await GET(
      get("/auth/callback?error=access_denied&error_code=signup_disabled&error_description=Signups+not+allowed+for+this+instance"),
    );
    expect(response.headers.get("location")).toBe(`${SITE}/sign-in?error=google_no_access`);
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("treats a cancelled consent as a generic Google failure", async () => {
    const { GET } = await import("@/app/(auth)/auth/callback/route");
    const response = await GET(get("/auth/callback?error=access_denied"));
    expect(response.headers.get("location")).toBe(`${SITE}/sign-in?error=google`);
  });

  it("exchanges the code and follows a safe next", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
    const { GET } = await import("@/app/(auth)/auth/callback/route");
    const response = await GET(get("/auth/callback?code=abc&next=%2Ffinisher"));
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(response.headers.get("location")).toBe(`${SITE}/finisher`);
  });

  it("sends a failed exchange (e.g. missing PKCE verifier) back to sign-in", async () => {
    auth.exchangeCodeForSession.mockResolvedValue(authError("bad_code_verifier"));
    const { GET } = await import("@/app/(auth)/auth/callback/route");
    const response = await GET(get("/auth/callback?code=abc"));
    expect(response.headers.get("location")).toBe(`${SITE}/sign-in?error=google`);
  });
});
