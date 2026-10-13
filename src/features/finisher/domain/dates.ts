/**
 * Local calendar helpers. A LocalDate ("YYYY-MM-DD") is a date-only value in
 * the user's timezone, never a UTC timestamp (CLAUDE.md, business rules).
 * Arithmetic runs on UTC midnights so it is free of DST shifts.
 */
import { formatDate, isLocalDate, MONTH_SHORT, type LocalDate } from "@/lib/dates";

// Shared with other features (src/lib/dates.ts).
export { formatDate, isLocalDate, type LocalDate };

/** Local wall-clock time "HH:MM". */
export type LocalTime = string;

export type LocalNow = { date: LocalDate; time: LocalTime };

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MS = 86_400_000;

export const DEFAULT_TIME_ZONE = "UTC";

export function isLocalTime(value: unknown): value is LocalTime {
  return typeof value === "string" && TIME_RE.test(value);
}

/** Postgres returns "HH:MM:SS"; the app works with "HH:MM". */
export function toLocalTime(value: string | null | undefined): LocalTime | null {
  return value ? value.slice(0, 5) : null;
}

function toUtcMs(date: LocalDate): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function fromUtcMs(ms: number): LocalDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: LocalDate): number {
  const day = new Date(toUtcMs(date)).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Monday of the week containing `date` (assumption A2). */
export function startOfWeek(date: LocalDate): LocalDate {
  return addDays(date, 1 - isoWeekday(date));
}

/** Monday of the following week: the "Next week" due-date shortcut (FIN-034, decision 11). */
export function startOfNextWeek(date: LocalDate): LocalDate {
  return addDays(startOfWeek(date), 7);
}

export function* eachDate(from: LocalDate, to: LocalDate): Generator<LocalDate> {
  for (let date = from; date <= to; date = addDays(date, 1)) yield date;
}

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    seconds: Number(get("second")),
  };
}

export function zonedNow(timeZone: string, now: Date = new Date()): LocalNow {
  const { date, time } = zonedParts(now, timeZone);
  return { date, time };
}

/** The local date of a UTC instant (for example a task's done time). */
export function localDateOf(instant: string | Date, timeZone: string): LocalDate {
  return zonedParts(typeof instant === "string" ? new Date(instant) : instant, timeZone).date;
}

/** The UTC instant of a local date and time in `timeZone` (start of day by default). */
export function zonedToUtc(date: LocalDate, timeZone: string, time: LocalTime = "00:00"): Date {
  const target = Date.parse(`${date}T${time}:00Z`);
  let guess = target;
  // Two passes settle the offset, including across DST changes.
  for (let i = 0; i < 2; i += 1) {
    const parts = zonedParts(new Date(guess), timeZone);
    const shown = Date.parse(`${parts.date}T${parts.time}:${String(parts.seconds).padStart(2, "0")}Z`);
    guess += target - shown;
  }
  return new Date(guess);
}

/**
 * Business rule "Overdue": a dated task without a time is overdue once its
 * local date has ended; with a time, once that local moment has passed.
 */
export function isOverdue(dueDate: LocalDate | null, dueTime: LocalTime | null, now: LocalNow): boolean {
  if (!dueDate) return false;
  if (dueDate < now.date) return true;
  return dueDate === now.date && dueTime !== null && dueTime <= now.time;
}

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function weekdayShort(day: number): string {
  return WEEKDAY_SHORT[day - 1] ?? "";
}

export function weekdayLong(day: number): string {
  return WEEKDAY_LONG[day - 1] ?? "";
}

/** "Monday 12 Oct": the caption on the due-date shortcut buttons (FIN-034). */
export function formatWeekdayDate(date: LocalDate): string {
  const month = Number(date.slice(5, 7)) - 1;
  const day = Number(date.slice(8, 10));
  return `${weekdayLong(isoWeekday(date))} ${day} ${MONTH_SHORT[month]}`;
}

/** Relative wording: "Today", "Tomorrow", "Yesterday", otherwise "12 Oct 2026". */
export function formatRelativeDate(date: LocalDate, today: LocalDate): string {
  const delta = diffDays(today, date);
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  return formatDate(date);
}

/** "Mon · Wed · Fri", or "Every day". */
export function formatDays(days: number[]): string {
  if (days.length === 7) return "Every day";
  return [...days].sort((a, b) => a - b).map(weekdayShort).join(" · ");
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
