import { addDays, startOfNextWeek, type LocalDate, type LocalNow, type LocalTime } from "./dates";

/**
 * Due-date shortcuts: the Today / Tomorrow / Next week buttons in the task
 * form (FIN-034) and the same three items in a task's menu (FIN-037). All
 * dates are local dates in the user's timezone (assumption A1).
 */
export type QuickDueKind = "today" | "tomorrow" | "nextWeek";

export const QUICK_DUE_KINDS: readonly QuickDueKind[] = ["today", "tomorrow", "nextWeek"];

export const QUICK_DUE_LABELS: Record<QuickDueKind, string> = { today: "Today", tomorrow: "Tomorrow", nextWeek: "Next week" };

/** Today; the next local date; or the Monday of next week (decision 11). */
export function quickDueDate(kind: QuickDueKind, today: LocalDate): LocalDate {
  if (kind === "today") return today;
  if (kind === "tomorrow") return addDays(today, 1);
  return startOfNextWeek(today);
}

export type QuickDueChoice = {
  kind: QuickDueKind;
  date: LocalDate;
  time: LocalTime | null;
  /** The task already has exactly this date and time: the menu shows it as current and disabled. */
  current: boolean;
};

/**
 * What a menu item would save for a task (FIN-037). The due time is kept
 * (A14), except that Today clears a time that has already passed today, so the
 * task is not overdue the moment it is rescheduled (decision 22). An item is
 * "current" only when choosing it would change nothing, which keeps Today
 * enabled for a task due today at a passed time.
 */
export function quickDueChoice(
  kind: QuickDueKind,
  task: { dueDate: LocalDate | null; dueTime: LocalTime | null },
  now: LocalNow,
): QuickDueChoice {
  const date = quickDueDate(kind, now.date);
  const time = date === now.date && task.dueTime !== null && task.dueTime <= now.time ? null : task.dueTime;
  return { kind, date, time, current: task.dueDate === date && task.dueTime === time };
}
