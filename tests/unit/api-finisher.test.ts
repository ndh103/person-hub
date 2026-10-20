import { beforeEach, describe, expect, it, vi } from "vitest";
import { bearerToken } from "@/worker/auth";
import { createApp } from "@/worker/app";

/**
 * The Worker API (src/worker) with Supabase replaced by a stub. These cover
 * the boundary the API adds: Bearer-token verification before any data
 * access, the write guards, field allowlisting, safe error mapping and
 * no-store responses. Database authorization itself is covered in
 * supabase/tests/finisher-rls.test.ts.
 */
const getClaims = vi.fn();
const rpc = vi.fn();
const from = vi.fn();
const createClient = vi.fn<(...args: unknown[]) => unknown>(() => ({ auth: { getClaims }, rpc, from }));

vi.mock("@supabase/supabase-js", () => ({ createClient: (...args: unknown[]) => createClient(...args) }));

const SITE = "https://hub.example.test";
const ENV = { SUPABASE_URL: "https://project-ref.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" };
const TOKEN = "eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ1In0.c2ln";
const USER = "00000000-0000-4000-8000-00000000000a";
const TASK_ID = "8b0b2a8e-0d6f-4a53-9a43-1f2e4b8c9d10";

const app = createApp();

/** A request as the SPA sends it. Pass a header as "" to leave it out. */
function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const all: Record<string, string> = {
    authorization: `Bearer ${TOKEN}`,
    origin: SITE,
    "x-time-zone": "Europe/London",
    ...(body !== undefined ? { "content-type": "application/json" } : {}),
    ...headers,
  };
  return app.request(
    `${SITE}${path}`,
    {
      method,
      headers: Object.fromEntries(Object.entries(all).filter(([, value]) => value !== "")),
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    },
    ENV,
  );
}

function signedIn() {
  getClaims.mockResolvedValue({ data: { claims: { sub: USER, role: "authenticated", email: "a@example.test" } }, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockReset();
  rpc.mockReset();
  from.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("authentication (FIN-017, AUTH-007)", () => {
  it("answers 401 without touching data when there is no valid token", async () => {
    getClaims.mockResolvedValue({ data: null, error: { message: "invalid JWT" } });
    const cases = [
      call("GET", "/api/finisher/today", undefined, { authorization: "" }),
      call("GET", "/api/finisher/today", undefined, { authorization: "Basic dXNlcjpwdw==" }),
      call("GET", "/api/finisher/today", undefined, { authorization: "Bearer not-a-jwt" }),
      call("POST", "/api/finisher/tasks", { title: "x" }),
      call("GET", "/api/finisher/closed"),
    ];
    for (const response of await Promise.all(cases)) {
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(await response.json()).toEqual({ error: "unauthenticated" });
    }
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("refuses verified tokens that are not a signed-in user (anon key, anonymous sign-in)", async () => {
    for (const claims of [{ role: "anon" }, { sub: USER, role: "anon" }, { sub: USER, role: "authenticated", is_anonymous: true }]) {
      getClaims.mockResolvedValueOnce({ data: { claims }, error: null });
      expect((await call("GET", "/api/finisher/today")).status).toBe(401);
    }
    expect(from).not.toHaveBeenCalled();
  });

  it("queries Supabase as the caller: publishable key plus the caller's token, never a secret key", async () => {
    signedIn();
    rpc.mockResolvedValue({ data: null, error: null });
    await call("DELETE", `/api/finisher/tasks/${TASK_ID}`);
    expect(createClient).toHaveBeenCalledWith(ENV.SUPABASE_URL, ENV.SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${TOKEN}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    expect(getClaims).toHaveBeenCalledWith(TOKEN);
  });

  it("accepts only well-formed Bearer JWTs", () => {
    expect(bearerToken(`Bearer ${TOKEN}`)).toBe(TOKEN);
    expect(bearerToken(undefined)).toBeNull();
    expect(bearerToken(`bearer ${TOKEN}`)).toBeNull();
    expect(bearerToken(`Bearer ${TOKEN} extra`)).toBeNull();
    expect(bearerToken(`Bearer ${"a".repeat(9000)}.b.c`)).toBeNull();
  });
});

describe("write guards (ADR-0003)", () => {
  it("rejects a cross-origin create and delete before authentication", async () => {
    signedIn();
    const create = await call("POST", "/api/finisher/tasks", { title: "x" }, { origin: "https://evil.test" });
    const remove = await call("DELETE", `/api/finisher/tasks/${TASK_ID}`, undefined, { origin: "https://evil.test" });
    expect([create.status, remove.status]).toEqual([403, 403]);
    expect(await create.json()).toEqual({ error: "invalid_origin" });
    expect(getClaims).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("allows a write without an Origin header (not a browser; the Bearer token is the credential)", async () => {
    signedIn();
    rpc.mockResolvedValue({ data: null, error: null });
    const response = await call("DELETE", `/api/finisher/tasks/${TASK_ID}`, undefined, { origin: "" });
    expect(response.status).toBe(200);
  });

  it("rejects form-encoded bodies", async () => {
    signedIn();
    const response = await call("PUT", "/api/finisher/sessions", "slotId=x", { "content-type": "application/x-www-form-urlencoded" });
    expect(response.status).toBe(415);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects oversized and non-object bodies", async () => {
    signedIn();
    expect((await call("POST", "/api/finisher/projects", "[1,2]")).status).toBe(400);
    expect((await call("POST", "/api/finisher/projects", "not json")).status).toBe(400);
    expect((await call("POST", "/api/finisher/projects", { goal: "x".repeat(40_000) })).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends no CORS headers", async () => {
    signedIn();
    const response = await call("OPTIONS", "/api/finisher/tasks", undefined, { origin: "https://evil.test" });
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("writes", () => {
  it("passes only allowlisted fields and never a user ID; the owner comes from the token", async () => {
    signedIn();
    rpc.mockResolvedValue({ data: TASK_ID, error: null });
    const response = await call("POST", "/api/finisher/tasks", {
      title: "  Paperwork  ",
      dueDate: "2026-10-12",
      user_id: "00000000-0000-4000-8000-00000000000b",
      status: "done",
    });
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

  it("falls back to UTC for a missing or unknown timezone header", async () => {
    signedIn();
    rpc.mockResolvedValue({ data: TASK_ID, error: null });
    await call("POST", "/api/finisher/tasks", { title: "a" }, { "x-time-zone": "Mars/Olympus" });
    await call("POST", "/api/finisher/tasks", { title: "b" }, { "x-time-zone": "" });
    expect(rpc.mock.calls.map(([, args]) => (args as { p_tz: string }).p_tz)).toEqual(["UTC", "UTC"]);
  });

  it("returns field errors without calling the database", async () => {
    signedIn();
    const response = await call("POST", "/api/finisher/tasks", { title: "", dueTime: "09:00" });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "validation", fields: { title: "required", dueTime: "needs_date" } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps database refusals to safe codes and never forwards database text", async () => {
    signedIn();
    const cases: [{ code: string; message: string }, number, unknown][] = [
      [{ code: "PH404", message: "not_found" }, 404, { error: "not_found" }],
      [{ code: "PH409", message: "status" }, 409, { error: "not_allowed" }],
      [{ code: "PH422", message: "revisit_date" }, 422, { error: "validation", fields: { revisitDate: "out_of_range" } }],
      [{ code: "28000", message: "no uid" }, 401, { error: "unauthenticated" }],
      [{ code: "XX000", message: "secret detail: Teach my daughter" }, 503, { error: "unavailable" }],
    ];
    for (const [error, status, body] of cases) {
      rpc.mockResolvedValueOnce({ data: null, error });
      const response = await call("POST", `/api/finisher/tasks/${TASK_ID}/actions`, { action: "done" });
      expect(response.status).toBe(status);
      const text = await response.text();
      expect(JSON.parse(text)).toEqual(body);
      expect(text).not.toContain("Teach");
    }
    expect(console.error).not.toHaveBeenCalledWith(expect.anything(), expect.stringContaining("Teach"));
  });

  it("answers 503 with no detail when a handler fails unexpectedly", async () => {
    signedIn();
    rpc.mockRejectedValue(new TypeError("fetch failed: Teach my daughter"));
    const response = await call("DELETE", `/api/finisher/tasks/${TASK_ID}`);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("Teach");
  });

  it("treats a malformed id as not found without a database call", async () => {
    signedIn();
    const response = await call("DELETE", "/api/finisher/projects/1%20or%201=1");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("moves a task with only the neighbour ids (FIN-038)", async () => {
    signedIn();
    rpc.mockResolvedValue({ data: null, error: null });
    const after = "1b0b2a8e-0d6f-4a53-9a43-1f2e4b8c9d11";
    const response = await call("PUT", `/api/finisher/tasks/${TASK_ID}/position`, {
      afterId: after,
      beforeId: null,
      sortKey: 0.5,
      user_id: "00000000-0000-4000-8000-00000000000b",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(rpc).toHaveBeenCalledWith("finisher_move_task", { p_task_id: TASK_ID, p_after_id: after, p_before_id: null });
  });

  it("refuses a move with no neighbour or with itself as one, without a database call", async () => {
    signedIn();
    for (const body of [{}, { afterId: TASK_ID }, { beforeId: "x" }]) {
      const response = await call("PUT", `/api/finisher/tasks/${TASK_ID}/position`, body);
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error: "validation", fields: { position: "invalid" } });
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps a stale or foreign move to safe codes", async () => {
    signedIn();
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PH409", message: "order_changed" } });
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PH404", message: "not_found" } });
    const body = { beforeId: "1b0b2a8e-0d6f-4a53-9a43-1f2e4b8c9d11" };
    expect((await call("PUT", `/api/finisher/tasks/${TASK_ID}/position`, body)).status).toBe(409);
    expect((await call("PUT", `/api/finisher/tasks/${TASK_ID}/position`, body)).status).toBe(404);
  });

  it("changes only the due date and time (FIN-037); other fields never reach the database", async () => {
    signedIn();
    rpc.mockResolvedValue({ data: null, error: null });
    const response = await call("PUT", `/api/finisher/tasks/${TASK_ID}/due`, {
      dueDate: "2026-10-21",
      dueTime: null,
      title: "",
      notes: "wipe me",
    });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("finisher_set_task_due", {
      p_tz: "Europe/London",
      p_task_id: TASK_ID,
      p_due_date: "2026-10-21",
      p_due_time: null,
    });
    const invalid = await call("PUT", `/api/finisher/tasks/${TASK_ID}/due`, { dueTime: "09:00" });
    expect(await invalid.json()).toEqual({ error: "validation", fields: { dueTime: "needs_date" } });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("guards the new writes like the others: foreign origin and form bodies are refused", async () => {
    signedIn();
    const foreign = await call("PUT", `/api/finisher/tasks/${TASK_ID}/position`, { beforeId: TASK_ID }, { origin: "https://evil.test" });
    const form = await call("PUT", `/api/finisher/tasks/${TASK_ID}/due`, "dueDate=2026-10-21", {
      "content-type": "application/x-www-form-urlencoded",
    });
    expect(foreign.status).toBe(403);
    expect(form.status).toBe(415);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reopens in the old place only when asked (Undo after Mark done, FIN-021)", async () => {
    signedIn();
    rpc.mockResolvedValue({ data: "open", error: null });
    await call("POST", `/api/finisher/tasks/${TASK_ID}/actions`, { action: "reopen", keepPosition: true });
    await call("POST", `/api/finisher/tasks/${TASK_ID}/actions`, { action: "reopen" });
    await call("POST", `/api/finisher/tasks/${TASK_ID}/actions`, { action: "done", keepPosition: true });
    expect(rpc.mock.calls.map(([, args]) => (args as { p_keep_position: boolean }).p_keep_position)).toEqual([true, false, false]);
  });

  it("starts a Pomodoro with only `replace`; the owner and the time come from the server (FIN-039)", async () => {
    signedIn();
    rpc.mockResolvedValue({ data: "8b0b2a8e-0d6f-4a53-9a43-1f2e4b8c9d99", error: null });
    const response = await call("POST", `/api/finisher/tasks/${TASK_ID}/pomodoros`, {
      replace: true,
      startedAt: "2020-01-01T00:00:00Z",
      user_id: "00000000-0000-4000-8000-00000000000b",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ id: "8b0b2a8e-0d6f-4a53-9a43-1f2e4b8c9d99" });
    expect(rpc).toHaveBeenCalledWith("finisher_start_pomodoro", { p_task_id: TASK_ID, p_replace: true });
    await call("POST", `/api/finisher/tasks/${TASK_ID}/pomodoros`, {});
    expect(rpc).toHaveBeenLastCalledWith("finisher_start_pomodoro", { p_task_id: TASK_ID, p_replace: false });
  });

  it("refuses a non-boolean replace without a database call, and maps a running session to 409", async () => {
    signedIn();
    const invalid = await call("POST", `/api/finisher/tasks/${TASK_ID}/pomodoros`, { replace: "yes" });
    expect(invalid.status).toBe(422);
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PH409", message: "pomodoro_running" } });
    const running = await call("POST", `/api/finisher/tasks/${TASK_ID}/pomodoros`, {});
    expect(running.status).toBe(409);
    expect(await running.json()).toEqual({ error: "not_allowed" });
  });

  it("stops a Pomodoro by id; foreign or finished sessions map to 404 and 409", async () => {
    signedIn();
    rpc.mockResolvedValueOnce({ data: null, error: null });
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PH404", message: "not_found" } });
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PH409", message: "not_running" } });
    expect((await call("POST", `/api/finisher/pomodoros/${TASK_ID}/stop`, {})).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("finisher_stop_pomodoro", { p_id: TASK_ID });
    expect((await call("POST", `/api/finisher/pomodoros/${TASK_ID}/stop`, {})).status).toBe(404);
    expect((await call("POST", `/api/finisher/pomodoros/${TASK_ID}/stop`, {})).status).toBe(409);
    expect((await call("POST", "/api/finisher/pomodoros/not-an-id/stop", {})).status).toBe(404);
  });

  it("guards the Pomodoro writes: foreign origin, form bodies and missing tokens", async () => {
    signedIn();
    const foreign = await call("POST", `/api/finisher/tasks/${TASK_ID}/pomodoros`, {}, { origin: "https://evil.test" });
    const form = await call("POST", `/api/finisher/pomodoros/${TASK_ID}/stop`, "x=1", { "content-type": "application/x-www-form-urlencoded" });
    expect(foreign.status).toBe(403);
    expect(form.status).toBe(415);
    getClaims.mockResolvedValue({ data: null, error: { message: "invalid JWT" } });
    expect((await call("POST", `/api/finisher/pomodoros/${TASK_ID}/stop`, {}, { authorization: "" })).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("marks a session idempotently through one function call", async () => {
    signedIn();
    rpc.mockResolvedValue({ data: "done", error: null });
    const body = { slotId: TASK_ID, date: "2026-10-11", state: "done" };
    const response = await call("PUT", "/api/finisher/sessions", body);
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
    for (const path of [
      "/api/finisher/task-groups/everything?offset=0",
      "/api/finisher/task-groups/overdue?offset=-50",
      "/api/finisher/task-groups/overdue?offset=7",
      "/api/finisher/task-groups/overdue?offset=999999",
      `/api/finisher/tasks?project=${"x".repeat(100)}`,
    ]) {
      expect((await call("GET", path)).status, path).toBe(400);
    }
    expect(from).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown API path, with no-store", async () => {
    const response = await call("GET", "/api/nothing-here");
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
