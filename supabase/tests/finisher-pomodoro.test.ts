import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, USER_A, USER_B, utcDate, type TestDb } from "../../tests/support/supabase-db";

/**
 * FIN-039 and FIN-040 in the database (ADR-0007): ownership, one running
 * session, Stop and Switch, and completion derived from the clock. Every call
 * runs as the caller's role and JWT claims; time is simulated by moving a
 * session's timestamps back with the admin connection (fixtures only).
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

async function createTask(userId: string, title = "Task") {
  const rows = await db.as<{ id: string }>(userId, "select public.finisher_create_task('UTC', $1) as id", [title]);
  return rows[0].id;
}

async function start(userId: string, taskId: string, replace = false) {
  const rows = await db.as<{ id: string }>(userId, "select public.finisher_start_pomodoro($1, $2) as id", [taskId, replace]);
  return rows[0].id;
}

function stop(userId: string, id: string) {
  return db.as(userId, "select public.finisher_stop_pomodoro($1)", [id]);
}

/** Moves a session `minutes` into the past (as if it started that long ago). */
async function age(id: string, minutes: number) {
  await db.admin.query(
    `update public.finisher_pomodoros
        set started_at = started_at - make_interval(mins => $2), ends_at = ends_at - make_interval(mins => $2),
            stopped_at = stopped_at - make_interval(mins => $2)
      where id = $1`,
    [id, minutes],
  );
}

type Row = { id: string; task_id: string | null; state: string };

/** The caller's sessions with their derived state, as the API reads them. */
async function sessions(userId: string): Promise<Row[]> {
  return db.as<Row>(
    userId,
    `select id, task_id,
            case when stopped_at is not null then 'abandoned' when ends_at <= now() then 'completed' else 'running' end as state
       from public.finisher_pomodoros order by started_at`,
  );
}

beforeAll(async () => {
  db = await createTestDb();
}, 60_000);

beforeEach(async () => {
  await db.admin.query("delete from public.finisher_pomodoros");
  await db.admin.query("delete from public.finisher_tasks");
});

describe("privileges", () => {
  it("anonymous callers cannot read or start sessions", async () => {
    const task = await createTask(USER_A);
    expect(await sqlState(db.as(null, "select * from public.finisher_pomodoros"))).toBe("42501");
    expect(await sqlState(db.as(null, "select public.finisher_start_pomodoro($1)", [task]))).toBe("42501");
    expect(await sqlState(db.as(null, "select public.finisher_stop_pomodoro(gen_random_uuid())"))).toBe("42501");
  });

  it("signed-in users cannot write the table directly or call the lock helper", async () => {
    const task = await createTask(USER_A);
    expect(
      await sqlState(
        db.as(USER_A, "insert into public.finisher_pomodoros (user_id, task_id, started_at, ends_at) values ($1, $2, now() - interval '25 minutes', now())", [
          USER_A,
          task,
        ]),
      ),
    ).toBe("42501");
    expect(await sqlState(db.as(USER_A, "update public.finisher_pomodoros set stopped_at = null"))).toBe("42501");
    expect(await sqlState(db.as(USER_A, "delete from public.finisher_pomodoros"))).toBe("42501");
    expect(await sqlState(db.as(USER_A, "select finisher_private.lock_pomodoro($1)", [USER_A]))).toBe("42501");
  });
});

describe("ownership (FIN-017)", () => {
  it("another user cannot start a session on the owner's task, stop the owner's session, or read it", async () => {
    const task = await createTask(USER_A, "A's task");
    const id = await start(USER_A, task);
    expect(await sqlState(start(USER_B, task))).toBe("PH404");
    expect(await sqlState(stop(USER_B, id))).toBe("PH404");
    expect(await sessions(USER_B)).toEqual([]);
    expect(await sessions(USER_A)).toEqual([{ id, task_id: task, state: "running" }]);
  });

  it("the owner and start time come from the session and the database clock, not from input", async () => {
    const task = await createTask(USER_A);
    const id = await start(USER_A, task);
    const rows = await db.admin.query<{ user_id: string; minutes: number; fresh: boolean }>(
      `select user_id, extract(epoch from ends_at - started_at)::int / 60 as minutes,
              abs(extract(epoch from now() - started_at)) < 5 as fresh
         from public.finisher_pomodoros where id = $1`,
      [id],
    );
    expect(rows.rows[0]).toEqual({ user_id: USER_A, minutes: 25, fresh: true });
  });
});

describe("one session at a time, Stop and Switch (FIN-039)", () => {
  it("refuses a second session unless replacing; replace abandons the first", async () => {
    const first = await createTask(USER_A, "First");
    const second = await createTask(USER_A, "Second");
    const a = await start(USER_A, first);
    expect(await sqlState(start(USER_A, second))).toBe("PH409");
    expect(await sqlState(start(USER_A, first))).toBe("PH409");
    const b = await start(USER_A, second, true);
    expect(await sessions(USER_A)).toEqual([
      { id: a, task_id: first, state: "abandoned" },
      { id: b, task_id: second, state: "running" },
    ]);
  });

  it("each user has their own running session", async () => {
    await start(USER_A, await createTask(USER_A));
    expect(await sqlState(start(USER_B, await createTask(USER_B)))).toBe("ok");
  });

  it("only Open tasks can start a session (A18)", async () => {
    const task = await createTask(USER_A);
    await db.as(USER_A, "select public.finisher_task_action('UTC', $1, 'park', $2::date)", [task, utcDate(3)]);
    expect(await sqlState(start(USER_A, task))).toBe("PH409");
    await db.as(USER_A, "select public.finisher_task_action('UTC', $1, 'done')", [task]);
    expect(await sqlState(start(USER_A, task))).toBe("PH409");
  });

  it("Stop abandons a running session; a stopped or completed one can't be stopped", async () => {
    const task = await createTask(USER_A);
    const a = await start(USER_A, task);
    await stop(USER_A, a);
    expect(await sqlState(stop(USER_A, a))).toBe("PH409");
    expect((await sessions(USER_A))[0].state).toBe("abandoned");

    const b = await start(USER_A, task);
    await age(b, 25);
    expect((await sessions(USER_A)).find((row) => row.id === b)?.state).toBe("completed");
    expect(await sqlState(stop(USER_A, b))).toBe("PH409");
    expect(await sqlState(stop(USER_A, "00000000-0000-4000-8000-000000000009"))).toBe("PH404");
  });

  it("a session that ran out without Stop counts as completed, and a new one can start (A20)", async () => {
    const task = await createTask(USER_A);
    const a = await start(USER_A, task);
    await age(a, 30);
    const b = await start(USER_A, task);
    expect((await sessions(USER_A)).map((row) => [row.id, row.state])).toEqual([
      [a, "completed"],
      [b, "running"],
    ]);
  });
});

describe("deleting a task (A19)", () => {
  it("keeps completed sessions unlinked and abandons the running one", async () => {
    const task = await createTask(USER_A);
    const done = await start(USER_A, task);
    await age(done, 26);
    const running = await start(USER_A, task);
    await db.as(USER_A, "select public.finisher_delete_task($1)", [task]);
    expect(await sessions(USER_A)).toEqual([
      { id: done, task_id: null, state: "completed" },
      { id: running, task_id: null, state: "abandoned" },
    ]);
  });

  it("deleting another user's task still says not found and touches nothing", async () => {
    const task = await createTask(USER_A);
    const id = await start(USER_A, task);
    expect(await sqlState(db.as(USER_B, "select public.finisher_delete_task($1)", [task]))).toBe("PH404");
    expect(await sessions(USER_A)).toEqual([{ id, task_id: task, state: "running" }]);
  });
});
