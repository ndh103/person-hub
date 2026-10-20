import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinisherContext } from "@/features/finisher/server/context";
import { getFinisherBasics } from "@/features/finisher/server/queries";

/**
 * FIN-035 tab counts, from the real service function over a table-backed
 * Supabase stub. Today is Tuesday 13 Oct 2026 (ISO weekday 2).
 */
const TODAY = "2026-10-13";
const ACTIVE = "00000000-0000-4000-8000-0000000000a1";
const PARKED = "00000000-0000-4000-8000-0000000000a2";

const TABLES: Record<string, unknown[]> = {
  finisher_projects: [
    { id: ACTIVE, title: "Teach English", status: "active", revisit_date: null },
    { id: PARKED, title: "Garage", status: "parked", revisit_date: "2026-11-01" },
  ],
  finisher_slots: [
    { id: "slot-unmarked", project_id: ACTIVE, removed_on: null, created_at: "2026-10-01T00:00:00Z" },
    { id: "slot-done", project_id: ACTIVE, removed_on: null, created_at: "2026-10-01T00:00:01Z" },
    { id: "slot-skipped", project_id: ACTIVE, removed_on: null, created_at: "2026-10-01T00:00:02Z" },
    { id: "slot-other-day", project_id: ACTIVE, removed_on: null, created_at: "2026-10-01T00:00:03Z" },
  ],
  finisher_project_periods: [{ project_id: ACTIVE, start_on: "2026-10-01", end_on: null }],
  finisher_slot_versions: ["slot-unmarked", "slot-done", "slot-skipped", "slot-other-day"].map((slot) => ({
    slot_id: slot,
    valid_from: "2026-10-01",
    valid_to: null,
    activity: slot,
    days: slot === "slot-other-day" ? [3] : [2],
    duration_minutes: 30,
    start_time: null,
  })),
  finisher_session_marks: [
    { slot_id: "slot-done", session_date: TODAY, state: "done" },
    { slot_id: "slot-skipped", session_date: TODAY, state: "skipped" },
  ],
};

/** One running Pomodoro and 3 completed today (FIN-039, FIN-040). */
const RUNNING = { id: "pomo-1", task_id: "task-1", started_at: "2026-10-13T08:50:00Z", ends_at: "2026-10-13T09:15:00Z" };

/** Head counts for finisher_tasks: open tasks, and those due today or overdue (filtered with lte). */
const TASK_COUNTS = { open: 5, dueOrOverdue: 2 };

function stubSupabase(): SupabaseClient {
  return {
    from(table: string) {
      let dueFilter = false;
      let head = false;
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "in", "lte", "gte", "gt", "is", "or", "order", "limit", "not"]) {
        builder[method] = (...args: unknown[]) => {
          if (method === "lte" && args[0] === "due_date") dueFilter = true;
          if (method === "select" && (args[1] as { head?: boolean } | undefined)?.head) head = true;
          return builder;
        };
      }
      builder.maybeSingle = () => Promise.resolve({ data: { title: "Paperwork" }, error: null });
      builder.then = (resolve: (value: unknown) => unknown) =>
        resolve(
          table === "finisher_tasks"
            ? { data: null, error: null, count: dueFilter ? TASK_COUNTS.dueOrOverdue : TASK_COUNTS.open }
            : table === "finisher_pomodoros"
              ? head
                ? { data: null, error: null, count: 3 }
                : { data: [RUNNING], error: null }
              : { data: TABLES[table] ?? [], error: null },
        );
      return builder;
    },
  } as unknown as SupabaseClient;
}

describe("Finisher tab counts (FIN-035)", () => {
  it("counts unmarked sessions today plus due or overdue tasks, open tasks, and active projects", async () => {
    const ctx: FinisherContext = {
      user: { id: "00000000-0000-4000-8000-00000000000a", email: null },
      supabase: stubSupabase(),
      timeZone: "UTC",
      now: { date: TODAY, time: "09:00" },
    };
    const basics = await getFinisherBasics(ctx);
    // Today: 1 unmarked session (done, skipped and another weekday's slot are not counted) + 2 due or overdue tasks.
    expect(basics.counts).toEqual({ today: 3, tasks: 5, projects: 1 });
    expect(basics.today).toBe(TODAY);
    expect(basics.projects.map((project) => project.id).sort()).toEqual([ACTIVE, PARKED]);
    // FIN-039/040: the running session with its task title, today's count in minutes, and the server clock.
    expect(basics.pomodoro.active).toEqual({
      id: "pomo-1",
      taskId: "task-1",
      taskTitle: "Paperwork",
      startedAt: "2026-10-13T08:50:00.000Z",
      endsAt: "2026-10-13T09:15:00.000Z",
    });
    expect(basics.pomodoro.today).toEqual({ completed: 3, minutes: 75 });
    expect(Number.isNaN(Date.parse(basics.pomodoro.serverNow))).toBe(false);
  });
});
