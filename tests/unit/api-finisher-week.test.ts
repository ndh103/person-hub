import { beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, startOfWeek, zonedNow } from "@/features/finisher/domain/dates";
import { createApp } from "@/worker/app";

/**
 * The Week tab routes (FIN-042 to FIN-047, ADR-0008) at the API boundary, with
 * Supabase replaced by a stub: input bounds, field allowlists, the write
 * guards, and safe error codes. The database rules themselves are covered in
 * supabase/tests/finisher-week.test.ts.
 */
const getClaims = vi.fn();
const rpc = vi.fn();
const from = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getClaims }, rpc, from }) }));

const SITE = "https://hub.example.test";
const ENV = { SUPABASE_URL: "https://project-ref.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" };
const TOKEN = "eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ1In0.c2ln";
const USER = "00000000-0000-4000-8000-00000000000a";
const A = "8b0b2a8e-0d6f-4a53-9a43-1f2e4b8c9d10";
const B = "1b0b2a8e-0d6f-4a53-9a43-1f2e4b8c9d11";
const ZONE = "Europe/London";

const app = createApp();
const today = () => zonedNow(ZONE).date;
const thisMonday = () => startOfWeek(today());

function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const all: Record<string, string> = {
    authorization: `Bearer ${TOKEN}`,
    origin: SITE,
    "x-time-zone": ZONE,
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

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockReset();
  rpc.mockReset();
  from.mockReset();
  getClaims.mockResolvedValue({ data: { claims: { sub: USER, role: "authenticated" } }, error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("removed Today endpoint (decision 40)", () => {
  it("answers 404 for /api/finisher/today", async () => {
    expect((await call("GET", "/api/finisher/today")).status).toBe(404);
  });
});

describe("GET /api/finisher/week and /week/review (FIN-042)", () => {
  it("refuses a start that isn't a Monday within 5 years, without a database call", async () => {
    const notMonday = addDays(thisMonday(), 2);
    const tooFar = addDays(thisMonday(), 7 * 53 * 6);
    for (const start of [notMonday, tooFar, "2026-02-30", "monday", "x".repeat(40)]) {
      expect((await call("GET", `/api/finisher/week?start=${start}`)).status, start).toBe(400);
      expect((await call("GET", `/api/finisher/week/review?start=${start}`)).status, start).toBe(400);
    }
    expect(from).not.toHaveBeenCalled();
  });

  it("refuses the review of a future week before reading anything", async () => {
    const response = await call("GET", `/api/finisher/week/review?start=${addDays(thisMonday(), 7)}`);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "not_allowed" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(from).not.toHaveBeenCalled();
  });

  it("needs a signed-in caller", async () => {
    getClaims.mockResolvedValue({ data: null, error: { message: "invalid JWT" } });
    for (const path of ["/api/finisher/week", "/api/finisher/week/review"]) {
      expect((await call("GET", path, undefined, { authorization: "" })).status).toBe(401);
    }
    expect(from).not.toHaveBeenCalled();
  });
});

describe("POST /api/finisher/tasks/due-changes (FIN-046, A29)", () => {
  it("passes only id, dueDate and dueTime per task, and returns moved and failed", async () => {
    rpc.mockResolvedValue({ data: { moved: [A], failed: [B] }, error: null });
    const response = await call("POST", "/api/finisher/tasks/due-changes", {
      changes: [
        { id: A.toUpperCase(), dueDate: today(), dueTime: "09:00:00", title: "", user_id: "x" },
        { id: B, dueDate: null, dueTime: null, sortKey: 1 },
      ],
      user_id: "00000000-0000-4000-8000-00000000000b",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ moved: [A], failed: [B] });
    expect(rpc).toHaveBeenCalledWith("finisher_set_tasks_due", {
      p_tz: ZONE,
      p_changes: [
        { id: A, dueDate: today(), dueTime: "09:00" },
        { id: B, dueDate: null, dueTime: null },
      ],
    });
  });

  it("refuses empty, oversized, duplicate or invalid batches without a database call", async () => {
    const one = { id: A, dueDate: today(), dueTime: null };
    const cases: [unknown, string][] = [
      [{}, "invalid"],
      [{ changes: [] }, "invalid"],
      [{ changes: "all" }, "invalid"],
      [{ changes: [one, one] }, "invalid"],
      [{ changes: [{ ...one, id: "nope" }] }, "invalid"],
      [{ changes: [{ ...one, dueDate: "2026-13-01" }] }, "invalid"],
      [{ changes: [{ ...one, dueDate: null, dueTime: "09:00" }] }, "invalid"],
      [{ changes: [{ ...one, dueDate: addDays(today(), 366 * 6) }] }, "invalid"],
      [{ changes: Array.from({ length: 201 }, (_, i) => ({ ...one, id: `8b0b2a8e-0d6f-4a53-9a43-${String(i).padStart(12, "0")}` })) }, "too_many"],
    ];
    for (const [body, code] of cases) {
      const response = await call("POST", "/api/finisher/tasks/due-changes", body);
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error: "validation", fields: { changes: code } });
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("is guarded like every write: foreign origin, form bodies, missing token", async () => {
    const body = { changes: [{ id: A, dueDate: null, dueTime: null }] };
    expect((await call("POST", "/api/finisher/tasks/due-changes", body, { origin: "https://evil.test" })).status).toBe(403);
    expect((await call("POST", "/api/finisher/tasks/due-changes", "changes=1", { "content-type": "application/x-www-form-urlencoded" })).status).toBe(415);
    getClaims.mockResolvedValue({ data: null, error: { message: "invalid JWT" } });
    expect((await call("POST", "/api/finisher/tasks/due-changes", body, { authorization: "" })).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("PUT /api/finisher/weekly-notes/:weekStart (FIN-047)", () => {
  it("saves the trimmed note for a Monday; the owner comes from the token", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const response = await call("PUT", `/api/finisher/weekly-notes/${thisMonday()}`, { note: "  Good week  ", user_id: "x", week_start: "2020-01-06" });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(rpc).toHaveBeenCalledWith("finisher_save_weekly_note", { p_tz: ZONE, p_week_start: thisMonday(), p_note: "Good week" });
  });

  it("sends an empty note as null (remove it)", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await call("PUT", `/api/finisher/weekly-notes/${thisMonday()}`, { note: "   " });
    expect(rpc).toHaveBeenCalledWith("finisher_save_weekly_note", expect.objectContaining({ p_note: null }));
  });

  it("treats a week that isn't a Monday as not found, and a long note as a field error, without a database call", async () => {
    expect((await call("PUT", `/api/finisher/weekly-notes/${addDays(thisMonday(), 1)}`, { note: "x" })).status).toBe(404);
    expect((await call("PUT", "/api/finisher/weekly-notes/not-a-date", { note: "x" })).status).toBe(404);
    const long = await call("PUT", `/api/finisher/weekly-notes/${thisMonday()}`, { note: "x".repeat(2001) });
    expect(long.status).toBe(422);
    expect(await long.json()).toEqual({ error: "validation", fields: { note: "too_long" } });
    expect((await call("PUT", `/api/finisher/weekly-notes/${thisMonday()}`, { note: 42 })).status).toBe(422);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps a future week (PH409) and unknown failures to safe codes, never the note text", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PH409", message: "week_start" } });
    rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000", message: "detail: my private note" } });
    const future = await call("PUT", `/api/finisher/weekly-notes/${addDays(thisMonday(), 7)}`, { note: "x" });
    expect(future.status).toBe(409);
    const failed = await call("PUT", `/api/finisher/weekly-notes/${thisMonday()}`, { note: "my private note" });
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain("private");
    expect(console.error).not.toHaveBeenCalledWith(expect.anything(), expect.stringContaining("private"));
  });

  it("is guarded like every write", async () => {
    expect((await call("PUT", `/api/finisher/weekly-notes/${thisMonday()}`, { note: "x" }, { origin: "https://evil.test" })).status).toBe(403);
    expect((await call("PUT", `/api/finisher/weekly-notes/${thisMonday()}`, "note=x", { "content-type": "text/plain" })).status).toBe(415);
    expect(rpc).not.toHaveBeenCalled();
  });
});
