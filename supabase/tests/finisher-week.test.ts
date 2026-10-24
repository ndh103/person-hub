import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, isoWeekday, USER_A, USER_B, utcDate, type TestDb } from "../../tests/support/supabase-db";

/**
 * Week tab in the database (FIN-044, FIN-046, FIN-047, ADR-0008): weekly
 * notes and batch due-date changes. Every call runs as the caller's role and
 * JWT claims, so grants, RLS and the write functions are exercised for real;
 * the admin connection only reads fixtures back.
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

/** Monday of the current UTC week, offset by `weeks`. */
function monday(weeks = 0): string {
  const today = utcDate();
  const offset = 1 - isoWeekday(today) + weeks * 7;
  return utcDate(offset);
}

async function createTask(userId: string, title = "Task", dueDate: string | null = null, dueTime: string | null = null) {
  const rows = await db.as<{ id: string }>(userId, "select public.finisher_create_task('UTC', $1, null, $2::date, $3::time) as id", [
    title,
    dueDate,
    dueTime,
  ]);
  return rows[0].id;
}

function saveNote(userId: string | null, weekStart: string, note: string | null) {
  return db.as(userId, "select public.finisher_save_weekly_note('UTC', $1::date, $2)", [weekStart, note]);
}

async function notes(userId: string) {
  return db.as<{ week_start: string; note: string }>(userId, "select week_start::text, note from public.finisher_weekly_notes order by week_start");
}

type Change = { id: string; dueDate: string | null; dueTime: string | null };

async function setDue(userId: string | null, changes: unknown) {
  const rows = await db.as<{ result: { moved: string[]; failed: string[] } }>(
    userId,
    "select public.finisher_set_tasks_due('UTC', $1::jsonb) as result",
    [JSON.stringify(changes)],
  );
  return rows[0].result;
}

async function task(id: string) {
  const result = await db.admin.query<{ due_date: string | null; due_time: string | null; sort_key: string }>(
    "select due_date::text, to_char(due_time, 'HH24:MI') as due_time, sort_key::text from public.finisher_tasks where id = $1",
    [id],
  );
  return result.rows[0];
}

beforeAll(async () => {
  db = await createTestDb();
}, 60_000);

beforeEach(async () => {
  await db.admin.query("delete from public.finisher_weekly_notes");
  await db.admin.query("delete from public.finisher_tasks");
});

describe("weekly notes: privileges and ownership (FIN-017, FIN-047)", () => {
  it("anonymous callers can neither read nor save notes", async () => {
    expect(await sqlState(db.as(null, "select * from public.finisher_weekly_notes"))).toBe("42501");
    expect(await sqlState(saveNote(null, monday(), "x"))).toBe("42501");
  });

  it("signed-in users can't write the table directly", async () => {
    expect(
      await sqlState(
        db.as(USER_A, "insert into public.finisher_weekly_notes (user_id, week_start, note) values ($1, $2::date, 'x')", [USER_A, monday()]),
      ),
    ).toBe("42501");
    await saveNote(USER_A, monday(), "Mine");
    expect(await sqlState(db.as(USER_A, "update public.finisher_weekly_notes set note = 'changed'"))).toBe("42501");
    expect(await sqlState(db.as(USER_A, "delete from public.finisher_weekly_notes"))).toBe("42501");
  });

  it("each user reads and writes only their own note for the same week", async () => {
    await saveNote(USER_A, monday(), "A's week");
    await saveNote(USER_B, monday(), "B's week");
    expect(await notes(USER_A)).toEqual([{ week_start: monday(), note: "A's week" }]);
    expect(await notes(USER_B)).toEqual([{ week_start: monday(), note: "B's week" }]);
    // B clearing "their" note for that week leaves A's untouched.
    await saveNote(USER_B, monday(), "");
    expect(await notes(USER_B)).toEqual([]);
    expect(await notes(USER_A)).toEqual([{ week_start: monday(), note: "A's week" }]);
  });
});

describe("weekly notes: rules", () => {
  it("saves, replaces and removes (an empty or blank note deletes it)", async () => {
    await saveNote(USER_A, monday(-1), "  First draft  ");
    await saveNote(USER_A, monday(-1), "Second draft");
    expect(await notes(USER_A)).toEqual([{ week_start: monday(-1), note: "Second draft" }]);
    await saveNote(USER_A, monday(-1), "   ");
    expect(await notes(USER_A)).toEqual([]);
    await saveNote(USER_A, monday(-1), null);
    expect(await notes(USER_A)).toEqual([]);
  });

  it("refuses a non-Monday, a future week and more than 2000 characters", async () => {
    expect(await sqlState(saveNote(USER_A, utcDate(1 - isoWeekday(utcDate()) + 2), "x"))).toBe("PH422");
    expect(await sqlState(saveNote(USER_A, monday(1), "x"))).toBe("PH409");
    expect(await sqlState(saveNote(USER_A, monday(), "x".repeat(2001)))).toBe("PH422");
    expect(await sqlState(saveNote(USER_A, monday(), "x".repeat(2000)))).toBe("ok");
  });
});

describe("batch due-date changes (FIN-046, A29)", () => {
  it("moves the owner's open tasks to the bottom of the order and reports each one", async () => {
    const a = await createTask(USER_A, "A", utcDate(-3));
    const b = await createTask(USER_A, "B", utcDate(-2), "09:00");
    const keyA = (await task(a)).sort_key;
    const result = await setDue(USER_A, [
      { id: a, dueDate: utcDate(), dueTime: null },
      { id: b, dueDate: utcDate(), dueTime: "09:00" },
    ] satisfies Change[]);
    expect(result).toEqual({ moved: [a, b], failed: [] });
    expect(await task(a)).toMatchObject({ due_date: utcDate(), due_time: null });
    expect(await task(b)).toMatchObject({ due_date: utcDate(), due_time: "09:00" });
    // A changed date goes to the bottom, in the order given.
    expect(Number((await task(a)).sort_key)).toBeGreaterThan(Number(keyA));
    expect(Number((await task(b)).sort_key)).toBeGreaterThan(Number((await task(a)).sort_key));
  });

  it("a time-only change keeps the task's place (FIN-048)", async () => {
    const a = await createTask(USER_A, "A", utcDate(1));
    const before = await task(a);
    await setDue(USER_A, [{ id: a, dueDate: utcDate(1), dueTime: "15:00" }]);
    expect(await task(a)).toEqual({ ...before, due_time: "15:00" });
  });

  it("another user's ids fail with no change, while the caller's own still move", async () => {
    const mine = await createTask(USER_B, "B's", utcDate(-1));
    const theirs = await createTask(USER_A, "A's", utcDate(-1));
    const result = await setDue(USER_B, [
      { id: theirs, dueDate: utcDate(), dueTime: null },
      { id: mine, dueDate: utcDate(), dueTime: null },
    ]);
    expect(result).toEqual({ moved: [mine], failed: [theirs] });
    expect((await task(theirs)).due_date).toBe(utcDate(-1));
  });

  it("closed or parked tasks, bad values and out-of-range dates fail per item", async () => {
    const done = await createTask(USER_A, "Done", utcDate());
    await db.as(USER_A, "select public.finisher_task_action('UTC', $1, 'done')", [done]);
    const open = await createTask(USER_A, "Open", utcDate());
    const result = await setDue(USER_A, [
      { id: done, dueDate: utcDate(1), dueTime: null },
      { id: open, dueDate: "not-a-date", dueTime: null },
      { id: open, dueDate: utcDate(5 * 366 + 2), dueTime: null },
      { id: open, dueDate: null, dueTime: "09:00" },
      { id: "nope", dueDate: utcDate(), dueTime: null },
    ]);
    expect(result).toEqual({ moved: [], failed: [done, open, open, open, "nope"] });
    expect((await task(open)).due_date).toBe(utcDate());
  });

  it("refuses an empty, non-array or oversized batch, and anonymous callers", async () => {
    expect(await sqlState(setDue(USER_A, []))).toBe("PH422");
    expect(await sqlState(setDue(USER_A, { id: "x" }))).toBe("PH422");
    const id = await createTask(USER_A);
    expect(await sqlState(setDue(USER_A, Array.from({ length: 201 }, () => ({ id, dueDate: null, dueTime: null }))))).toBe("PH422");
    expect(await sqlState(setDue(null, [{ id, dueDate: null, dueTime: null }]))).toBe("42501");
  });
});
