import { addDays, eachDate, isoWeekday, startOfWeek, type LocalDate, type LocalTime } from "./dates";

/**
 * Session schedule (FIN-026) and weekly follow-through (FIN-028), computed
 * from the stored history. The database applies the same schedule rule when a
 * session is marked (finisher_private.is_scheduled); keep the two in step.
 */
export type SessionState = "done" | "skipped" | "unmarked";

export type SlotVersion = {
  slotId: string;
  validFrom: LocalDate;
  /** Exclusive; null while the version is current. */
  validTo: LocalDate | null;
  activity: string;
  days: number[];
  durationMinutes: number;
  startTime: LocalTime | null;
};

/** A date range when the project was Active: [start, end), end null = still active. */
export type ActivePeriod = { start: LocalDate; end: LocalDate | null };

export type SessionMark = { slotId: string; date: LocalDate; state: "done" | "skipped" };

export type ScheduledSession = {
  slotId: string;
  date: LocalDate;
  activity: string;
  durationMinutes: number;
  startTime: LocalTime | null;
  state: SessionState;
};

/** Marking window: today and the 7 previous local dates (assumption A3). */
export const MARKING_WINDOW_DAYS = 7;

const covers = (from: LocalDate, to: LocalDate | null, date: LocalDate) => from <= date && (to === null || date < to);

/**
 * Sessions of one project's slots between `from` and `to` (inclusive), by date
 * then slot order. A session is scheduled when a slot version covering the
 * date includes its weekday and the project was Active that day. A recorded
 * mark always counts as a session, so edits never erase marked history (FIN-025).
 */
export function listSessions(input: {
  versions: SlotVersion[];
  periods: ActivePeriod[];
  marks: SessionMark[];
  from: LocalDate;
  to: LocalDate;
}): ScheduledSession[] {
  const { versions, periods, marks, from, to } = input;
  const markByKey = new Map(marks.map((mark) => [`${mark.slotId}|${mark.date}`, mark.state]));
  const slotIds = [...new Set(versions.map((version) => version.slotId))];
  const sessions: ScheduledSession[] = [];

  for (const date of eachDate(from, to)) {
    const active = periods.some((period) => covers(period.start, period.end, date));
    const weekday = isoWeekday(date);
    for (const slotId of slotIds) {
      const key = `${slotId}|${date}`;
      const marked = markByKey.get(key);
      const slotVersions = versions.filter((version) => version.slotId === slotId);
      const version = slotVersions.find((candidate) => covers(candidate.validFrom, candidate.validTo, date));
      const scheduled = active && version !== undefined && version.days.includes(weekday);
      if (!scheduled && !marked) continue;
      const shown = version ?? nearestVersion(slotVersions, date);
      sessions.push({
        slotId,
        date,
        activity: shown.activity,
        durationMinutes: shown.durationMinutes,
        startTime: shown.startTime,
        state: marked ?? "unmarked",
      });
    }
  }
  return sessions;
}

function nearestVersion(versions: SlotVersion[], date: LocalDate): SlotVersion {
  const earlier = versions.filter((version) => version.validFrom <= date).sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1));
  return earlier[0] ?? versions[0];
}

/** Timed sessions first by start time, then untimed (FIN-031). */
export function compareSessions(a: { startTime: LocalTime | null; activity: string }, b: typeof a): number {
  if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime) || a.activity.localeCompare(b.activity);
  if (a.startTime) return -1;
  if (b.startTime) return 1;
  return a.activity.localeCompare(b.activity);
}

export function isInMarkingWindow(date: LocalDate, today: LocalDate): boolean {
  return date <= today && date >= addDays(today, -MARKING_WINDOW_DAYS);
}

/** Unmarked sessions become Missed once their date leaves the marking window (FIN-027). */
export function isMissed(session: { date: LocalDate; state: SessionState }, today: LocalDate): boolean {
  return session.state === "unmarked" && session.date < addDays(today, -MARKING_WINDOW_DAYS);
}

export type WeekSummary = {
  weekStart: LocalDate;
  scheduled: number;
  done: number;
  skipped: number;
  missed: number;
  /** Past, unmarked, still inside the marking window. */
  unmarked: number;
  /** Today or later this week, unmarked. */
  remaining: number;
};

export function summarizeWeek(sessions: ScheduledSession[], weekStart: LocalDate, today: LocalDate): WeekSummary {
  const summary: WeekSummary = { weekStart, scheduled: 0, done: 0, skipped: 0, missed: 0, unmarked: 0, remaining: 0 };
  const weekEnd = addDays(weekStart, 6);
  for (const session of sessions) {
    if (session.date < weekStart || session.date > weekEnd) continue;
    summary.scheduled += 1;
    if (session.state === "done") summary.done += 1;
    else if (session.state === "skipped") summary.skipped += 1;
    else if (session.date >= today) summary.remaining += 1;
    else if (isMissed(session, today)) summary.missed += 1;
    else summary.unmarked += 1;
  }
  return summary;
}

/** The current week and the `previous` weeks before it, newest first (FIN-028). */
export function weekStarts(today: LocalDate, previous: number): LocalDate[] {
  const current = startOfWeek(today);
  return Array.from({ length: previous + 1 }, (_, index) => addDays(current, -7 * index));
}

/** "5 of 6 sessions this week", or "No sessions scheduled" (never 0%). */
export function formatWeekRate(summary: WeekSummary, label = "this week"): string {
  if (summary.scheduled === 0) return "No sessions scheduled";
  const noun = summary.scheduled === 1 ? "session" : "sessions";
  return `${summary.done} of ${summary.scheduled} ${noun} ${label}`.trim();
}

/** Secondary counts as text, so nothing relies on colour (FIN-028). */
export function formatWeekDetails(summary: WeekSummary): string {
  if (summary.scheduled === 0) return "";
  const parts = [`${summary.skipped} skipped`, `${summary.missed} missed`];
  if (summary.unmarked) parts.push(`${summary.unmarked} unmarked`);
  if (summary.remaining) parts.push(`${summary.remaining} remaining`);
  return parts.join(" · ");
}
