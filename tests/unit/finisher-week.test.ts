import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { parseDueChanges, parseWeeklyNote } from "@/features/finisher/domain/validation";
import {
  canPlanOn,
  canSetTime,
  dayToDoCount,
  formatDayShort,
  formatWeekRange,
  hourBlock,
  isWeekendDay,
  orderDayItems,
  parseWeekStart,
  SET_TIME_HOURS,
  summarizeBoard,
  timeAfterMove,
  weekendItemCount,
  weekLabel,
} from "@/features/finisher/domain/week";
import type { FinisherContext } from "@/features/finisher/server/context";
import { getWeek, getWeekReview } from "@/features/finisher/server/queries";
import { tableStub } from "../support/table-stub";

/** Wednesday 28 Oct 2026, 14:30 in the user's zone; the week starts Monday 26 Oct. */
const NOW = { date: "2026-10-28", time: "14:30" };
const MONDAY = "2026-10-26";

describe("week dates and labels (FIN-042)", () => {
  it("accepts only Mondays within 5 years, and defaults to this week", () => {
    expect(parseWeekStart(undefined, NOW.date)).toBe(MONDAY);
    expect(parseWeekStart("", NOW.date)).toBe(MONDAY);
    expect(parseWeekStart("2026-11-02", NOW.date)).toBe("2026-11-02");
    expect(parseWeekStart("2026-10-27", NOW.date)).toBeNull(); // a Tuesday
    expect(parseWeekStart("2026-02-30", NOW.date)).toBeNull();
    expect(parseWeekStart("2031-11-03", NOW.date)).toBeNull(); // more than 5 years ahead
    expect(parseWeekStart("2021-10-25", NOW.date)).toBe("2021-10-25");
    expect(parseWeekStart("2021-10-18", NOW.date)).toBeNull();
  });

  it("formats ranges, crossing a month and a year", () => {
    expect(formatWeekRange(MONDAY)).toBe("26 Oct – 1 Nov 2026");
    expect(formatWeekRange("2026-12-28")).toBe("28 Dec 2026 – 3 Jan 2027");
    expect(formatDayShort("2026-10-26")).toBe("Mon 26 Oct");
  });

  it("labels this, next and last week only", () => {
    expect(weekLabel(MONDAY, NOW.date)).toBe("This week");
    expect(weekLabel("2026-11-02", NOW.date)).toBe("Next week");
    expect(weekLabel("2026-10-19", NOW.date)).toBe("Last week");
    expect(weekLabel("2026-11-09", NOW.date)).toBeNull();
    // On Sunday the week is still the one that started on Monday (A2).
    expect(weekLabel(MONDAY, "2026-11-01")).toBe("This week");
  });
});

describe("weekend (decision 41, A34)", () => {
  it("knows Saturday and Sunday, and counts what is on them", () => {
    expect(["2026-10-30", "2026-10-31", "2026-11-01"].map(isWeekendDay)).toEqual([false, true, true]);
    const day = (date: string, items: number) => ({ date, open: Array(items).fill(0), finished: [], sessions: [] });
    expect(weekendItemCount([day("2026-10-30", 4), day("2026-10-31", 1), { ...day("2026-11-01", 1), sessions: [0] }])).toBe(3);
  });
});

describe("planning onto a day (FIN-044, A25, A26)", () => {
  it("refuses the task's own day and past days; Unplanned takes only dated tasks", () => {
    const task = { dueDate: "2026-10-29" };
    expect(canPlanOn("2026-10-29", task, NOW.date)).toBe(false);
    expect(canPlanOn("2026-10-27", task, NOW.date)).toBe(false);
    expect(canPlanOn(NOW.date, task, NOW.date)).toBe(true);
    expect(canPlanOn("2026-11-02", task, NOW.date)).toBe(true);
    expect(canPlanOn("unplanned", task, NOW.date)).toBe(true);
    expect(canPlanOn("unplanned", { dueDate: null }, NOW.date)).toBe(false);
  });

  it("keeps the time, except on Unplanned and a time already passed today", () => {
    expect(timeAfterMove({ dueTime: "09:00" }, "2026-10-30", NOW)).toBe("09:00");
    expect(timeAfterMove({ dueTime: "09:00" }, NOW.date, NOW)).toBeNull();
    expect(timeAfterMove({ dueTime: "16:00" }, NOW.date, NOW)).toBe("16:00");
    expect(timeAfterMove({ dueTime: "16:00" }, null, NOW)).toBeNull();
  });
});

describe("Set time (FIN-048, A32)", () => {
  it("offers 06:00 to 21:00 and blocks the current time and past hours today", () => {
    expect(SET_TIME_HOURS[0]).toBe("06:00");
    expect(SET_TIME_HOURS.at(-1)).toBe("21:00");
    expect(SET_TIME_HOURS).toHaveLength(16);
    const today = { dueDate: NOW.date, dueTime: "17:00" };
    expect(hourBlock("14:00", today, NOW)).toBe("past");
    expect(hourBlock("15:00", today, NOW)).toBeNull();
    expect(hourBlock("17:00", today, NOW)).toBe("current");
    expect(hourBlock("06:00", { dueDate: "2026-10-29", dueTime: null }, NOW)).toBeNull();
  });

  it("is offered for open tasks on today or later only", () => {
    expect(canSetTime({ status: "open", dueDate: NOW.date }, NOW.date)).toBe(true);
    expect(canSetTime({ status: "open", dueDate: "2026-10-27" }, NOW.date)).toBe(false); // carried over
    expect(canSetTime({ status: "open", dueDate: null }, NOW.date)).toBe(false);
    expect(canSetTime({ status: "done", dueDate: NOW.date }, NOW.date)).toBe(false);
  });
});

describe("order within a day (decision 39)", () => {
  const session = (name: string, startTime: string | null) => ({ name, startTime });
  const task = (name: string, dueTime: string | null) => ({ name, dueTime });
  const names = (entries: { item: { name: string } }[]) => entries.map((entry) => entry.item.name);

  it("interleaves timed sessions and tasks by time, then untimed sessions, then untimed tasks", () => {
    const entries = orderDayItems(
      [session("Watch ABK", "19:00"), session("Learn together", null), session("Chords", "07:30")],
      [task("Boots", "09:00"), task("Untimed A", null), task("Paperwork", "17:00"), task("Untimed B", null)],
    );
    expect(names(entries)).toEqual(["Chords", "Boots", "Paperwork", "Watch ABK", "Learn together", "Untimed A", "Untimed B"]);
  });

  it("puts a session first on a tie, and keeps the user's order among tasks with the same time", () => {
    const entries = orderDayItems([session("Chords", "07:30")], [task("Second", "07:30"), task("Third", "07:30")]);
    expect(names(entries)).toEqual(["Chords", "Second", "Third"]);
  });
});

describe("counts (FIN-043)", () => {
  it("counts open tasks plus unmarked sessions that are not yet Missed", () => {
    const sessions = [
      { date: NOW.date, state: "unmarked" as const },
      { date: NOW.date, state: "done" as const },
      { date: "2026-10-19", state: "unmarked" as const }, // more than 7 days back: Missed
    ];
    expect(dayToDoCount({ open: [1, 2], sessions }, NOW.date)).toBe(3);
  });

  it("summarises planned, done and sessions for the week", () => {
    expect(summarizeBoard({ open: 6, finished: 3, sessions: [{ state: "done" }, { state: "unmarked" }] })).toEqual({
      planned: 9,
      done: 3,
      sessionsDone: 1,
      sessionsScheduled: 2,
    });
  });
});

describe("parsing week writes", () => {
  it("parses a weekly note: trimmed, empty means remove, at most 2000 characters", () => {
    expect(parseWeeklyNote({ note: "  ok " })).toEqual({ ok: true, value: { note: "ok" } });
    expect(parseWeeklyNote({ note: "" })).toEqual({ ok: true, value: { note: null } });
    expect(parseWeeklyNote({})).toEqual({ ok: true, value: { note: null } });
    expect(parseWeeklyNote({ note: "é".repeat(2000) }).ok).toBe(true);
    expect(parseWeeklyNote({ note: "x".repeat(2001) })).toEqual({ ok: false, errors: { note: "too_long" } });
  });

  it("parses due changes with the single-change rules", () => {
    const id = "8B0B2A8E-0D6F-4A53-9A43-1F2E4B8C9D10";
    expect(parseDueChanges({ changes: [{ id, dueDate: NOW.date, dueTime: "09:00:00", extra: 1 }] }, NOW.date)).toEqual({
      ok: true,
      value: { changes: [{ id: id.toLowerCase(), dueDate: NOW.date, dueTime: "09:00" }] },
    });
    // Duplicates are refused even when they differ only in letter case.
    expect(parseDueChanges({ changes: [{ id }, { id: id.toLowerCase() }] }, NOW.date).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Service functions over an in-memory table stub
// ---------------------------------------------------------------------------

const EN = "00000000-0000-4000-8000-0000000000e1";
const GT = "00000000-0000-4000-8000-0000000000e2";

const task = (id: string, status: string, due: string | null, extra: Record<string, unknown> = {}) => ({
  id,
  title: id,
  status,
  due_date: due,
  due_time: null,
  revisit_date: null,
  project_id: null,
  close_note: null,
  closed_at: null,
  ...extra,
});

const TABLES = {
  finisher_projects: [
    { id: EN, title: "English", status: "active", revisit_date: null, created_at: "2026-10-01T00:00:00Z" },
    // Parked from 28 Oct; due for revisit (FIN-013).
    { id: GT, title: "Guitar", status: "parked", revisit_date: "2026-10-27", created_at: "2026-10-01T00:00:01Z" },
  ],
  finisher_project_periods: [
    { project_id: EN, start_on: "2026-10-01", end_on: null },
    { project_id: GT, start_on: "2026-10-01", end_on: "2026-10-28" },
  ],
  finisher_slots: [
    { id: "s1", project_id: EN, removed_on: null, created_at: "2026-10-01T00:00:00Z" },
    { id: "s3", project_id: GT, removed_on: null, created_at: "2026-10-01T00:00:00Z" },
  ],
  finisher_slot_versions: [
    { slot_id: "s1", valid_from: "2026-10-01", valid_to: null, activity: "Watch ABK", days: [1, 3, 5], duration_minutes: 30, start_time: "19:00:00" },
    { slot_id: "s3", valid_from: "2026-10-01", valid_to: null, activity: "Chords", days: [2, 4, 6], duration_minutes: 20, start_time: "07:30:00" },
  ],
  finisher_session_marks: [{ slot_id: "s1", session_date: "2026-10-26", state: "done" }],
  finisher_tasks: [
    task("t-old", "open", "2026-10-16", { sort_key: 1 }),
    task("t-past", "open", "2026-10-21", { sort_key: 2 }),
    task("t-mon", "open", "2026-10-26", { sort_key: 3 }),
    task("t-wed", "open", "2026-10-28", { sort_key: 4, due_time: "09:00:00" }),
    task("t-thu", "open", "2026-10-29", { sort_key: 5, project_id: EN }),
    task("t-none", "open", null, { sort_key: 6 }),
    task("t-next", "open", "2026-11-03", { sort_key: 7 }),
    task("d-mon", "done", "2026-10-26", { sort_key: 8, closed_at: "2026-10-26T10:00:00Z" }),
    task("d-wed", "delegated", "2026-10-28", { sort_key: 9, closed_at: "2026-10-27T10:00:00Z", close_note: "Sam" }),
    task("l-go", "let_go", "2026-10-29", { sort_key: 10, closed_at: "2026-10-27T12:00:00Z", close_note: "Changed plan" }),
    task("p-due", "parked", null, { sort_key: 11, revisit_date: "2026-10-25" }),
  ],
  finisher_pomodoros: [
    { ends_at: "2026-10-26T09:25:00Z", stopped_at: null },
    { ends_at: "2026-10-27T10:00:00Z", stopped_at: null },
    { ends_at: "2026-10-27T11:00:00Z", stopped_at: null },
    { ends_at: "2026-10-27T12:00:00Z", stopped_at: "2026-10-27T11:50:00Z" }, // abandoned: never counted
    { ends_at: "2026-10-28T14:50:00Z", stopped_at: null }, // still running at 14:30: not counted yet
  ],
  finisher_weekly_notes: [{ week_start: MONDAY, note: "Fine week" }],
};

const ctx: FinisherContext = {
  user: { id: "00000000-0000-4000-8000-00000000000a", email: null },
  supabase: tableStub(TABLES),
  timeZone: "UTC",
  now: NOW,
};

const ids = (tasks: { id: string }[]) => tasks.map((item) => item.id);

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-28T14:30:00Z"));
});
afterAll(() => {
  vi.useRealTimers();
});

describe("getWeek (FIN-043 to FIN-046)", () => {
  it("places this week's tasks and sessions by day; earlier open tasks only in Carried over", async () => {
    const week = await getWeek(ctx, MONDAY);
    expect(week.days.map((day) => day.date)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
    const [mon, tue, wed, thu, fri] = week.days;
    // Monday is past: its open task is carried over, not repeated; the finished one stays (decision 36).
    expect(ids(mon.open)).toEqual([]);
    expect(ids(mon.finished)).toEqual(["d-mon"]);
    expect(mon.sessions.map((session) => [session.activity, session.state])).toEqual([["Watch ABK", "done"]]);
    // Guitar was Active on Tuesday (parked from Wednesday), so that session still shows (FIN-045).
    expect(tue.sessions.map((session) => [session.activity, session.projectTitle])).toEqual([["Chords", "Guitar"]]);
    expect(ids(wed.open)).toEqual(["t-wed"]);
    expect(wed.open[0].overdue).toBe(true); // 09:00 has passed
    expect(ids(wed.finished)).toEqual(["d-wed"]);
    expect(ids(thu.open)).toEqual(["t-thu"]);
    expect(thu.open[0].projectTitle).toBe("English");
    expect(thu.sessions).toEqual([]); // Guitar is parked by then
    expect(fri.sessions.map((session) => session.startTime)).toEqual(["19:00"]);
    expect(week.carried).toEqual({ items: expect.any(Array), total: 3 });
    expect(ids(week.carried!.items)).toEqual(["t-old", "t-past", "t-mon"]);
    expect(ids(week.unplanned.items)).toEqual(["t-none"]);
    expect(week.unplanned.total).toBe(1);
    expect(week.revisitDue).toEqual({ tasks: 1, projects: 1 });
    expect(JSON.stringify(week)).not.toContain("t-next");
    // Let go tasks never show on the board.
    expect(JSON.stringify(week.days)).not.toContain("l-go");
  });

  it("shows another week's open tasks on their days, with no Carried over or revisit notice", async () => {
    const week = await getWeek(ctx, "2026-10-19");
    expect(ids(week.days[2].open)).toEqual(["t-past"]);
    expect(week.days[2].open[0].overdue).toBe(true);
    expect(week.carried).toBeNull();
    expect(week.revisitDue).toBeNull();
  });
});

describe("getWeekReview (FIN-047)", () => {
  it("lists what was finished, let go and slipped, with session rates, Pomodoros per day and the note", async () => {
    const review = await getWeekReview(ctx, MONDAY);
    expect(review.done.map((item) => [item.id, item.closedOn, item.note])).toEqual([
      ["d-mon", "2026-10-26", null],
      ["d-wed", "2026-10-27", "Sam"],
    ]);
    expect(review.letGo.map((item) => [item.id, item.note])).toEqual([["l-go", "Changed plan"]]);
    // Due this week and overdue now: Monday's, and today's 09:00. Thursday's isn't due yet.
    expect(ids(review.slipped)).toEqual(["t-mon", "t-wed"]);
    expect(review.pomodoros.map((day) => day.completed)).toEqual([1, 2, 0, 0, 0, 0, 0]);
    expect(review.note).toBe("Fine week");
    expect(review.projects.map((project) => [project.title, project.week.done, project.week.scheduled])).toEqual([
      ["English", 1, 3],
      ["Guitar", 0, 1],
    ]);
  });

  it("refuses a future week", async () => {
    await expect(getWeekReview(ctx, "2026-11-02")).rejects.toMatchObject({ code: "not_allowed", status: 409 });
  });
});
