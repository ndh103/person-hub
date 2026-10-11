import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Finisher Route Handlers with Supabase replaced by a stub. These cover the
 * API boundary the app adds: CSRF guard, authentication before any data
 * access, field allowlisting, safe error mapping and no-store responses.
 * Database authorization itself is covered in supabase/tests/finisher-rls.test.ts.
 */
const getClaims = vi.fn();
const rpc = vi.fn();
const from = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims }, rpc, from }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "ph-tz" ? { value: "Europe%2FLondon" } : undefined) }),
}));

const SITE = "http://localhost:3000";
const USER = "00000000-0000-4000-8000-00000000000a";
const TASK_ID = "8b0b2a8e-0d6f-4a53-9a43-1f2e4b8c9d10";

function request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`${SITE}${path}`, {
    method,
    headers: { origin: SITE, ...(body !== undefined ? { "content-type": "application/json" } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });

function signedIn() {
  getClaims.mockResolvedValue({ data: { claims: { sub: USER, email: "a@example.test" } }, error: null });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("CSRF and content type", () => {
  it("rejects a cross-origin create", async () => {
    signedIn();
    const { POST } = await import("@/app/api/finisher/tasks/route");
    const response = await POST(request("POST", "/api/finisher/tasks", { title: "x" }, { origin: "https://evil.test" }));
    expect(response.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin delete (no body)", async () => {
    signedIn();
    const { DELETE } = await import("@/app/api/finisher/tasks/[id]/route");
    const response = await DELETE(request("DELETE", `/api/finisher/tasks/${TASK_ID}`, undefined, { origin: "https://evil.test" }), params({ id: TASK_ID }));
    expect(response.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects form-encoded bodies", async () => {
    signedIn();
    const { PUT } = await import("@/app/api/finisher/sessions/route");
    const response = await PUT(
      request("PUT", "/api/finisher/sessions", "slotId=x", { "content-type": "application/x-www-form-urlencoded" }),
    );
    expect(response.status).toBe(415);
  });

  it("rejects oversized and non-object bodies", async () => {
    signedIn();
    const { POST } = await import("@/app/api/finisher/projects/route");
    expect((await POST(request("POST", "/api/finisher/projects", "[1,2]"))).status).toBe(400);
    expect((await POST(request("POST", "/api/finisher/projects", { goal: "x".repeat(40_000) }))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("authentication (FIN-017)", () => {
  it("answers 401 without touching data when signed out", async () => {
    getClaims.mockResolvedValue({ data: null, error: { message: "no session" } });
    const tasks = await import("@/app/api/finisher/tasks/route");
    const closed = await import("@/app/api/finisher/closed/route");
    const create = await tasks.POST(request("POST", "/api/finisher/tasks", { title: "x" }));
    const list = await tasks.GET(request("GET", "/api/finisher/tasks?group=overdue&offset=0"));
    const closedList = await closed.GET(request("GET", "/api/finisher/closed"));
    for (const response of [create, list, closedList]) {
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "unauthenticated" });
    }
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
});

describe("writes", () => {
  it("passes only allowlisted fields and never a user ID; owner comes from the session", async () => {
    signedIn();
    rpc.mockResolvedValue({ data: TASK_ID, error: null });
    const { POST } = await import("@/app/api/finisher/tasks/route");
    const response = await POST(
      request("POST", "/api/finisher/tasks", {
        title: "  Paperwork  ",
        dueDate: "2026-10-12",
        user_id: "00000000-0000-4000-8000-00000000000b",
        status: "done",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ id: TASK_ID });
    expect(rpc).toHaveBeenCalledWith("finisher_create_task", {
      p_tz: "Europe/London",
      p_title: "Paperwork",
      p_notes: null,
      p_due_date: "2026-10-12",
      p_due_time: null,
      p_project_id: null,
    });
  });

  it("returns field errors without calling the database", async () => {
    signedIn();
    const { POST } = await import("@/app/api/finisher/tasks/route");
    const response = await POST(request("POST", "/api/finisher/tasks", { title: "", dueTime: "09:00" }));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "validation", fields: { title: "required", dueTime: "needs_date" } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps database refusals to safe codes and never forwards database text", async () => {
    signedIn();
    const { POST } = await import("@/app/api/finisher/tasks/[id]/actions/route");
    const cases: [{ code: string; message: string }, number, unknown][] = [
      [{ code: "PH404", message: "not_found" }, 404, { error: "not_found" }],
      [{ code: "PH409", message: "status" }, 409, { error: "not_allowed" }],
      [{ code: "PH422", message: "revisit_date" }, 422, { error: "validation", fields: { revisitDate: "out_of_range" } }],
      [{ code: "XX000", message: "secret detail: Teach my daughter" }, 503, { error: "unavailable" }],
    ];
    for (const [error, status, body] of cases) {
      rpc.mockResolvedValueOnce({ data: null, error });
      const response = await POST(request("POST", `/api/finisher/tasks/${TASK_ID}/actions`, { action: "done" }), params({ id: TASK_ID }));
      expect(response.status).toBe(status);
      const text = await response.text();
      expect(JSON.parse(text)).toEqual(body);
      expect(text).not.toContain("Teach");
    }
    expect(console.error).not.toHaveBeenCalledWith(expect.anything(), expect.stringContaining("Teach"));
  });

  it("treats a malformed id as not found without a database call", async () => {
    signedIn();
    const { DELETE } = await import("@/app/api/finisher/projects/[id]/route");
    const response = await DELETE(request("DELETE", "/api/finisher/projects/1%20or%201=1"), params({ id: "1 or 1=1" }));
    expect(response.status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("marks a session idempotently through one function call", async () => {
    signedIn();
    rpc.mockResolvedValue({ data: "done", error: null });
    const { PUT } = await import("@/app/api/finisher/sessions/route");
    const body = { slotId: TASK_ID, date: "2026-10-11", state: "done" };
    const response = await PUT(request("PUT", "/api/finisher/sessions", body));
    expect(await response.json()).toEqual({ state: "done" });
    expect(rpc).toHaveBeenCalledWith("finisher_mark_session", {
      p_tz: "Europe/London",
      p_slot_id: TASK_ID,
      p_date: "2026-10-11",
      p_state: "done",
    });
  });
});

describe("reads", () => {
  it("bounds pagination input", async () => {
    signedIn();
    const { GET } = await import("@/app/api/finisher/tasks/route");
    for (const query of ["group=everything&offset=0", "group=overdue&offset=-50", "group=overdue&offset=7", "group=overdue&offset=999999"]) {
      expect((await GET(request("GET", `/api/finisher/tasks?${query}`))).status).toBe(400);
    }
    expect(from).not.toHaveBeenCalled();
  });
});
