import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDays,
  formatDate,
  formatWeekdayDate,
  formatRelativeDate,
  isOverdue,
  isValidTimeZone,
  localDateOf,
  startOfNextWeek,
  startOfWeek,
  zonedNow,
  zonedToUtc,
} from "@/features/finisher/domain/dates";
import {
  formatWeekDetails,
  formatWeekRate,
  isMissed,
  listSessions,
  summarizeWeek,
  type SlotVersion,
} from "@/features/finisher/domain/schedule";
import {
  parseMarkInput,
  parseNewProject,
  parseProjectAction,
  parseProjectInput,
  parseSlotInput,
  parseTaskAction,
  parseTaskInput,
} from "@/features/finisher/domain/validation";

// 2026-10-05 is a Monday.
const MON = "2026-10-05";

describe("local dates and timezones (business rules)", () => {
  it("reads the local date and time in the user's zone", () => {
    const instant = new Date("2026-10-11T23:30:00Z");
    expect(zonedNow("UTC", instant)).toEqual({ date: "2026-10-11", time: "23:30" });
    expect(zonedNow("Asia/Ho_Chi_Minh", instant)).toEqual({ date: "2026-10-12", time: "06:30" });
    expect(zonedNow("America/Los_Angeles", instant)).toEqual({ date: "2026-10-11", time: "16:30" });
  });

  it("finds the UTC start of a local day, including on DST change days", () => {
    expect(zonedToUtc("2026-10-12", "Asia/Ho_Chi_Minh").toISOString()).toBe("2026-10-11T17:00:00.000Z");
    // London moves clocks back on 25 October 2026: midnight is still BST (UTC+1).
    expect(zonedToUtc("2026-10-25", "Europe/London").toISOString()).toBe("2026-10-24T23:00:00.000Z");
    expect(zonedToUtc("2026-10-26", "Europe/London").toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(localDateOf("2026-10-24T23:30:00Z", "Europe/London")).toBe("2026-10-25");
  });

  it("validates IANA zones", () => {
    expect(isValidTimeZone("Europe/London")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });

  it("uses Monday-based weeks (A2) and plain date arithmetic across DST", () => {
    expect(startOfWeek("2026-10-11")).toBe(MON); // Sunday
    expect(startOfWeek(MON)).toBe(MON);
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("formats relative dates and days", () => {
    expect(formatRelativeDate("2026-10-12", "2026-10-11")).toBe("Tomorrow");
    expect(formatRelativeDate("2026-10-07", "2026-10-11")).toBe("7 Oct 2026");
    expect(formatRelativeDate("2027-01-03", "2026-10-11")).toBe("3 Jan 2027");
    expect(formatDate("2026-10-12")).toBe("12 Oct 2026");
    expect(formatDate("2027-01-03")).toBe("3 Jan 2027");
    expect(formatDays([5, 1, 3])).toBe("Mon · Wed · Fri");
    expect(formatDays([1, 2, 3, 4, 5, 6, 7])).toBe("Every day");
  });
});

describe("Next week due-date shortcut (FIN-034)", () => {
  it("is the Monday of the following week, whatever today's weekday", () => {
    expect(startOfNextWeek(MON)).toBe("2026-10-12");
    expect(startOfNextWeek("2026-10-07")).toBe("2026-10-12");
    // On a Sunday, next week starts tomorrow.
    expect(startOfNextWeek("2026-10-11")).toBe("2026-10-12");
  });

  it("captions the shortcut buttons as \"Monday 12 Oct\"", () => {
    expect(formatWeekdayDate("2026-10-12")).toBe("Monday 12 Oct");
    expect(formatWeekdayDate("2026-10-14")).toBe("Wednesday 14 Oct");
  });

  it("crosses month and year ends", () => {
    expect(startOfNextWeek("2026-10-30")).toBe("2026-11-02");
    expect(startOfNextWeek("2026-12-28")).toBe("2027-01-04");
  });
});

describe("overdue at the day boundary (business rules)", () => {
  const now = { date: "2026-10-11", time: "09:00" };
  it("a date-only task is overdue once its date has ended", () => {
    expect(isOverdue("2026-10-11", null, now)).toBe(false);
    expect(isOverdue("2026-10-10", null, now)).toBe(true);
    expect(isOverdue("2026-10-11", null, { date: "2026-10-11", time: "23:59" })).toBe(false);
  });
  it("a timed task is overdue once its local moment has passed", () => {
    expect(isOverdue("2026-10-11", "08:59", now)).toBe(true);
    expect(isOverdue("2026-10-11", "09:00", now)).toBe(true);
    expect(isOverdue("2026-10-11", "09:01", now)).toBe(false);
    expect(isOverdue(null, null, now)).toBe(false);
  });
});

function version(overrides: Partial<SlotVersion> = {}): SlotVersion {
  return {
    slotId: "slot-1",
    validFrom: "2026-09-01",
    validTo: null,
    activity: "Watch ABK program",
    days: [1, 3, 5],
    durationMinutes: 30,
    startTime: "19:00",
    ...overrides,
  };
}

describe("session schedule (FIN-026) and weekly rate (FIN-028)", () => {
  const always = [{ start: "2026-09-01", end: null }];

  it("schedules sessions on the slot's days while the project is Active", () => {
    const sessions = listSessions({ versions: [version()], periods: always, marks: [], from: MON, to: addDays(MON, 6) });
    expect(sessions.map((s) => s.date)).toEqual(["2026-10-05", "2026-10-07", "2026-10-09"]);
  });

  it("a slot edit mid-week applies from that day and keeps earlier marked history", () => {
    // Edited on Wednesday: Mon/Wed/Fri → Tue/Thu.
    const versions = [version({ validTo: "2026-10-07" }), version({ validFrom: "2026-10-07", days: [2, 4], activity: "Learn" })];
    const marks = [
      { slotId: "slot-1", date: "2026-10-05", state: "done" as const },
      // Marked before the edit, on a day that is no longer a slot day: kept.
      { slotId: "slot-1", date: "2026-10-07", state: "skipped" as const },
    ];
    const sessions = listSessions({ versions, periods: always, marks, from: MON, to: addDays(MON, 6) });
    expect(sessions.map((s) => [s.date, s.state])).toEqual([
      ["2026-10-05", "done"],
      ["2026-10-07", "skipped"],
      ["2026-10-08", "unmarked"],
    ]);
    expect(sessions[2].activity).toBe("Learn");
  });

  it("parking mid-week stops sessions and unparking resumes them", () => {
    const periods = [
      { start: "2026-09-01", end: "2026-10-07" }, // parked on Wednesday
      { start: "2026-10-09", end: null }, // unparked on Friday
    ];
    const sessions = listSessions({ versions: [version()], periods, marks: [], from: MON, to: addDays(MON, 6) });
    expect(sessions.map((s) => s.date)).toEqual(["2026-10-05", "2026-10-09"]);
  });

  it("summarises a week with remaining, unmarked and missed counts", () => {
    const marks = [{ slotId: "slot-1", date: "2026-10-05", state: "done" as const }];
    const sessions = listSessions({ versions: [version()], periods: always, marks, from: MON, to: addDays(MON, 6) });
    const summary = summarizeWeek(sessions, MON, "2026-10-08"); // Thursday
    expect(summary).toMatchObject({ scheduled: 3, done: 1, skipped: 0, missed: 0, unmarked: 1, remaining: 1 });
    expect(formatWeekRate(summary)).toBe("1 of 3 sessions this week");
    expect(formatWeekDetails(summary)).toBe("0 skipped · 0 missed · 1 unmarked · 1 remaining");
  });

  it("counts unmarked sessions older than the marking window as missed", () => {
    expect(isMissed({ date: "2026-10-03", state: "unmarked" }, "2026-10-11")).toBe(true); // day 8
    expect(isMissed({ date: "2026-10-04", state: "unmarked" }, "2026-10-11")).toBe(false); // day 7
    expect(isMissed({ date: "2026-10-03", state: "done" }, "2026-10-11")).toBe(false);
  });

  it("shows 'No sessions scheduled' instead of 0%", () => {
    const summary = summarizeWeek([], MON, MON);
    expect(formatWeekRate(summary)).toBe("No sessions scheduled");
    expect(formatWeekDetails(summary)).toBe("");
  });
});

describe("input validation (Fields and validation)", () => {
  const today = "2026-10-11";

  it("tasks: trims, enforces limits, and needs a date for a time", () => {
    expect(parseTaskInput({ title: "  Paperwork  " }, today)).toEqual({
      ok: true,
      value: { title: "Paperwork", notes: null, dueDate: null, dueTime: null, projectId: null },
    });
    expect(parseTaskInput({ title: "" }, today)).toEqual({ ok: false, errors: { title: "required" } });
    expect(parseTaskInput({ title: "x".repeat(121) }, today)).toMatchObject({ errors: { title: "too_long" } });
    expect(parseTaskInput({ title: "x", dueTime: "09:00" }, today)).toMatchObject({ errors: { dueTime: "needs_date" } });
    expect(parseTaskInput({ title: "x", dueDate: "2031-10-12" }, today)).toMatchObject({ errors: { dueDate: "out_of_range" } });
    expect(parseTaskInput({ title: "x", dueDate: "2031-10-11" }, today).ok).toBe(true);
    expect(parseTaskInput({ title: "x", dueDate: "2026-02-30" }, today)).toMatchObject({ errors: { dueDate: "invalid" } });
    expect(parseTaskInput({ title: "x", projectId: "not-a-uuid" }, today)).toMatchObject({ errors: { projectId: "invalid" } });
    expect(parseTaskInput({ title: 42 }, today)).toMatchObject({ errors: { title: "invalid" } });
  });

  it("tasks: ignores fields that are not writable", () => {
    const parsed = parseTaskInput({ title: "x", user_id: "someone-else", status: "done" }, today);
    expect(parsed.ok && Object.keys(parsed.value).sort()).toEqual(["dueDate", "dueTime", "notes", "projectId", "title"]);
  });

  it("projects: Done when is required; target date is today or later unless unchanged", () => {
    expect(parseProjectInput({ title: "x" }, today)).toMatchObject({ errors: { doneWhen: "required" } });
    expect(parseProjectInput({ title: "x", doneWhen: "y", targetDate: "2026-10-10" }, today)).toMatchObject({
      errors: { targetDate: "out_of_range" },
    });
    expect(parseProjectInput({ title: "x", doneWhen: "y", targetDate: "2026-10-10" }, today, "2026-10-10").ok).toBe(true);
  });

  it("slots: days, duration range and slot errors keyed by index", () => {
    expect(parseSlotInput({ activity: "a", days: [3, 1, 3], durationMinutes: 30 })).toMatchObject({
      ok: true,
      value: { days: [1, 3] },
    });
    expect(parseSlotInput({ activity: "a", days: [], durationMinutes: 30 })).toMatchObject({ errors: { days: "required" } });
    expect(parseSlotInput({ activity: "a", days: [8], durationMinutes: 30 })).toMatchObject({ errors: { days: "invalid" } });
    expect(parseSlotInput({ activity: "a", days: [1], durationMinutes: 4 })).toMatchObject({
      errors: { durationMinutes: "out_of_range" },
    });
    expect(parseSlotInput({ activity: "a", days: [1], durationMinutes: 30.5 })).toMatchObject({
      errors: { durationMinutes: "invalid" },
    });
    expect(
      parseNewProject({ title: "x", doneWhen: "y", slots: [{ activity: "", days: [1], durationMinutes: 30 }] }, today),
    ).toMatchObject({ ok: false, errors: { "slots.0.activity": "required" } });
    const tooMany = Array.from({ length: 21 }, () => ({ activity: "a", days: [1], durationMinutes: 30 }));
    expect(parseNewProject({ title: "x", doneWhen: "y", slots: tooMany }, today)).toMatchObject({ errors: { slots: "too_many" } });
  });

  it("lifecycle actions: park dates from tomorrow to a year ahead; Let go needs a reason", () => {
    expect(parseTaskAction({ action: "park", revisitDate: today }, today)).toMatchObject({ errors: { revisitDate: "out_of_range" } });
    expect(parseTaskAction({ action: "park", revisitDate: "2026-10-12" }, today).ok).toBe(true);
    expect(parseTaskAction({ action: "park", revisitDate: "2027-10-11" }, today).ok).toBe(true);
    expect(parseTaskAction({ action: "park", revisitDate: "2027-10-12" }, today).ok).toBe(false);
    expect(parseTaskAction({ action: "let_go", reason: "  " }, today)).toMatchObject({ errors: { reason: "required" } });
    expect(parseTaskAction({ action: "finish" }, today)).toMatchObject({ errors: { action: "invalid" } });
    // FIN-041: delegating needs who it was handed to, trimmed, at most 100 characters.
    expect(parseTaskAction({ action: "delegate", delegatedTo: "  Minh " }, today)).toEqual({
      ok: true,
      value: { action: "delegate", delegatedTo: "Minh" },
    });
    expect(parseTaskAction({ action: "delegate" }, today)).toMatchObject({ errors: { delegatedTo: "required" } });
    expect(parseTaskAction({ action: "delegate", delegatedTo: "x".repeat(101) }, today)).toMatchObject({
      errors: { delegatedTo: "too_long" },
    });
    expect(parseTaskAction({ action: "delegate", delegatedTo: 42 }, today).ok).toBe(false);
    expect(parseProjectAction({ action: "finish" }, today)).toEqual({ ok: true, value: { action: "finish", reflection: null } });
  });

  it("session marks: state must be done, skipped or unmarked", () => {
    const slotId = "8b0b2a8e-0d6f-4a53-9a43-1f2e4b8c9d10";
    expect(parseMarkInput({ slotId, date: today, state: "done" }).ok).toBe(true);
    expect(parseMarkInput({ slotId, date: today, state: "maybe" })).toMatchObject({ errors: { state: "invalid" } });
    expect(parseMarkInput({ slotId: "x", date: "2026-13-01", state: "done" })).toMatchObject({
      errors: { slotId: "invalid", date: "invalid" },
    });
  });
});
