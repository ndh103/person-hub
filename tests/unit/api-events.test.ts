import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "@/worker/app";

/**
 * The Events API (src/worker/events.ts) with Supabase replaced by a stub.
 * These cover what the API adds: authentication before any data access, the
 * write guards, strict field allowlists, safe errors, search text kept out of
 * URLs, and no-store responses. Database authorization itself is covered in
 * supabase/tests/events-rls.test.ts.
 */
const getClaims = vi.fn();
const rpc = vi.fn();
const from = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getClaims }, rpc, from }) }));

const SITE = "https://hub.example.test";
const ENV = { SUPABASE_URL: "https://project-ref.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" };
const TOKEN = "eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ1In0.c2ln";
const USER = "00000000-0000-4000-8000-00000000000a";
const EVENT_ID = "8b0b2a8e-0d6f-4a53-9a43-1f2e4b8c9d10";

const app = createApp();

function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const all: Record<string, string> = {
    authorization: `Bearer ${TOKEN}`,
    origin: SITE,
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
  getClaims.mockResolvedValue({ data: { claims: { sub: USER, role: "authenticated" } }, error: null });
}

const ROW = {
  id: EVENT_ID,
  title: "Bought a TV",
  event_date: "2026-10-13",
  event_time: null,
  link: "https://shop.example.com/tv001",
  notes: "Model plasma 2026 tv001",
  created_at: "2026-10-13T10:00:00.123456+00:00",
  updated_at: "2026-10-13T10:00:00.123456+00:00",
};

/** A PostgREST query builder stub: every method chains and records; awaiting it (or a terminal call) gives `result`. */
function builder(result: { data?: unknown; error?: unknown }) {
  const calls: [string, unknown[]][] = [];
  const settled = Promise.resolve({ data: result.data ?? null, error: result.error ?? null });
  const chain: Record<string, unknown> = {};
  for (const name of ["insert", "update", "delete", "select", "eq"]) {
    chain[name] = (...args: unknown[]) => (calls.push([name, args]), chain);
  }
  for (const name of ["single", "maybeSingle"]) {
    chain[name] = (...args: unknown[]) => (calls.push([name, args]), settled);
  }
  chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => settled.then(resolve, reject);
  from.mockReturnValueOnce(chain);
  return calls;
}

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockReset();
  rpc.mockReset();
  from.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("authentication and transport (EVT-007)", () => {
  it("answers 401 with no-store before any data access when the token is missing or not a signed-in user", async () => {
    getClaims.mockResolvedValueOnce({ data: { claims: { sub: USER, role: "authenticated", is_anonymous: true } }, error: null });
    const responses = await Promise.all([
      call("POST", "/api/events/query", {}),
      call("GET", "/api/events/years", undefined, { authorization: "" }),
      call("POST", "/api/events", { title: "x", date: "2026-01-01" }, { authorization: "" }),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("refuses a cross-site write and a non-JSON body", async () => {
    signedIn();
    expect((await call("POST", "/api/events", { title: "x", date: "2026-01-01" }, { origin: "https://evil.test" })).status).toBe(403);
    expect((await call("POST", "/api/events/query", "q=x", { "content-type": "application/x-www-form-urlencoded" })).status).toBe(415);
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("has no GET route that takes search text in the URL", async () => {
    signedIn();
    expect((await call("GET", "/api/events?q=ph%E1%BB%9F")).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("POST /api/events/query (EVT-002, EVT-009)", () => {
  it("searches as the caller, returns narrow items with counts and an opaque cursor", async () => {
    signedIn();
    const rows = Array.from({ length: 51 }, (_, i) => ({ ...ROW, id: `${EVENT_ID.slice(0, -2)}${String(i).padStart(2, "0")}`, match_rank: i < 30 ? 2 : 1, user_id: USER, search_folded: "x" }));
    rpc.mockImplementation((fn: string) =>
      Promise.resolve(fn === "events_page" ? { data: rows, error: null } : { data: [{ exact_count: 30, accent_count: 21 }], error: null }),
    );
    const response = await call("POST", "/api/events/query", { q: "  phở ", year: 2026 });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = (await response.json()) as { items: Record<string, unknown>[]; nextCursor: string; counts: unknown };
    expect(body.items).toHaveLength(50);
    expect(Object.keys(body.items[0]).sort()).toEqual(["createdAt", "date", "id", "link", "match", "notes", "time", "title", "updatedAt"]);
    expect(body.items[0].match).toBe("exact");
    expect(body.items[49].match).toBe("accent");
    expect(body.counts).toEqual({ exact: 30, accent: 21 });
    expect(rpc).toHaveBeenCalledWith("events_page", expect.objectContaining({ p_q: "phở", p_year: 2026, p_limit: 51, p_after_id: null }));

    rpc.mockClear();
    rpc.mockResolvedValue({ data: [], error: null });
    const next = await call("POST", "/api/events/query", { q: "phở", cursor: body.nextCursor });
    expect(next.status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1); // counts only on the first page
    expect(rpc).toHaveBeenCalledWith(
      "events_page",
      expect.objectContaining({ p_after_rank: 1, p_after_id: rows[49].id, p_after_created: ROW.created_at, p_after_has_time: false }),
    );
  });

  it("rejects unknown keys, over-long search text, bad years and tampered cursors", async () => {
    signedIn();
    const bad = [
      { q: "x", user_id: USER },
      { q: "x".repeat(101) },
      { year: 1899 },
      { year: "2026" },
      { cursor: "eyJyIjozfQ" },
      { cursor: "x".repeat(600) },
    ];
    for (const body of bad) expect((await call("POST", "/api/events/query", body)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("never forwards database text", async () => {
    signedIn();
    rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "secret detail about Bought a TV" } });
    const response = await call("POST", "/api/events/query", {});
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("Bought a TV");
  });
});

describe("writes (EVT-003, EVT-005, EVT-006)", () => {
  it("creates with only the allowlisted columns and returns 201", async () => {
    signedIn();
    const calls = builder({ data: ROW });
    const response = await call("POST", "/api/events", { title: " Bought a TV ", date: "2026-10-13", link: "shop.example.com/tv001", notes: "Model plasma 2026 tv001" });
    expect(response.status).toBe(201);
    expect(from).toHaveBeenCalledWith("events");
    expect(calls[0]).toEqual([
      "insert",
      [{ title: "Bought a TV", event_date: "2026-10-13", event_time: null, link: "https://shop.example.com/tv001", notes: "Model plasma 2026 tv001" }],
    ]);
    expect(((await response.json()) as { item: { title: string } }).item.title).toBe("Bought a TV");
  });

  it("rejects a spoofed owner or any unknown field with 400, and invalid fields with 422", async () => {
    signedIn();
    expect((await call("POST", "/api/events", { title: "x", date: "2026-01-01", user_id: USER })).status).toBe(400);
    expect((await call("PATCH", `/api/events/${EVENT_ID}`, { created_at: "2020-01-01T00:00:00Z" })).status).toBe(400);
    expect((await call("PATCH", `/api/events/${EVENT_ID}`, {})).status).toBe(400);
    const invalid = await call("POST", "/api/events", { title: "", date: "2101-01-01", time: "7:5", link: "javascript:alert(1)" });
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toEqual({
      error: "validation",
      fields: { title: "required", date: "out_of_range", time: "invalid", link: "invalid" },
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("updates only the fields sent and answers 404 when no row matched (missing or another user's)", async () => {
    signedIn();
    const calls = builder({ data: ROW });
    expect((await call("PATCH", `/api/events/${EVENT_ID.toUpperCase()}`, { time: "", notes: null })).status).toBe(200);
    expect(calls[0]).toEqual(["update", [{ event_time: null, notes: null }]]);
    expect(calls[1]).toEqual(["eq", ["id", EVENT_ID]]);

    builder({ data: null });
    const missing = await call("PATCH", `/api/events/${EVENT_ID}`, { title: "x" });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "not_found" });
    expect((await call("PATCH", "/api/events/not-a-uuid", { title: "x" })).status).toBe(404);
  });

  it("deletes idempotently: the same answer whether or not the row existed", async () => {
    signedIn();
    builder({ data: null });
    const response = await call("DELETE", `/api/events/${EVENT_ID}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("maps a constraint violation the Worker missed to a generic 400 without the constraint name", async () => {
    signedIn();
    builder({ error: { code: "23514", message: 'violates check constraint "events_link_check"' } });
    const response = await call("POST", "/api/events", { title: "x", date: "2026-01-01" });
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("events_link_check");
  });
});
