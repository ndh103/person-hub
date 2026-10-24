import { addDays, isLocalDate, isLocalTime, type LocalDate, type LocalTime } from "./dates";

/**
 * Input parsing for Finisher writes ("Fields and validation" in the
 * requirements). Runs in the browser for immediate field errors and again on
 * the server, which is the one that counts. Only the fields listed here are
 * ever read from a request body; everything else is ignored.
 */
export type FieldErrorCode = "required" | "too_long" | "invalid" | "out_of_range" | "needs_date" | "too_many";

export type FieldErrors = Partial<Record<string, FieldErrorCode>>;

export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

export const LIMITS = {
  title: 120,
  notes: 1000,
  goal: 500,
  doneWhen: 300,
  activity: 80,
  reason: 500,
  delegatedTo: 100,
  reflection: 1000,
  slots: 20,
  minDuration: 5,
  maxDuration: 480,
  parkMaxDays: 365,
  dueYears: 5,
  weeklyNote: 2000,
  /** Tasks in one batch due-date change (A29). */
  dueChanges: 200,
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

type Collector = { errors: FieldErrors };

function text(c: Collector, raw: unknown, field: string, max: number, required: boolean): string | null {
  if (raw !== undefined && raw !== null && typeof raw !== "string") {
    c.errors[field] = "invalid";
    return null;
  }
  const value = (raw ?? "").trim();
  if (!value) {
    if (required) c.errors[field] = "required";
    return null;
  }
  // Count code points, like Postgres char_length.
  if ([...value].length > max) {
    c.errors[field] = "too_long";
    return null;
  }
  return value;
}

function optionalDate(c: Collector, raw: unknown, field: string): LocalDate | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (!isLocalDate(raw)) {
    c.errors[field] = "invalid";
    return null;
  }
  return raw;
}

function optionalTime(c: Collector, raw: unknown, field: string): LocalTime | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "string" && /^\d{2}:\d{2}:\d{2}$/.test(raw)) raw = raw.slice(0, 5);
  if (!isLocalTime(raw)) {
    c.errors[field] = "invalid";
    return null;
  }
  return raw;
}

function optionalId(c: Collector, raw: unknown, field: string): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (!isUuid(raw)) {
    c.errors[field] = "invalid";
    return null;
  }
  return raw.toLowerCase();
}

function done<T>(c: Collector, value: T): Parsed<T> {
  return Object.keys(c.errors).length ? { ok: false, errors: c.errors } : { ok: true, value };
}

function yearsFrom(date: LocalDate, years: number): LocalDate {
  const year = Number(date.slice(0, 4)) + years;
  const candidate = `${String(year).padStart(4, "0")}${date.slice(4)}`;
  // 29 February in a non-leap target year becomes 28 February.
  return isLocalDate(candidate) ? candidate : addDays(`${String(year).padStart(4, "0")}${date.slice(4, 8)}01`, 27);
}

export type TaskInput = {
  title: string;
  notes: string | null;
  dueDate: LocalDate | null;
  dueTime: LocalTime | null;
  projectId: string | null;
};

export function parseTaskInput(raw: Record<string, unknown>, today: LocalDate): Parsed<TaskInput> {
  const c: Collector = { errors: {} };
  const title = text(c, raw.title, "title", LIMITS.title, true);
  const notes = text(c, raw.notes, "notes", LIMITS.notes, false);
  const dueDate = optionalDate(c, raw.dueDate, "dueDate");
  const dueTime = optionalTime(c, raw.dueTime, "dueTime");
  const projectId = optionalId(c, raw.projectId, "projectId");
  if (dueDate && (dueDate < yearsFrom(today, -LIMITS.dueYears) || dueDate > yearsFrom(today, LIMITS.dueYears))) {
    c.errors.dueDate = "out_of_range";
  }
  if (dueTime && !dueDate && !c.errors.dueDate) c.errors.dueTime = "needs_date";
  return done(c, { title: title ?? "", notes, dueDate, dueTime, projectId });
}

export type DueInput = { dueDate: LocalDate | null; dueTime: LocalTime | null };

/** FIN-037: only the due date and time, with the same rules as the task form. */
export function parseDueInput(raw: Record<string, unknown>, today: LocalDate): Parsed<DueInput> {
  const c: Collector = { errors: {} };
  const dueDate = optionalDate(c, raw.dueDate, "dueDate");
  const dueTime = optionalTime(c, raw.dueTime, "dueTime");
  if (dueDate && (dueDate < yearsFrom(today, -LIMITS.dueYears) || dueDate > yearsFrom(today, LIMITS.dueYears))) {
    c.errors.dueDate = "out_of_range";
  }
  if (dueTime && !dueDate && !c.errors.dueDate) c.errors.dueTime = "needs_date";
  return done(c, { dueDate, dueTime });
}

export type DueChange = DueInput & { id: string };

/**
 * FIN-046 "Move all" and its Undo: 1–200 changes, one per task, each with the
 * same rules as a single due-date change. Any problem refuses the whole batch
 * under the field "changes"; nothing but id, dueDate and dueTime is read.
 */
export function parseDueChanges(raw: Record<string, unknown>, today: LocalDate): Parsed<{ changes: DueChange[] }> {
  const list = raw.changes;
  if (!Array.isArray(list) || list.length === 0) return { ok: false, errors: { changes: "invalid" } };
  if (list.length > LIMITS.dueChanges) return { ok: false, errors: { changes: "too_many" } };
  const changes: DueChange[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return { ok: false, errors: { changes: "invalid" } };
    const entry = item as Record<string, unknown>;
    const due = parseDueInput({ dueDate: entry.dueDate, dueTime: entry.dueTime }, today);
    if (!isUuid(entry.id) || !due.ok || seen.has(entry.id.toLowerCase())) return { ok: false, errors: { changes: "invalid" } };
    seen.add(entry.id.toLowerCase());
    changes.push({ id: entry.id.toLowerCase(), ...due.value });
  }
  return { ok: true, value: { changes } };
}

/** FIN-047: the weekly note; empty or blank means "remove it". */
export function parseWeeklyNote(raw: Record<string, unknown>): Parsed<{ note: string | null }> {
  const c: Collector = { errors: {} };
  const note = text(c, raw.note, "note", LIMITS.weeklyNote, false);
  return done(c, { note });
}

/** FIN-039: start a Pomodoro; `replace` stops the running one first (Switch). */
export function parseStartPomodoro(raw: Record<string, unknown>): Parsed<{ replace: boolean }> {
  if (raw.replace !== undefined && typeof raw.replace !== "boolean") return { ok: false, errors: { replace: "invalid" } };
  return { ok: true, value: { replace: raw.replace === true } };
}

export type MoveInput = { afterId: string | null; beforeId: string | null };

/**
 * FIN-038: where a task lands, as the ids of the tasks shown directly before
 * and after it. At least one is needed, and neither may be the task itself.
 */
export function parseMoveInput(raw: Record<string, unknown>, taskId: string): Parsed<MoveInput> {
  const c: Collector = { errors: {} };
  const afterId = optionalId(c, raw.afterId, "position");
  const beforeId = optionalId(c, raw.beforeId, "position");
  const self = taskId.toLowerCase();
  if (!c.errors.position && ((!afterId && !beforeId) || afterId === self || beforeId === self || (afterId && afterId === beforeId))) {
    c.errors.position = "invalid";
  }
  return done(c, { afterId, beforeId });
}

export type ProjectInput = {
  title: string;
  goal: string | null;
  doneWhen: string;
  targetDate: LocalDate | null;
};

/** `currentTargetDate`: when editing, an unchanged past target date is allowed. */
export function parseProjectInput(
  raw: Record<string, unknown>,
  today: LocalDate,
  currentTargetDate: LocalDate | null = null,
): Parsed<ProjectInput> {
  const c: Collector = { errors: {} };
  const title = text(c, raw.title, "title", LIMITS.title, true);
  const goal = text(c, raw.goal, "goal", LIMITS.goal, false);
  const doneWhen = text(c, raw.doneWhen, "doneWhen", LIMITS.doneWhen, true);
  const targetDate = optionalDate(c, raw.targetDate, "targetDate");
  if (targetDate && targetDate < today && targetDate !== currentTargetDate) c.errors.targetDate = "out_of_range";
  return done(c, { title: title ?? "", goal, doneWhen: doneWhen ?? "", targetDate });
}

export type SlotInput = {
  activity: string;
  days: number[];
  durationMinutes: number;
  startTime: LocalTime | null;
};

export function parseSlotInput(raw: Record<string, unknown>): Parsed<SlotInput> {
  const c: Collector = { errors: {} };
  const activity = text(c, raw.activity, "activity", LIMITS.activity, true);
  let days: number[] = [];
  if (!Array.isArray(raw.days) || raw.days.length === 0) {
    c.errors.days = "required";
  } else if (raw.days.length > 7 || !raw.days.every((day) => Number.isInteger(day) && day >= 1 && day <= 7)) {
    c.errors.days = "invalid";
  } else {
    days = [...new Set(raw.days as number[])].sort((a, b) => a - b);
  }
  const duration = raw.durationMinutes;
  let durationMinutes = 0;
  if (duration === undefined || duration === null || duration === "") {
    c.errors.durationMinutes = "required";
  } else if (typeof duration !== "number" || !Number.isInteger(duration)) {
    c.errors.durationMinutes = "invalid";
  } else if (duration < LIMITS.minDuration || duration > LIMITS.maxDuration) {
    c.errors.durationMinutes = "out_of_range";
  } else {
    durationMinutes = duration;
  }
  const startTime = optionalTime(c, raw.startTime, "startTime");
  return done(c, { activity: activity ?? "", days, durationMinutes, startTime });
}

/** A new project with its first slots (FIN-023). Slot errors are keyed "slots.<index>.<field>". */
export function parseNewProject(
  raw: Record<string, unknown>,
  today: LocalDate,
): Parsed<ProjectInput & { slots: SlotInput[] }> {
  const project = parseProjectInput(raw, today);
  const errors: FieldErrors = project.ok ? {} : { ...project.errors };
  const slots: SlotInput[] = [];
  const rawSlots = raw.slots ?? [];
  if (!Array.isArray(rawSlots)) {
    errors.slots = "invalid";
  } else if (rawSlots.length > LIMITS.slots) {
    errors.slots = "too_many";
  } else {
    rawSlots.forEach((item, index) => {
      const slot = parseSlotInput(item && typeof item === "object" ? (item as Record<string, unknown>) : {});
      if (slot.ok) slots.push(slot.value);
      else for (const [field, code] of Object.entries(slot.errors)) errors[`slots.${index}.${field}`] = code;
    });
  }
  if (!project.ok || Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { ...project.value, slots } };
}

function parkDate(c: Collector, raw: unknown, today: LocalDate): LocalDate | null {
  const date = optionalDate(c, raw, "revisitDate");
  if (!date) {
    if (!c.errors.revisitDate) c.errors.revisitDate = "required";
    return null;
  }
  if (date <= today || date > addDays(today, LIMITS.parkMaxDays)) {
    c.errors.revisitDate = "out_of_range";
    return null;
  }
  return date;
}

export const TASK_ACTIONS = ["done", "park", "unpark", "let_go", "delegate", "reopen"] as const;
export type TaskAction = (typeof TASK_ACTIONS)[number];

export type TaskActionInput =
  | { action: "done" | "unpark" }
  /** keepPosition: the immediate Undo after Mark done returns the task to its place (FIN-021, FIN-038). */
  | { action: "reopen"; keepPosition: boolean }
  | { action: "park"; revisitDate: LocalDate }
  | { action: "let_go"; reason: string }
  /** FIN-041: who the task was handed to. */
  | { action: "delegate"; delegatedTo: string };

export function parseTaskAction(raw: Record<string, unknown>, today: LocalDate): Parsed<TaskActionInput> {
  const c: Collector = { errors: {} };
  const action = raw.action;
  if (action === "park") {
    const revisitDate = parkDate(c, raw.revisitDate, today);
    return done(c, { action, revisitDate: revisitDate ?? "" });
  }
  if (action === "let_go") {
    const reason = text(c, raw.reason, "reason", LIMITS.reason, true);
    return done(c, { action, reason: reason ?? "" });
  }
  if (action === "delegate") {
    const delegatedTo = text(c, raw.delegatedTo, "delegatedTo", LIMITS.delegatedTo, true);
    return done(c, { action, delegatedTo: delegatedTo ?? "" });
  }
  if (action === "reopen") {
    if (raw.keepPosition !== undefined && typeof raw.keepPosition !== "boolean") c.errors.keepPosition = "invalid";
    return done(c, { action, keepPosition: raw.keepPosition === true });
  }
  if (action === "done" || action === "unpark") return { ok: true, value: { action } };
  return { ok: false, errors: { action: "invalid" } };
}

export const PROJECT_ACTIONS = ["finish", "park", "unpark", "let_go", "reopen"] as const;
export type ProjectAction = (typeof PROJECT_ACTIONS)[number];

export type ProjectActionInput =
  | { action: "unpark" | "reopen" }
  | { action: "finish"; reflection: string | null }
  | { action: "park"; revisitDate: LocalDate }
  | { action: "let_go"; reason: string };

export function parseProjectAction(raw: Record<string, unknown>, today: LocalDate): Parsed<ProjectActionInput> {
  const c: Collector = { errors: {} };
  const action = raw.action;
  if (action === "finish") {
    const reflection = text(c, raw.reflection, "reflection", LIMITS.reflection, false);
    return done(c, { action, reflection });
  }
  if (action === "park") {
    const revisitDate = parkDate(c, raw.revisitDate, today);
    return done(c, { action, revisitDate: revisitDate ?? "" });
  }
  if (action === "let_go") {
    const reason = text(c, raw.reason, "reason", LIMITS.reason, true);
    return done(c, { action, reason: reason ?? "" });
  }
  if (action === "unpark" || action === "reopen") return { ok: true, value: { action } };
  return { ok: false, errors: { action: "invalid" } };
}

export type MarkInput = { slotId: string; date: LocalDate; state: "done" | "skipped" | "unmarked" };

export function parseMarkInput(raw: Record<string, unknown>): Parsed<MarkInput> {
  const c: Collector = { errors: {} };
  const slotId = optionalId(c, raw.slotId, "slotId");
  if (!slotId && !c.errors.slotId) c.errors.slotId = "required";
  const date = optionalDate(c, raw.date, "date");
  if (!date && !c.errors.date) c.errors.date = "required";
  const state = raw.state;
  if (state !== "done" && state !== "skipped" && state !== "unmarked") c.errors.state = "invalid";
  return done(c, { slotId: slotId ?? "", date: date ?? "", state: state as MarkInput["state"] });
}
