import { MONTH_SHORT } from "@/lib/dates";
import { addDays, formatDate, isLocalDate, isoWeekday, startOfWeek, weekdayShort, type LocalDate, type LocalNow, type LocalTime } from "./dates";
import { isMissed, type SessionState } from "./schedule";

/**
 * Week tab rules (FIN-042 to FIN-048). A week runs Monday to Sunday in the
 * user's timezone (A2) and is named by its Monday. A task's day on the board
 * is its due date and its time is its due time (decision 34, FIN-048).
 */

/** Weeks further than this from today can't be shown (the due-date range, Fields and validation). */
export const WEEK_RANGE_YEARS = 5;

function shiftYears(date: LocalDate, years: number): LocalDate {
  const year = Number(date.slice(0, 4)) + years;
  const candidate = `${String(year).padStart(4, "0")}${date.slice(4)}`;
  // 29 February in a non-leap year becomes 28 February.
  return isLocalDate(candidate) ? candidate : addDays(`${String(year).padStart(4, "0")}${date.slice(4, 8)}01`, 27);
}

export function isWeekStart(value: unknown): value is LocalDate {
  return isLocalDate(value) && isoWeekday(value) === 1;
}

/** The earliest and latest Mondays that may be shown. */
export function weekLimits(today: LocalDate): { min: LocalDate; max: LocalDate } {
  return { min: startOfWeek(shiftYears(today, -WEEK_RANGE_YEARS)), max: startOfWeek(shiftYears(today, WEEK_RANGE_YEARS)) };
}

/**
 * A requested week: missing means the current week; anything that isn't a
 * Monday within range is null (the caller decides between "current" and an error).
 */
export function parseWeekStart(value: unknown, today: LocalDate): LocalDate | null {
  if (value === undefined || value === null || value === "") return startOfWeek(today);
  if (!isWeekStart(value)) return null;
  const { min, max } = weekLimits(today);
  return value >= min && value <= max ? value : null;
}

export function weekDates(start: LocalDate): LocalDate[] {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** "26 Oct – 1 Nov 2026", or "28 Dec 2026 – 3 Jan 2027" across a year (FIN-042). */
export function formatWeekRange(start: LocalDate): string {
  const end = addDays(start, 6);
  const first = start.slice(0, 4) === end.slice(0, 4) ? formatDayMonth(start) : formatDate(start);
  return `${first} – ${formatDate(end)}`;
}

function formatDayMonth(date: LocalDate): string {
  return `${Number(date.slice(8, 10))} ${MONTH_SHORT[Number(date.slice(5, 7)) - 1]}`;
}

/** "Mon 26 Oct": day headers and short captions. */
export function formatDayShort(date: LocalDate): string {
  return `${weekdayShort(isoWeekday(date))} ${formatDayMonth(date)}`;
}

/** "This week", "Next week", "Last week", or null for other weeks. */
export function weekLabel(start: LocalDate, today: LocalDate): string | null {
  const current = startOfWeek(today);
  if (start === current) return "This week";
  if (start === addDays(current, 7)) return "Next week";
  if (start === addDays(current, -7)) return "Last week";
  return null;
}

// ---------------------------------------------------------------------------
// Planning a task onto a day (FIN-044) and setting its time (FIN-048)
// ---------------------------------------------------------------------------

/** A board column: a day, or "unplanned" (no due date). */
export type PlanTarget = LocalDate | "unplanned";

/**
 * Whether an Open task can be put on `target`: not its own day, and never a
 * day before today (A25). Unplanned takes any task that has a date.
 */
export function canPlanOn(target: PlanTarget, task: { dueDate: LocalDate | null }, today: LocalDate): boolean {
  if (target === "unplanned") return task.dueDate !== null;
  return target >= today && target !== task.dueDate;
}

/**
 * The due time after a move: kept, except that it is cleared when moving to
 * Unplanned (A26) and when it has already passed on today (as A14).
 */
export function timeAfterMove(task: { dueTime: LocalTime | null }, date: LocalDate | null, now: LocalNow): LocalTime | null {
  if (date === null) return null;
  if (date === now.date && task.dueTime !== null && task.dueTime <= now.time) return null;
  return task.dueTime;
}

/** The hour buttons in Set time… (A32). */
export const SET_TIME_HOURS: readonly LocalTime[] = Array.from({ length: 16 }, (_, index) => `${String(index + 6).padStart(2, "0")}:00`);

/** Why an hour can't be chosen: the task's current time, or already past today. */
export function hourBlock(time: LocalTime, task: { dueDate: LocalDate | null; dueTime: LocalTime | null }, now: LocalNow): "current" | "past" | null {
  if (task.dueTime === time) return "current";
  if (task.dueDate === now.date && time <= now.time) return "past";
  return null;
}

/** Set time… is offered only for an Open task on today or a later day (FIN-048). */
export function canSetTime(task: { status: string; dueDate: LocalDate | null }, today: LocalDate): boolean {
  return task.status === "open" && task.dueDate !== null && task.dueDate >= today;
}

// ---------------------------------------------------------------------------
// Order within a day (decision 39)
// ---------------------------------------------------------------------------

export type DayEntry<S, T> = { kind: "session"; item: S } | { kind: "task"; item: T };

/**
 * Timed sessions and tasks together in time order (a session first on a tie,
 * tasks with the same time in the user's order), then untimed sessions, then
 * untimed tasks in the user's order. `tasks` must already be in the user's
 * order (FIN-038) and `sessions` in their usual order.
 */
export function orderDayItems<S extends { startTime: LocalTime | null }, T extends { dueTime: LocalTime | null }>(
  sessions: S[],
  tasks: T[],
): DayEntry<S, T>[] {
  const timed: { time: LocalTime; rank: number; entry: DayEntry<S, T> }[] = [];
  const untimedSessions: DayEntry<S, T>[] = [];
  const untimedTasks: DayEntry<S, T>[] = [];
  sessions.forEach((item, index) => {
    if (item.startTime) timed.push({ time: item.startTime, rank: index, entry: { kind: "session", item } });
    else untimedSessions.push({ kind: "session", item });
  });
  tasks.forEach((item, index) => {
    if (item.dueTime) timed.push({ time: item.dueTime, rank: sessions.length + index, entry: { kind: "task", item } });
    else untimedTasks.push({ kind: "task", item });
  });
  timed.sort((a, b) => (a.time === b.time ? a.rank - b.rank : a.time < b.time ? -1 : 1));
  return [...timed.map((entry) => entry.entry), ...untimedSessions, ...untimedTasks];
}

// ---------------------------------------------------------------------------
// Counts (FIN-043, FIN-047)
// ---------------------------------------------------------------------------

export type BoardSession = { date: LocalDate; state: SessionState };

/** A session the user can still act on: unmarked, and not yet Missed. */
export function isSessionToDo(session: BoardSession, today: LocalDate): boolean {
  return session.state === "unmarked" && !isMissed(session, today);
}

/** "3 to do" in a day header: open tasks plus unmarked sessions in the marking window or later. */
export function dayToDoCount(day: { open: unknown[]; sessions: BoardSession[] }, today: LocalDate): number {
  return day.open.length + day.sessions.filter((session) => isSessionToDo(session, today)).length;
}

export type WeekBoardSummary = { planned: number; done: number; sessionsDone: number; sessionsScheduled: number };

/**
 * "9 tasks planned · 3 done · Sessions 4 of 9 done" (FIN-043). `open` counts
 * every open task due in the week, including those shown as carried over.
 */
export function summarizeBoard(input: { open: number; finished: number; sessions: { state: SessionState }[] }): WeekBoardSummary {
  return {
    planned: input.open + input.finished,
    done: input.finished,
    sessionsDone: input.sessions.filter((session) => session.state === "done").length,
    sessionsScheduled: input.sessions.length,
  };
}
