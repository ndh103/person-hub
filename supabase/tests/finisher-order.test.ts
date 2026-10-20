import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applyMigration, createTestDb, USER_A, USER_B, utcDate, type TestDb } from "../../tests/support/supabase-db";

/**
 * FIN-037 and FIN-038 in the database (ADR-0005): the task order, moves,
 * bottom placement, the quick due-date function, and their ownership checks.
 * Every call runs as the caller's own role and JWT claims.
 */
const ORDER_MIGRATION = "20261020120000_finisher_task_order.sql";

let db: TestDb;

async function sqlState(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return (error as { code?: string }).code ?? "unknown";
  }
  return "ok";
}

async function createTask(userId: string, title: string, dueDate: string | null = null, dueTime: string | null = null) {
  const rows = await db.as<{ id: string }>(
    userId,
    "select public.finisher_create_task('UTC', $1, null, $2::date, $3::time, null) as id",
    [title, dueDate, dueTime],
  );
  return rows[0].id;
}

function move(userId: string, taskId: string, afterId: string | null, beforeId: string | null) {
  return db.as(userId, "select public.finisher_move_task($1, $2::uuid, $3::uuid)", [taskId, afterId, beforeId]);
}

function action(userId: string, taskId: string, act: string, extra: { revisit?: string; reason?: string; keep?: boolean } = {}) {
  return db.as(userId, "select public.finisher_task_action('UTC', $1, $2, $3::date, $4, $5)", [
    taskId,
    act,
    extra.revisit ?? null,
    extra.reason ?? null,
    extra.keep ?? false,
  ]);
}

function setDue(userId: string, taskId: string, dueDate: string | null, dueTime: string | null = null) {
  return db.as(userId, "select public.finisher_set_task_due('UTC', $1, $2::date, $3::time)", [taskId, dueDate, dueTime]);
}

/** The caller's open task titles in their order, as the app reads them. */
async function openOrder(userId: string): Promise<string[]> {
  const rows = await db.as<{ title: string }>(
    userId,
    "select title from public.finisher_tasks where status = 'open' order by sort_key, id",
  );
  return rows.map((row) => row.title);
}

async function key(taskId: string): Promise<string> {
  const rows = await db.admin.query<{ sort_key: string }>("select sort_key::text from public.finisher_tasks where id = $1", [taskId]);
  return rows.rows[0].sort_key;
}

async function clearTasks() {
  await db.admin.query("delete from public.finisher_tasks");
}

beforeAll(async () => {
  db = await createTestDb();
}, 60_000);

describe("privileges", () => {
  it("anonymous callers cannot call the new functions", async () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(await sqlState(db.as(null, "select public.finisher_move_task($1, null, $1)", [id]))).toBe("42501");
    expect(await sqlState(db.as(null, "select public.finisher_set_task_due('UTC', $1, null, null)", [id]))).toBe("42501");
    expect(
      await sqlState(db.as(null, "select public.finisher_task_action('UTC', $1, 'reopen', null, null, true)", [id])),
    ).toBe("42501");
  });

  it("signed-in users cannot write sort_key directly or call the order helpers", async () => {
    expect(await sqlState(db.as(USER_A, "update public.finisher_tasks set sort_key = 0"))).toBe("42501");
    expect(await sqlState(db.as(USER_A, "select finisher_private.bottom_key($1)", [USER_A]))).toBe("42501");
    expect(await sqlState(db.as(USER_A, "select finisher_private.rebalance_task_order($1)", [USER_A]))).toBe("42501");
  });

  it("the 5-argument task action call still works (old Worker against the new schema)", async () => {
    await clearTasks();
    const id = await createTask(USER_A, "A");
    await db.as(USER_A, "select public.finisher_task_action('UTC', $1, 'done', null, null)", [id]);
    const [row] = await db.as<{ status: string }>(USER_A, "select status from public.finisher_tasks where id = $1", [id]);
    expect(row.status).toBe("done");
  });
});

describe("ownership (FIN-017)", () => {
  let a1: string;
  let a2: string;
  let b1: string;

  beforeEach(async () => {
    await clearTasks();
    a1 = await createTask(USER_A, "A1");
    a2 = await createTask(USER_A, "A2");
    b1 = await createTask(USER_B, "B1");
  });

  it("another user cannot move the owner's task or use it as a neighbour", async () => {
    const before = [await key(a1), await key(a2)];
    expect(await sqlState(move(USER_B, a2, null, a1))).toBe("PH404");
    expect(await sqlState(move(USER_B, b1, a1, null))).toBe("PH404");
    expect(await sqlState(move(USER_B, b1, null, a2))).toBe("PH404");
    expect([await key(a1), await key(a2)]).toEqual(before);
    expect(await openOrder(USER_A)).toEqual(["A1", "A2"]);
  });

  it("another user cannot change the owner's due date", async () => {
    expect(await sqlState(setDue(USER_B, a1, utcDate(1)))).toBe("PH404");
    const [row] = await db.as<{ due_date: string | null }>(USER_A, "select due_date from public.finisher_tasks where id = $1", [a1]);
    expect(row.due_date).toBeNull();
  });

  it("each user's keys are independent", async () => {
    // Both users' first task has key 1: uniqueness is per user.
    expect(await key(a1)).toBe("1");
    expect(await key(b1)).toBe("1");
  });
});

describe("moves (FIN-038)", () => {
  let t: Record<string, string>;

  beforeEach(async () => {
    await clearTasks();
    t = {};
    for (const title of ["A", "B", "C", "D"]) t[title] = await createTask(USER_A, title);
  });

  it("places a task between two neighbours, at the top, and at the bottom", async () => {
    await move(USER_A, t.D, t.A, t.B);
    expect(await openOrder(USER_A)).toEqual(["A", "D", "B", "C"]);
    expect(await key(t.D)).toBe("1.5");
    await move(USER_A, t.C, null, t.A);
    expect(await openOrder(USER_A)).toEqual(["C", "A", "D", "B"]);
    await move(USER_A, t.C, t.B, null);
    expect(await openOrder(USER_A)).toEqual(["A", "D", "B", "C"]);
  });

  it("is idempotent: repeating a move writes the same key", async () => {
    await move(USER_A, t.D, t.A, t.B);
    const first = await key(t.D);
    await move(USER_A, t.D, t.A, t.B);
    expect(await key(t.D)).toBe(first);
  });

  it("moves among shown tasks only: tasks in between keep their keys (filtered view)", async () => {
    // The screen shows A, C, D (B is hidden by a filter). Moving D between A and C.
    const b = await key(t.B);
    await move(USER_A, t.D, t.A, t.C);
    expect(await key(t.B)).toBe(b);
    const order = await openOrder(USER_A);
    expect(order.indexOf("D")).toBeGreaterThan(order.indexOf("A"));
    expect(order.indexOf("D")).toBeLessThan(order.indexOf("C"));
  });

  it("never collides with a parked or closed task's key", async () => {
    // B is done (keeps key 2); moving D between A (1) and C (3) must not take 2.
    await action(USER_A, t.B, "done");
    await move(USER_A, t.D, t.A, t.C);
    expect(await openOrder(USER_A)).toEqual(["A", "D", "C"]);
    expect(await key(t.D)).not.toBe(await key(t.B));
  });

  it("refuses bad input, closed tasks and stale views", async () => {
    expect(await sqlState(move(USER_A, t.A, null, null))).toBe("PH422");
    expect(await sqlState(move(USER_A, t.A, t.A, t.B))).toBe("PH422");
    expect(await sqlState(move(USER_A, t.A, t.B, t.B))).toBe("PH422");
    expect(await sqlState(move(USER_A, t.A, t.C, t.B))).toBe("PH409"); // C is after B: stale view
    await action(USER_A, t.D, "done");
    expect(await sqlState(move(USER_A, t.D, t.A, t.B))).toBe("PH409"); // moving a done task
    expect(await sqlState(move(USER_A, t.A, t.C, t.D))).toBe("PH409"); // a done neighbour
    expect(await sqlState(move(USER_A, "00000000-0000-4000-8000-000000000009", t.A, null))).toBe("PH404");
  });

  it("rebalances after many inserts into the same gap and keeps the order", async () => {
    // Repeatedly put a task right after A: the gap after A halves each time.
    const extra: string[] = [];
    for (let i = 0; i < 60; i += 1) {
      const id = await createTask(USER_A, `X${i}`);
      await move(USER_A, id, t.A, extra.length ? extra[extra.length - 1] : t.B);
      extra.push(id);
    }
    // Each X went directly after A, so they appear newest first between A and B.
    const xs = Array.from({ length: 60 }, (_, i) => `X${59 - i}`);
    expect(await openOrder(USER_A)).toEqual(["A", ...xs, "B", "C", "D"]);
    const rows = await db.admin.query<{ scale: number }>(
      "select max(scale(sort_key))::int as scale from public.finisher_tasks where user_id = $1",
      [USER_A],
    );
    expect(rows.rows[0].scale).toBeLessThanOrEqual(20);
  });
});

describe("bottom placement (FIN-038)", () => {
  beforeEach(clearTasks);

  it("create, unpark and reopen go to the bottom; Undo after done keeps the place", async () => {
    const a = await createTask(USER_A, "A");
    const b = await createTask(USER_A, "B");
    const c = await createTask(USER_A, "C");

    await action(USER_A, a, "done");
    await action(USER_A, a, "reopen", { keep: true });
    expect(await openOrder(USER_A)).toEqual(["A", "B", "C"]);

    await action(USER_A, a, "done");
    await action(USER_A, a, "reopen");
    expect(await openOrder(USER_A)).toEqual(["B", "C", "A"]);

    await action(USER_A, b, "park", { revisit: utcDate(3) });
    await action(USER_A, b, "unpark");
    expect(await openOrder(USER_A)).toEqual(["C", "A", "B"]);

    await action(USER_A, c, "let_go", { reason: "Not needed" });
    await action(USER_A, c, "reopen");
    expect(await openOrder(USER_A)).toEqual(["A", "B", "C"]);
  });

  it("changing the due date moves a task to the bottom; a time or title change keeps its place", async () => {
    const a = await createTask(USER_A, "A", utcDate(1), "09:00");
    await createTask(USER_A, "B");
    await db.as(USER_A, "select public.finisher_update_task('UTC', $1, 'A2', null, $2::date, '10:00', null)", [a, utcDate(1)]);
    expect(await openOrder(USER_A)).toEqual(["A2", "B"]);
    await db.as(USER_A, "select public.finisher_update_task('UTC', $1, 'A2', null, $2::date, '10:00', null)", [a, utcDate(2)]);
    expect(await openOrder(USER_A)).toEqual(["B", "A2"]);
  });

  it("time passing changes nothing stored (no automation)", async () => {
    // Keys only change through the functions; reading never writes.
    const a = await createTask(USER_A, "A", utcDate(-1));
    const before = await key(a);
    await openOrder(USER_A);
    expect(await key(a)).toBe(before);
  });
});

describe("quick due date (FIN-037)", () => {
  beforeEach(clearTasks);

  it("sets the date and time of an Open task and moves it to the bottom", async () => {
    const a = await createTask(USER_A, "A", utcDate(-2), "09:00");
    await createTask(USER_A, "B");
    await setDue(USER_A, a, utcDate(0), null);
    const [row] = await db.as<{ due_date: string; due_time: string | null }>(
      USER_A,
      "select to_char(due_date, 'YYYY-MM-DD') as due_date, due_time from public.finisher_tasks where id = $1",
      [a],
    );
    expect(row).toEqual({ due_date: utcDate(0), due_time: null });
    expect(await openOrder(USER_A)).toEqual(["B", "A"]);
  });

  it("keeps the place when only the time changes, and is idempotent", async () => {
    const a = await createTask(USER_A, "A", utcDate(1), "09:00");
    await createTask(USER_A, "B");
    await setDue(USER_A, a, utcDate(1), "11:00");
    expect(await openOrder(USER_A)).toEqual(["A", "B"]);
    const first = await key(a);
    await setDue(USER_A, a, utcDate(1), "11:00");
    expect(await key(a)).toBe(first);
  });

  it("validates like editing and only works on Open tasks", async () => {
    const a = await createTask(USER_A, "A");
    expect(await sqlState(setDue(USER_A, a, null, "09:00"))).toBe("PH422");
    expect(await sqlState(setDue(USER_A, a, utcDate(6 * 366)))).toBe("PH422");
    await action(USER_A, a, "park", { revisit: utcDate(2) });
    expect(await sqlState(setDue(USER_A, a, utcDate(1)))).toBe("PH409");
    await action(USER_A, a, "done");
    expect(await sqlState(setDue(USER_A, a, utcDate(1)))).toBe("PH409");
  });
});

describe("seed of existing tasks (A16)", () => {
  it("numbers existing tasks in the order each section showed before v4", async () => {
    const old = await createTestDb({ before: ORDER_MIGRATION });
    const insert = (title: string, status: string, due: string | null, time: string | null, created: string) =>
      old.admin.query(
        `insert into public.finisher_tasks (user_id, title, status, due_date, due_time, created_at, revisit_date, closed_at)
         values ($1, $2, $3, $4::date, $5::time, $6::timestamptz,
                 case when $3 = 'parked' then current_date + 5 end,
                 case when $3 = 'done' then now() end)`,
        [USER_A, title, status, due, time, created],
      );
    await insert("no date old", "open", null, null, "2026-01-01T00:00:00Z");
    await insert("upcoming", "open", "2030-01-05", null, "2026-01-02T00:00:00Z");
    await insert("today untimed", "open", "2030-01-01", null, "2026-01-03T00:00:00Z");
    await insert("today 09:00", "open", "2030-01-01", "09:00", "2026-01-04T00:00:00Z");
    await insert("overdue", "open", "2020-01-01", null, "2026-01-05T00:00:00Z");
    await insert("no date new", "open", null, null, "2026-01-06T00:00:00Z");
    await insert("parked", "parked", null, null, "2026-01-07T00:00:00Z");
    await insert("done", "done", null, null, "2026-01-08T00:00:00Z");
    await insert("B's task", "open", null, null, "2026-01-09T00:00:00Z").catch(() => undefined);
    await old.admin.query("update public.finisher_tasks set user_id = $1 where title = $2", [USER_B, "B's task"]);

    await applyMigration(old, ORDER_MIGRATION);

    const rows = await old.admin.query<{ title: string; sort_key: string }>(
      "select title, sort_key::text from public.finisher_tasks where user_id = $1 order by sort_key",
      [USER_A],
    );
    expect(rows.rows.map((row) => row.title)).toEqual([
      "overdue",
      "today 09:00",
      "today untimed",
      "upcoming",
      "no date new",
      "no date old",
      "parked",
      "done",
    ]);
    expect(rows.rows.map((row) => row.sort_key)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    const b = await old.admin.query<{ sort_key: string }>("select sort_key::text from public.finisher_tasks where user_id = $1", [USER_B]);
    expect(b.rows[0].sort_key).toBe("1");
  }, 60_000);
});
