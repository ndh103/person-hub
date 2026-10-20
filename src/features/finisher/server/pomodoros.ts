import { POMODORO_MINUTES } from "../domain/pomodoro";
import { zonedToUtc } from "../domain/dates";
import type { PomodoroSummary } from "../types";
import type { FinisherContext } from "./context";
import { fromDbError } from "./errors";

/**
 * Pomodoro reads (FIN-039, FIN-040, ADR-0007). A session's state follows from
 * the clock: completed = not stopped and ended; running = not stopped and not
 * ended. "Today" is the caller's local date on which a session ended. RLS
 * limits every row to the caller.
 */

/** The window "today so far" as UTC instants, plus now. */
function todayWindow(ctx: FinisherContext) {
  const nowIso = new Date().toISOString();
  return { nowIso, dayStart: zonedToUtc(ctx.now.date, ctx.timeZone).toISOString() };
}

export async function getPomodoroSummary(ctx: FinisherContext): Promise<PomodoroSummary> {
  const { nowIso, dayStart } = todayWindow(ctx);
  const [running, completed] = await Promise.all([
    ctx.supabase
      .from("finisher_pomodoros")
      .select("id, task_id, started_at, ends_at")
      .is("stopped_at", null)
      .gt("ends_at", nowIso)
      .order("started_at", { ascending: false })
      .limit(1),
    ctx.supabase
      .from("finisher_pomodoros")
      .select("id", { count: "exact", head: true })
      .is("stopped_at", null)
      .gte("ends_at", dayStart)
      .lte("ends_at", nowIso),
  ]);
  if (running.error) throw fromDbError(running.error);
  if (completed.error) throw fromDbError(completed.error);

  const row = (running.data ?? [])[0] as { id: string; task_id: string | null; started_at: string; ends_at: string } | undefined;
  let taskTitle: string | null = null;
  if (row?.task_id) {
    const task = await ctx.supabase.from("finisher_tasks").select("title").eq("id", row.task_id).maybeSingle();
    if (task.error) throw fromDbError(task.error);
    taskTitle = (task.data as { title: string } | null)?.title ?? null;
  }
  const count = completed.count ?? 0;
  return {
    active: row
      ? {
          id: row.id,
          taskId: row.task_id,
          taskTitle,
          startedAt: new Date(row.started_at).toISOString(),
          endsAt: new Date(row.ends_at).toISOString(),
        }
      : null,
    today: { completed: count, minutes: count * POMODORO_MINUTES },
    serverNow: nowIso,
  };
}

/** Completed sessions for one task: ended today, and all time. */
export async function getTaskPomodoros(ctx: FinisherContext, taskId: string): Promise<{ today: number; total: number }> {
  const { nowIso, dayStart } = todayWindow(ctx);
  const base = () =>
    ctx.supabase
      .from("finisher_pomodoros")
      .select("id", { count: "exact", head: true })
      .eq("task_id", taskId)
      .is("stopped_at", null)
      .lte("ends_at", nowIso);
  const [today, total] = await Promise.all([base().gte("ends_at", dayStart), base()]);
  if (today.error) throw fromDbError(today.error);
  if (total.error) throw fromDbError(total.error);
  return { today: today.count ?? 0, total: total.count ?? 0 };
}
