import { describe, expect, it } from "vitest";
import { formatCountdown, formatPomodoroSummary, pomodoroProgress, remainingMs } from "@/features/finisher/domain/pomodoro";
import { quickDueChoice, quickDueDate } from "@/features/finisher/domain/quick-due";
import { availableMoves, moveBy, moveToIndex, neighbours } from "@/features/finisher/domain/task-order";
import { parseDueInput, parseMoveInput, parseTaskAction } from "@/features/finisher/domain/validation";

const TASK = "8b0b2a8e-0d6f-4a53-9a43-1f2e4b8c9d10";
const OTHER = "1b0b2a8e-0d6f-4a53-9a43-1f2e4b8c9d11";

describe("quick due dates (FIN-034, FIN-037)", () => {
  it("Today, Tomorrow and Next week, including Sunday, month end and year end", () => {
    expect(quickDueDate("today", "2026-10-20")).toBe("2026-10-20");
    expect(quickDueDate("tomorrow", "2026-10-20")).toBe("2026-10-21");
    expect(quickDueDate("nextWeek", "2026-10-20")).toBe("2026-10-26");
    // Sunday: Tomorrow and Next week are the same Monday (both are still offered).
    expect(quickDueDate("tomorrow", "2026-10-18")).toBe("2026-10-19");
    expect(quickDueDate("nextWeek", "2026-10-18")).toBe("2026-10-19");
    expect(quickDueDate("tomorrow", "2026-10-31")).toBe("2026-11-01");
    expect(quickDueDate("tomorrow", "2026-12-31")).toBe("2027-01-01");
    expect(quickDueDate("nextWeek", "2026-12-28")).toBe("2027-01-04");
  });

  const now = { date: "2026-10-20", time: "14:30" };

  it("keeps the due time (A14)", () => {
    expect(quickDueChoice("tomorrow", { dueDate: "2026-10-16", dueTime: "09:00" }, now)).toEqual({
      kind: "tomorrow",
      date: "2026-10-21",
      time: "09:00",
      current: false,
    });
    expect(quickDueChoice("today", { dueDate: "2026-10-16", dueTime: "17:00" }, now).time).toBe("17:00");
  });

  it("Today clears a time that has passed today and stays enabled for a task due today at a passed time (decision 22)", () => {
    const choice = quickDueChoice("today", { dueDate: "2026-10-20", dueTime: "09:00" }, now);
    expect(choice).toEqual({ kind: "today", date: "2026-10-20", time: null, current: false });
    // Tomorrow keeps 09:00, because the time has not passed tomorrow.
    expect(quickDueChoice("tomorrow", { dueDate: "2026-10-20", dueTime: "09:00" }, now).time).toBe("09:00");
  });

  it("marks the item that would change nothing as current", () => {
    expect(quickDueChoice("today", { dueDate: "2026-10-20", dueTime: null }, now).current).toBe(true);
    expect(quickDueChoice("today", { dueDate: "2026-10-20", dueTime: "17:00" }, now).current).toBe(true);
    expect(quickDueChoice("tomorrow", { dueDate: "2026-10-20", dueTime: null }, now).current).toBe(false);
    expect(quickDueChoice("today", { dueDate: null, dueTime: null }, now).current).toBe(false);
  });
});

describe("task order helpers (FIN-038)", () => {
  const ids = ["a", "b", "c", "d"];

  it("moves to an index and reports no change", () => {
    expect(moveToIndex(ids, "d", 1)).toEqual(["a", "d", "b", "c"]);
    expect(moveToIndex(ids, "a", 3)).toEqual(["b", "c", "d", "a"]);
    expect(moveToIndex(ids, "b", 1)).toBeNull();
    expect(moveToIndex(ids, "x", 0)).toBeNull();
  });

  it("Move up, down, to top and to bottom", () => {
    expect(moveBy(ids, "c", "up")).toEqual(["a", "c", "b", "d"]);
    expect(moveBy(ids, "c", "down")).toEqual(["a", "b", "d", "c"]);
    expect(moveBy(ids, "c", "top")).toEqual(["c", "a", "b", "d"]);
    expect(moveBy(ids, "b", "bottom")).toEqual(["a", "c", "d", "b"]);
    expect(moveBy(ids, "a", "up")).toBeNull();
    expect(moveBy(ids, "d", "down")).toBeNull();
  });

  it("offers only the moves that are possible", () => {
    expect(availableMoves(0, 4)).toEqual(["down", "bottom"]);
    expect(availableMoves(2, 4)).toEqual(["top", "up", "down", "bottom"]);
    expect(availableMoves(3, 4)).toEqual(["top", "up"]);
    expect(availableMoves(0, 1)).toEqual([]);
  });

  it("sends the shown neighbours (filtered or partly loaded lists use only what is shown)", () => {
    expect(neighbours(["a", "d", "b"], "d")).toEqual({ afterId: "a", beforeId: "b" });
    expect(neighbours(["d", "a"], "d")).toEqual({ afterId: null, beforeId: "a" });
    expect(neighbours(["a", "d"], "d")).toEqual({ afterId: "a", beforeId: null });
  });
});

describe("request parsing for the new endpoints", () => {
  it("parses a move and rejects a missing or self-referencing position", () => {
    expect(parseMoveInput({ afterId: OTHER.toUpperCase(), beforeId: null }, TASK)).toEqual({
      ok: true,
      value: { afterId: OTHER, beforeId: null },
    });
    expect(parseMoveInput({}, TASK)).toEqual({ ok: false, errors: { position: "invalid" } });
    expect(parseMoveInput({ afterId: TASK }, TASK).ok).toBe(false);
    expect(parseMoveInput({ afterId: OTHER, beforeId: OTHER }, TASK).ok).toBe(false);
    expect(parseMoveInput({ afterId: "1 or 1=1" }, TASK)).toEqual({ ok: false, errors: { position: "invalid" } });
  });

  it("parses a due date change with the task form's rules", () => {
    expect(parseDueInput({ dueDate: "2026-10-21", dueTime: "09:00" }, "2026-10-20")).toEqual({
      ok: true,
      value: { dueDate: "2026-10-21", dueTime: "09:00" },
    });
    expect(parseDueInput({ dueDate: null, dueTime: null }, "2026-10-20").ok).toBe(true);
    expect(parseDueInput({ dueTime: "09:00" }, "2026-10-20")).toEqual({ ok: false, errors: { dueTime: "needs_date" } });
    expect(parseDueInput({ dueDate: "2040-01-01" }, "2026-10-20")).toEqual({ ok: false, errors: { dueDate: "out_of_range" } });
  });

  it("accepts keepPosition only as a boolean, and only uses it for reopen", () => {
    expect(parseTaskAction({ action: "reopen", keepPosition: true }, "2026-10-20")).toEqual({
      ok: true,
      value: { action: "reopen", keepPosition: true },
    });
    expect(parseTaskAction({ action: "reopen" }, "2026-10-20")).toEqual({ ok: true, value: { action: "reopen", keepPosition: false } });
    expect(parseTaskAction({ action: "reopen", keepPosition: "yes" }, "2026-10-20").ok).toBe(false);
    expect(parseTaskAction({ action: "done", keepPosition: true }, "2026-10-20")).toEqual({ ok: true, value: { action: "done" } });
  });
});

describe("Pomodoro countdown (FIN-039, FIN-040)", () => {
  const startedAt = "2026-10-20T09:00:00.000Z";
  const endsAt = "2026-10-20T09:25:00.000Z";
  const at = (iso: string) => Date.parse(iso);

  it("counts down from the server's end instant and never goes below zero", () => {
    expect(formatCountdown(remainingMs(endsAt, at(startedAt)))).toBe("25:00");
    expect(formatCountdown(remainingMs(endsAt, at("2026-10-20T09:24:59.500Z")))).toBe("00:01");
    expect(formatCountdown(remainingMs(endsAt, at("2026-10-20T09:30:00.000Z")))).toBe("00:00");
    // Rounds seconds up, so "00:00" shows only at the end.
    expect(formatCountdown(1)).toBe("00:01");
  });

  it("works from timestamps, so a late tick (throttled background tab) still shows the right time", () => {
    expect(formatCountdown(remainingMs(endsAt, at("2026-10-20T09:12:30.000Z")))).toBe("12:30");
    expect(pomodoroProgress(startedAt, endsAt, at("2026-10-20T09:12:30.000Z"))).toBeCloseTo(0.5);
    expect(pomodoroProgress(startedAt, endsAt, at("2026-10-20T08:00:00.000Z"))).toBe(0);
    expect(pomodoroProgress(startedAt, endsAt, at("2026-10-20T10:00:00.000Z"))).toBe(1);
  });

  it("words today's summary", () => {
    expect(formatPomodoroSummary(0, 0)).toBe("No Pomodoros yet today");
    expect(formatPomodoroSummary(1, 25)).toBe("1 Pomodoro today · 25 min");
    expect(formatPomodoroSummary(3, 75)).toBe("3 Pomodoros today · 75 min");
  });
});

describe("Pomodoro 'today' boundary (FIN-040)", () => {
  it("counts sessions that ended since local midnight in the caller's timezone", async () => {
    const { getPomodoroSummary } = await import("@/features/finisher/server/pomodoros");
    const filters: [string, unknown][] = [];
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "is", "gt", "gte", "lte", "order", "limit", "eq"]) {
      builder[method] = (...args: unknown[]) => {
        if (method === "gte") filters.push([String(args[0]), args[1]]);
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null, count: 0 });
    const ctx = {
      user: { id: "00000000-0000-4000-8000-00000000000a", email: null },
      supabase: { from: () => builder },
      timeZone: "Asia/Ho_Chi_Minh",
      now: { date: "2026-10-20", time: "06:00" },
    } as unknown as Parameters<typeof getPomodoroSummary>[0];
    const summary = await getPomodoroSummary(ctx);
    // Midnight on 20 Oct in Ho Chi Minh City (UTC+7) is 17:00 UTC on 19 Oct.
    expect(filters).toEqual([["ends_at", "2026-10-19T17:00:00.000Z"]]);
    expect(summary).toMatchObject({ active: null, today: { completed: 0, minutes: 0 } });
  });
});
