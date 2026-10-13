import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, USER_A, USER_B, type TestDb } from "../../tests/support/supabase-db";

/**
 * EVT-007 and the EVT-009 search rules, run against the real migration in an
 * in-process Postgres (see tests/support/supabase-db.ts). Every check uses the
 * caller's own role and JWT claims, never the owner role (ADR-0004).
 */
let db: TestDb;

async function sqlState(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return (error as { code?: string }).code ?? "unknown";
  }
  return "ok";
}

type Row = { id: string; title: string; match_rank: number; event_date: string; event_time: string | null; created_at: string };

const INSERT = "insert into public.events (title, event_date, event_time, link, notes) values ($1, $2, $3, $4, $5) returning id";

async function addEvent(userId: string, title: string, date: string, time: string | null = null, notes: string | null = null, link: string | null = null) {
  const rows = await db.as<{ id: string }>(userId, INSERT, [title, date, time, link, notes]);
  return rows[0].id;
}

function page(userId: string, q: string | null, year: number | null = null, after: Row | null = null, limit = 50) {
  return db.as<Row>(userId, "select * from public.events_page($1, $2, $3, $4, $5, $6, $7, $8, $9)", [
    q,
    year,
    after?.match_rank ?? null,
    after?.event_date ?? null,
    after ? after.event_time !== null : null,
    after?.event_time ?? null,
    after?.created_at ?? null,
    after?.id ?? null,
    limit,
  ]);
}

const titles = (rows: Row[]) => rows.map((row) => `${row.match_rank}:${row.title}`);

let aPho: string;

beforeAll(async () => {
  db = await createTestDb();
  aPho = await addEvent(USER_A, "Ăn phở với gia đình", "2026-10-13", "12:30", "Phở bò");
  await addEvent(USER_A, "Bought a TV", "2026-10-13", null, "Model plasma 2026 tv001", "https://shop.example.com/tv001");
  await addEvent(USER_A, "Pho cooking class", "2026-09-27", "18:00");
  await addEvent(USER_A, "Flight to Hanoi", "2026-12-20", "07:45");
  await addEvent(USER_A, "100%_literal", "2025-01-01");
  await addEvent(USER_A, "Đi Đà Lạt", "2025-04-30", null, "Ở 3 đêm");
  await addEvent(USER_B, "B private phở", "2026-10-13");
});

describe("ownership (EVT-007)", () => {
  it("lets each user read, search and list years for only their own events", async () => {
    expect((await db.as<{ n: number }>(USER_B, "select count(*)::int as n from public.events"))[0].n).toBe(1);
    expect(titles(await page(USER_B, "phở"))).toEqual(["2:B private phở"]);
    expect(await db.as(USER_B, "select * from public.events_years()")).toEqual([{ events_years: 2026 }]);
    expect(await db.as(USER_B, "select * from public.events_counts('phở')")).toEqual([{ exact_count: 1, accent_count: 0 }]);
    expect(await db.as(USER_B, "select id from public.events where id = $1", [aPho])).toEqual([]);
  });

  it("does not let another user update or delete an event", async () => {
    expect(await db.as(USER_B, "update public.events set title = 'x' where id = $1 returning id", [aPho])).toEqual([]);
    expect(await db.as(USER_B, "delete from public.events where id = $1 returning id", [aPho])).toEqual([]);
    expect((await db.as<{ title: string }>(USER_A, "select title from public.events where id = $1", [aPho]))[0].title).toBe("Ăn phở với gia đình");
  });

  it("refuses writes to ownership, ids and timestamps, even on the owner's own row", async () => {
    expect(await sqlState(db.as(USER_A, "update public.events set user_id = $1 where id = $2", [USER_B, aPho]))).toBe("42501");
    expect(await sqlState(db.as(USER_A, "insert into public.events (user_id, title, event_date) values ($1, 'x', '2026-01-01')", [USER_B]))).toBe("42501");
    expect(await sqlState(db.as(USER_A, "insert into public.events (id, title, event_date) values (gen_random_uuid(), 'x', '2026-01-01')"))).toBe("42501");
    expect(await sqlState(db.as(USER_A, "update public.events set created_at = now() where id = $1", [aPho]))).toBe("42501");
    expect(await sqlState(db.as(USER_A, "update public.events set updated_at = now() where id = $1", [aPho]))).toBe("42501");
  });

  it("gives signed-out callers nothing: no table access and no search functions", async () => {
    expect(await sqlState(db.as(null, "select * from public.events"))).toBe("42501");
    expect(await sqlState(db.as(null, INSERT, ["x", "2026-01-01", null, null, null]))).toBe("42501");
    expect(await sqlState(db.as(null, "select * from public.events_page()"))).toBe("42501");
    expect(await sqlState(db.as(null, "select * from public.events_counts()"))).toBe("42501");
    expect(await sqlState(db.as(null, "select * from public.events_years()"))).toBe("42501");
  });

  it("sets the owner from the session and maintains updated_at", async () => {
    const id = await addEvent(USER_B, "Owner check", "2026-01-01");
    const [row] = await db.as<{ user_id: string; updated_at: string }>(USER_B, "select user_id, updated_at from public.events where id = $1", [id]);
    expect(row.user_id).toBe(USER_B);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await db.as(USER_B, "update public.events set notes = 'changed' where id = $1", [id]);
    const [after] = await db.as<{ updated_at: string }>(USER_B, "select updated_at from public.events where id = $1", [id]);
    expect(new Date(after.updated_at).getTime()).toBeGreaterThan(new Date(row.updated_at).getTime());
  });
});

describe("constraints are the authority for direct writes (ADR-0004)", () => {
  const cases: [string, unknown[]][] = [
    ["blank title", ["   ", "2026-01-01", null, null, null]],
    ["title over 120 code points", ["x".repeat(121), "2026-01-01", null, null, null]],
    ["title not NFC", ["phở", "2026-01-01", null, null, null]],
    ["date after 2100", ["x", "2101-01-01", null, null, null]],
    ["date before 1900", ["x", "1899-12-31", null, null, null]],
    ["time with seconds", ["x", "2026-01-01", "07:45:30", null, null]],
    ["javascript: link", ["x", "2026-01-01", null, "javascript:alert(1)", null]],
    ["link without a host", ["x", "2026-01-01", null, "https://", null]],
    ["link over 2048", ["x", "2026-01-01", null, `https://a.example/${"x".repeat(2040)}`, null]],
    ["empty notes", ["x", "2026-01-01", null, null, ""]],
    ["notes over 2000", ["x", "2026-01-01", null, null, "x".repeat(2001)]],
  ];
  it.each(cases)("rejects %s", async (_name, params) => {
    expect(await sqlState(db.as(USER_A, INSERT, params))).toBe("23514");
  });

  it("accepts the edges of every range", async () => {
    const ok = [
      ["x".repeat(120), "1900-01-01", "00:00", `https://a.example/${"x".repeat(2048 - 18)}`, "x".repeat(2000)],
      ["Edge", "2100-12-31", "23:59", "http://localhost", "😀".repeat(2000)],
    ];
    for (const params of ok) expect(await sqlState(db.as(USER_B, INSERT, params))).toBe("ok");
  });
});

describe("search and paging (EVT-002, EVT-009)", () => {
  it("lists in date order: timed before untimed on the same date, latest first", async () => {
    expect((await page(USER_A, null)).map((row) => row.title)).toEqual([
      "Flight to Hanoi",
      "Ăn phở với gia đình",
      "Bought a TV",
      "Pho cooking class",
      "Đi Đà Lạt",
      "100%_literal",
    ]);
  });

  it("puts exact matches first, then matches that ignore Vietnamese accents", async () => {
    expect(titles(await page(USER_A, "phở"))).toEqual(["2:Ăn phở với gia đình", "1:Pho cooking class"]);
    expect(titles(await page(USER_A, "PHO"))).toEqual(["2:Pho cooking class", "1:Ăn phở với gia đình"]);
    expect(titles(await page(USER_A, "gia dinh"))).toEqual(["1:Ăn phở với gia đình"]);
    expect(titles(await page(USER_A, "da lat"))).toEqual(["1:Đi Đà Lạt"]);
    expect(titles(await page(USER_A, "tv001"))).toEqual(["2:Bought a TV"]);
    expect(await db.as(USER_A, "select * from public.events_counts('phở')")).toEqual([{ exact_count: 1, accent_count: 1 }]);
  });

  it("matches the same letter typed composed or decomposed as exact", async () => {
    expect(titles(await page(USER_A, "phở"))).toEqual(["2:Ăn phở với gia đình", "1:Pho cooking class"]);
  });

  it("treats % and _ as plain characters and does not search the link", async () => {
    expect(titles(await page(USER_A, "%"))).toEqual(["2:100%_literal"]);
    expect(titles(await page(USER_A, "_"))).toEqual(["2:100%_literal"]);
    expect(await page(USER_A, "shop.example.com")).toEqual([]);
  });

  it("filters by year, alone and with search", async () => {
    expect((await page(USER_A, null, 2025)).map((row) => row.title)).toEqual(["Đi Đà Lạt", "100%_literal"]);
    expect(await page(USER_A, "phở", 2025)).toEqual([]);
    expect(await db.as(USER_A, "select * from public.events_years()")).toEqual([{ events_years: 2026 }, { events_years: 2025 }]);
  });

  it("pages with a keyset that crosses the group boundary without gaps or repeats", async () => {
    for (const [q, size] of [["pho", 1], [null, 2], [null, 1]] as const) {
      const all = (await page(USER_A, q)).map((row) => row.id);
      const seen: string[] = [];
      let after: Row | null = null;
      for (let i = 0; i < 10; i++) {
        const rows = await page(USER_A, q, null, after, size);
        if (!rows.length) break;
        seen.push(...rows.map((row) => row.id));
        after = rows[rows.length - 1];
      }
      expect(seen).toEqual(all);
    }
  });

  it("caps the page size", async () => {
    expect((await page(USER_A, null, null, null, 100_000)).length).toBeLessThanOrEqual(101);
  });
});
