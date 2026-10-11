import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, isoWeekday, USER_A, USER_B, utcDate, type TestDb } from "../../tests/support/supabase-db";

/**
 * FIN-017 and the server-enforced Finisher rules, run against the real
 * migration in an in-process Postgres (see tests/support/supabase-db.ts).
 * Each check uses the caller's own role and JWT claims, never the owner role.
 */
let db: TestDb;

const TABLES = [
  "finisher_projects",
  "finisher_project_periods",
  "finisher_slots",
  "finisher_slot_versions",
  "finisher_session_marks",
  "finisher_tasks",
];

async function sqlState(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return (error as { code?: string }).code ?? "unknown";
  }
  return "ok";
}

async function createTask(userId: string, title = "Task", extra: Record<string, unknown> = {}) {
  const rows = await db.as<{ id: string }>(
    userId,
    "select public.finisher_create_task('UTC', $1, $2, $3::date, $4::time, $5::uuid) as id",
    [title, extra.notes ?? null, extra.dueDate ?? null, extra.dueTime ?? null, extra.projectId ?? null],
  );
  return rows[0].id;
}

async function createProject(userId: string, slots: unknown[] = []) {
  const rows = await db.as<{ id: string }>(
    userId,
    "select public.finisher_create_project('UTC', 'Teach English', 'Phonics', 'She reads a short book', null, $1::jsonb) as id",
    [JSON.stringify(slots)],
  );
  return rows[0].id;
}

async function slotIds(projectId: string) {
  const rows = await db.admin.query<{ id: string }>(
    "select id from public.finisher_slots where project_id = $1 order by created_at, id",
    [projectId],
  );
  return rows.rows.map((row) => row.id);
}

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

/** Moves a project's history back so earlier dates were scheduled (fixture only). */
async function backdate(projectId: string, days: number) {
  const from = utcDate(-days);
  await db.admin.query("update public.finisher_projects set started_on = $2 where id = $1", [projectId, from]);
  await db.admin.query("update public.finisher_project_periods set start_on = $2 where project_id = $1", [projectId, from]);
  await db.admin.query(
    "update public.finisher_slot_versions set valid_from = $2 where slot_id in (select id from public.finisher_slots where project_id = $1)",
    [projectId, from],
  );
}

function mark(userId: string, slotId: string, date: string, state: string) {
  return db.as(userId, "select public.finisher_mark_session('UTC', $1, $2::date, $3)", [slotId, date, state]);
}

beforeAll(async () => {
  db = await createTestDb();
}, 60_000);

describe("anonymous callers", () => {
  it.each(TABLES)("cannot read %s", async (table) => {
    expect(await sqlState(db.as(null, `select * from public.${table}`))).toBe("42501");
  });

  it("cannot call write functions", async () => {
    expect(await sqlState(db.as(null, "select public.finisher_create_task('UTC', 'x')"))).toBe("42501");
    expect(await sqlState(db.as(null, "select public.finisher_delete_project(gen_random_uuid())"))).toBe("42501");
  });
});

describe("signed-in users: direct table writes are not allowed", () => {
  it.each(TABLES)("cannot insert, update or delete %s directly", async (table) => {
    expect(await sqlState(db.as(USER_A, `delete from public.${table}`))).toBe("42501");
    expect(await sqlState(db.as(USER_A, `update public.${table} set user_id = user_id`))).toBe("42501");
    expect(await sqlState(db.as(USER_A, `insert into public.${table} (user_id) values ($1)`, [USER_A]))).toBe("42501");
  });

  it("cannot call internal helpers", async () => {
    expect(await sqlState(db.as(USER_A, "select finisher_private.today('UTC')"))).toBe("42501");
  });
});

describe("ownership (FIN-017): another user's records behave as if they don't exist", () => {
  let taskId: string;
  let projectId: string;
  let slotId: string;

  beforeAll(async () => {
    projectId = await createProject(USER_A, [{ activity: "Read", days: ALL_DAYS, durationMinutes: 30 }]);
    [slotId] = await slotIds(projectId);
    taskId = await createTask(USER_A, "A's private task", { projectId });
    await mark(USER_A, slotId, utcDate(), "done");
  });

  it("the owner reads their rows", async () => {
    expect(await db.as(USER_A, "select id from public.finisher_tasks where id = $1", [taskId])).toHaveLength(1);
    expect(await db.as(USER_A, "select * from public.finisher_session_marks where slot_id = $1", [slotId])).toHaveLength(1);
  });

  it.each(TABLES)("another user reads nothing from %s", async (table) => {
    const rows = await db.as(USER_B, `select * from public.${table} where user_id = $1`, [USER_A]);
    expect(rows).toHaveLength(0);
  });

  it("another user cannot change, close, delete or mark them (not found, no leak)", async () => {
    const attempts = [
      db.as(USER_B, "select public.finisher_update_task('UTC', $1, 'x', null, null, null, null)", [taskId]),
      db.as(USER_B, "select public.finisher_task_action('UTC', $1, 'done')", [taskId]),
      db.as(USER_B, "select public.finisher_delete_task($1)", [taskId]),
      db.as(USER_B, "select public.finisher_update_project('UTC', $1, 'x', null, 'y', null)", [projectId]),
      db.as(USER_B, "select public.finisher_project_action('UTC', $1, 'finish')", [projectId]),
      db.as(USER_B, "select public.finisher_delete_project($1)", [projectId]),
      db.as(USER_B, "select public.finisher_add_slot('UTC', $1, 'x', '{1}', 30)", [projectId]),
      db.as(USER_B, "select public.finisher_update_slot('UTC', $1, 'x', '{1}', 30)", [slotId]),
      db.as(USER_B, "select public.finisher_remove_slot('UTC', $1)", [slotId]),
      mark(USER_B, slotId, utcDate(), "skipped"),
    ];
    for (const attempt of attempts) expect(await sqlState(attempt)).toBe("PH404");

    const [task] = await db.admin.query<{ title: string; status: string }>(
      "select title, status from public.finisher_tasks where id = $1",
      [taskId],
    ).then((r) => r.rows);
    expect(task).toEqual({ title: "A's private task", status: "open" });
  });

  it("another user cannot link a task to someone else's project", async () => {
    expect(await sqlState(createTask(USER_B, "Sneaky", { projectId }))).toBe("PH422");
  });

  it("ownership comes from the session, not from input", async () => {
    const id = await createTask(USER_B, "B's task");
    const rows = await db.admin.query<{ user_id: string }>("select user_id from public.finisher_tasks where id = $1", [id]);
    expect(rows.rows[0].user_id).toBe(USER_B);
  });

  it("the database refuses cross-user references even for the owner role", async () => {
    // Defence in depth: composite foreign keys tie child rows to the parent's owner.
    const state = await sqlState(
      db.admin.query("insert into public.finisher_tasks (user_id, project_id, title) values ($1, $2, 'x')", [
        USER_B,
        projectId,
      ]),
    );
    expect(state).toBe("23503");
  });
});

describe("task lifecycle and validation", () => {
  it("follows the lifecycle table and rejects other actions", async () => {
    const id = await createTask(USER_A);
    const act = (action: string, revisit: string | null = null, reason: string | null = null) =>
      db.as(USER_A, "select public.finisher_task_action('UTC', $1, $2, $3::date, $4)", [id, action, revisit, reason]);

    expect(await sqlState(act("unpark"))).toBe("PH409");
    expect(await sqlState(act("reopen"))).toBe("PH409");
    expect(await sqlState(act("park", utcDate(0)))).toBe("PH422");
    expect(await sqlState(act("park", utcDate(366)))).toBe("PH422");
    await act("park", utcDate(1));
    await act("park", utcDate(365)); // change the revisit date
    await act("unpark");
    expect(await sqlState(act("let_go", null, "   "))).toBe("PH422");
    await act("done");
    expect(await sqlState(act("done"))).toBe("PH409");
    expect(await sqlState(act("park", utcDate(2)))).toBe("PH409");
    expect(await sqlState(db.as(USER_A, "select public.finisher_update_task('UTC', $1, 'x', null, null, null, null)", [id]))).toBe(
      "PH409",
    );
    await act("reopen");
    await act("let_go", null, "No longer needed");
    const [row] = (await db.as<{ status: string; close_note: string }>(USER_A, "select status, close_note from public.finisher_tasks where id = $1", [id]));
    expect(row).toEqual({ status: "let_go", close_note: "No longer needed" });
    await act("reopen");
    const [reopened] = await db.as<{ status: string; close_note: string | null; closed_at: string | null }>(
      USER_A,
      "select status, close_note, closed_at from public.finisher_tasks where id = $1",
      [id],
    );
    expect(reopened).toEqual({ status: "open", close_note: null, closed_at: null });
  });

  it("validates fields on the server", async () => {
    expect(await sqlState(createTask(USER_A, "  "))).toBe("PH422");
    expect(await sqlState(createTask(USER_A, "x".repeat(121)))).toBe("PH422");
    expect(await sqlState(createTask(USER_A, "x", { dueTime: "09:00" }))).toBe("PH422");
    expect(await sqlState(createTask(USER_A, "x", { dueDate: utcDate(6 * 366) }))).toBe("PH422");
    expect(await sqlState(createTask(USER_A, "x", { notes: "n".repeat(1001) }))).toBe("PH422");
    expect(await sqlState(db.as(USER_A, "select public.finisher_create_task('Not/AZone', 'x')"))).toBe("PH422");
    const id = await createTask(USER_A, "  Trimmed  ");
    const [row] = await db.as<{ title: string }>(USER_A, "select title from public.finisher_tasks where id = $1", [id]);
    expect(row.title).toBe("Trimmed");
  });

  it("only links new tasks to Active or Parked projects, but keeps existing links", async () => {
    const projectId = await createProject(USER_A);
    const taskId = await createTask(USER_A, "Linked", { projectId });
    await db.as(USER_A, "select public.finisher_project_action('UTC', $1, 'finish')", [projectId]);
    expect(await sqlState(createTask(USER_A, "x", { projectId }))).toBe("PH422");
    // Editing the still-linked task keeps the link (assumption A4).
    await db.as(USER_A, "select public.finisher_update_task('UTC', $1, 'Renamed', null, null, null, $2)", [taskId, projectId]);
  });
});

describe("projects, periods and deletion", () => {
  it("follows the project lifecycle table", async () => {
    const id = await createProject(USER_A);
    const act = (action: string, revisit: string | null = null, note: string | null = null) =>
      db.as(USER_A, "select public.finisher_project_action('UTC', $1, $2, $3::date, $4)", [id, action, revisit, note]);
    expect(await sqlState(act("unpark"))).toBe("PH409");
    expect(await sqlState(act("reopen"))).toBe("PH409");
    expect(await sqlState(act("let_go"))).toBe("PH422");
    expect(await sqlState(act("explode"))).toBe("PH422");
    await act("park", utcDate(3));
    await act("finish", null, "Done and dusted");
    expect(await sqlState(act("park", utcDate(3)))).toBe("PH409");
    expect(await sqlState(db.as(USER_A, "select public.finisher_add_slot('UTC', $1, 'x', '{1}', 30)", [id]))).toBe("PH409");
    await act("reopen");
    const [row] = await db.as<{ status: string; close_note: string | null }>(
      USER_A,
      "select status, close_note from public.finisher_projects where id = $1",
      [id],
    );
    expect(row).toEqual({ status: "active", close_note: null });
  });

  it("parking and unparking on the same day keeps one continuous period", async () => {
    const id = await createProject(USER_A);
    await backdate(id, 10);
    await db.as(USER_A, "select public.finisher_project_action('UTC', $1, 'park', $2::date)", [id, utcDate(5)]);
    let periods = await db.as<{ start_on: string; end_on: string | null }>(
      USER_A,
      "select start_on::text, end_on::text from public.finisher_project_periods where project_id = $1",
      [id],
    );
    expect(periods).toEqual([{ start_on: utcDate(-10), end_on: utcDate() }]);
    await db.as(USER_A, "select public.finisher_project_action('UTC', $1, 'unpark')", [id]);
    periods = await db.as(USER_A, "select start_on::text, end_on::text from public.finisher_project_periods where project_id = $1", [id]);
    expect(periods).toEqual([{ start_on: utcDate(-10), end_on: null }]);
  });

  it("deleting a project removes slots and marks but keeps linked tasks, unlinked (A5)", async () => {
    const id = await createProject(USER_A, [{ activity: "Practice", days: ALL_DAYS, durationMinutes: 20 }]);
    const [slotId] = await slotIds(id);
    await mark(USER_A, slotId, utcDate(), "done");
    const taskId = await createTask(USER_A, "Keep me", { projectId: id });
    await db.as(USER_A, "select public.finisher_delete_project($1)", [id]);
    const [task] = await db.as<{ project_id: string | null }>(USER_A, "select project_id from public.finisher_tasks where id = $1", [taskId]);
    expect(task.project_id).toBeNull();
    expect(await db.admin.query("select 1 from public.finisher_slots where id = $1", [slotId]).then((r) => r.rows)).toHaveLength(0);
    expect(
      await db.admin.query("select 1 from public.finisher_session_marks where slot_id = $1", [slotId]).then((r) => r.rows),
    ).toHaveLength(0);
  });
});

describe("slots (FIN-025)", () => {
  it("rejects a 21st slot", async () => {
    const slots = Array.from({ length: 20 }, (_, i) => ({ activity: `S${i}`, days: [1], durationMinutes: 5 }));
    const id = await createProject(USER_A, slots);
    expect(await sqlState(db.as(USER_A, "select public.finisher_add_slot('UTC', $1, 'one more', '{1}', 30)", [id]))).toBe("PH422");
    expect(await sqlState(createProject(USER_A, [...slots, { activity: "x", days: [1], durationMinutes: 5 }]))).toBe("PH422");
  });

  it("validates slot fields", async () => {
    const id = await createProject(USER_A);
    const add = (activity: string, days: string, minutes: number) =>
      db.as(USER_A, "select public.finisher_add_slot('UTC', $1, $2, $3::smallint[], $4)", [id, activity, days, minutes]);
    expect(await sqlState(add("x", "{}", 30))).toBe("PH422");
    expect(await sqlState(add("x", "{8}", 30))).toBe("PH422");
    expect(await sqlState(add("x", "{1}", 4))).toBe("PH422");
    expect(await sqlState(add("x", "{1}", 481))).toBe("PH422");
    expect(await sqlState(add("", "{1}", 30))).toBe("PH422");
    expect(await sqlState(createProject(USER_A, [{ activity: "x", days: "Monday", durationMinutes: 30 }]))).toBe("PH422");
    expect(await sqlState(createProject(USER_A, [{ activity: "x", days: [1], durationMinutes: "lots" }]))).toBe("PH422");
  });

  it("an edit applies from today and keeps earlier history", async () => {
    const id = await createProject(USER_A, [{ activity: "Old name", days: ALL_DAYS, durationMinutes: 30 }]);
    const [slotId] = await slotIds(id);
    await backdate(id, 5);
    await mark(USER_A, slotId, utcDate(-2), "done");
    await mark(USER_A, slotId, utcDate(), "done");

    const otherDays = ALL_DAYS.filter((day) => day !== isoWeekday(utcDate()));
    await db.as(USER_A, "select public.finisher_update_slot('UTC', $1, 'New name', $2::smallint[], 45, '19:00')", [
      slotId,
      `{${otherDays.join(",")}}`,
    ]);
    const versions = await db.as<{ valid_from: string; valid_to: string | null; activity: string }>(
      USER_A,
      "select valid_from::text, valid_to::text, activity from public.finisher_slot_versions where slot_id = $1 order by valid_from",
      [slotId],
    );
    expect(versions).toEqual([
      { valid_from: utcDate(-5), valid_to: utcDate(), activity: "Old name" },
      { valid_from: utcDate(), valid_to: null, activity: "New name" },
    ]);
    // Today's mark is kept and stays editable although today is no longer a slot day.
    await mark(USER_A, slotId, utcDate(), "skipped");
    const marks = await db.as(USER_A, "select session_date::text, state from public.finisher_session_marks where slot_id = $1 order by 1", [slotId]);
    expect(marks).toEqual([
      { session_date: utcDate(-2), state: "done" },
      { session_date: utcDate(), state: "skipped" },
    ]);
  });

  it("removing a slot added and marked today keeps today's marked session", async () => {
    const id = await createProject(USER_A, [{ activity: "Same day", days: ALL_DAYS, durationMinutes: 30 }]);
    const [slotId] = await slotIds(id);
    await mark(USER_A, slotId, utcDate(), "done");
    await db.as(USER_A, "select public.finisher_remove_slot('UTC', $1)", [slotId]);
    const versions = await db.as(USER_A, "select valid_from::text, valid_to::text from public.finisher_slot_versions where slot_id = $1", [slotId]);
    expect(versions).toEqual([{ valid_from: utcDate(), valid_to: utcDate(1) }]);
    expect(await sqlState(mark(USER_A, slotId, utcDate(), "skipped"))).toBe("ok");
  });

  it("removing an unmarked slot added today deletes it entirely", async () => {
    const id = await createProject(USER_A, [{ activity: "Oops", days: ALL_DAYS, durationMinutes: 30 }]);
    const [slotId] = await slotIds(id);
    await db.as(USER_A, "select public.finisher_remove_slot('UTC', $1)", [slotId]);
    expect(await slotIds(id)).toEqual([]);
  });

  it("removing a slot stops future sessions and keeps past marks", async () => {
    const id = await createProject(USER_A, [{ activity: "Walk", days: ALL_DAYS, durationMinutes: 30 }]);
    const [slotId] = await slotIds(id);
    await backdate(id, 3);
    await mark(USER_A, slotId, utcDate(-1), "done");
    await db.as(USER_A, "select public.finisher_remove_slot('UTC', $1)", [slotId]);
    const [slot] = await db.as<{ removed_on: string }>(USER_A, "select removed_on::text from public.finisher_slots where id = $1", [slotId]);
    expect(slot.removed_on).toBe(utcDate());
    expect(await sqlState(mark(USER_A, slotId, utcDate(), "done"))).toBe("PH409");
    await mark(USER_A, slotId, utcDate(-2), "skipped"); // still correctable inside the window
    expect(await sqlState(db.as(USER_A, "select public.finisher_update_slot('UTC', $1, 'x', '{1}', 30)", [slotId]))).toBe("PH404");
  });
});

describe("marking sessions (FIN-027)", () => {
  let projectId: string;
  let slotId: string;

  beforeAll(async () => {
    projectId = await createProject(USER_A, [{ activity: "Daily", days: ALL_DAYS, durationMinutes: 15 }]);
    [slotId] = await slotIds(projectId);
    await backdate(projectId, 20);
  });

  it("allows today and the 7 previous dates only", async () => {
    expect(await sqlState(mark(USER_A, slotId, utcDate(0), "done"))).toBe("ok");
    expect(await sqlState(mark(USER_A, slotId, utcDate(-7), "skipped"))).toBe("ok");
    expect(await sqlState(mark(USER_A, slotId, utcDate(-8), "done"))).toBe("PH409");
    expect(await sqlState(mark(USER_A, slotId, utcDate(1), "done"))).toBe("PH409");
  });

  it("is idempotent and Unmarked removes the record", async () => {
    await mark(USER_A, slotId, utcDate(-1), "done");
    await mark(USER_A, slotId, utcDate(-1), "done");
    const count = async () =>
      (await db.as(USER_A, "select 1 from public.finisher_session_marks where slot_id = $1 and session_date = $2", [slotId, utcDate(-1)])).length;
    expect(await count()).toBe(1);
    await mark(USER_A, slotId, utcDate(-1), "unmarked");
    await mark(USER_A, slotId, utcDate(-1), "unmarked");
    expect(await count()).toBe(0);
    expect(await sqlState(mark(USER_A, slotId, utcDate(-1), "maybe"))).toBe("PH422");
  });

  it("rejects dates that are not one of the slot's days", async () => {
    const today = isoWeekday(utcDate());
    const id = await createProject(USER_A, [{ activity: "Weekly", days: [today === 7 ? 1 : today + 1], durationMinutes: 30 }]);
    const [onlyTomorrow] = await slotIds(id);
    expect(await sqlState(mark(USER_A, onlyTomorrow, utcDate(), "done"))).toBe("PH409");
  });

  it("on a parked project, allows corrections only on dates when it was Active", async () => {
    await db.as(USER_A, "select public.finisher_project_action('UTC', $1, 'park', $2::date)", [projectId, utcDate(7)]);
    expect(await sqlState(mark(USER_A, slotId, utcDate(-3), "done"))).toBe("ok");
    // Today's record already exists, so it can still be corrected…
    expect(await sqlState(mark(USER_A, slotId, utcDate(0), "skipped"))).toBe("ok");
    // …but a new session today is not scheduled while parked.
    await mark(USER_A, slotId, utcDate(0), "unmarked");
    expect(await sqlState(mark(USER_A, slotId, utcDate(0), "done"))).toBe("PH409");
  });

  it("a project created today has no sessions on earlier dates", async () => {
    const id = await createProject(USER_A, [{ activity: "New", days: ALL_DAYS, durationMinutes: 30 }]);
    const [newSlot] = await slotIds(id);
    expect(await sqlState(mark(USER_A, newSlot, utcDate(-1), "done"))).toBe("PH409");
  });
});
