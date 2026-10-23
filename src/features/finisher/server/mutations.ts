import {
  isUuid,
  parseDueInput,
  parseMarkInput,
  parseMoveInput,
  parseStartPomodoro,
  parseNewProject,
  parseProjectAction,
  parseProjectInput,
  parseSlotInput,
  parseTaskAction,
  parseTaskInput,
  type Parsed,
} from "../domain/validation";
import type { FinisherContext } from "./context";
import { fromDbError, invalid, notFound } from "./errors";

/**
 * Finisher writes. Each one verifies the session, parses an allowlist of
 * fields, and calls a database write function with the caller's session.
 * The functions derive ownership from auth.uid() and enforce lifecycle,
 * window and schedule rules again (ADR-0002), so these checks are the
 * friendly first line, not the only one.
 */
type Body = Record<string, unknown>;

function unwrap<T>(parsed: Parsed<T>): T {
  if (!parsed.ok) throw invalid(parsed.errors);
  return parsed.value;
}

function requireId(id: string): string {
  if (!isUuid(id)) throw notFound();
  return id.toLowerCase();
}

async function rpc<T>(ctx: FinisherContext, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await ctx.supabase.rpc(fn, args);
  if (error) throw fromDbError(error);
  return data as T;
}

export async function createTask(ctx: FinisherContext, body: Body): Promise<{ id: string }> {
  const input = unwrap(parseTaskInput(body, ctx.now.date));
  const id = await rpc<string>(ctx, "finisher_create_task", {
    p_tz: ctx.timeZone,
    p_title: input.title,
    p_notes: input.notes,
    p_due_date: input.dueDate,
    p_due_time: input.dueTime,
    p_project_id: input.projectId,
  });
  return { id };
}

export async function updateTask(ctx: FinisherContext, taskId: string, body: Body): Promise<void> {
  const id = requireId(taskId);
  const input = unwrap(parseTaskInput(body, ctx.now.date));
  await rpc(ctx, "finisher_update_task", {
    p_tz: ctx.timeZone,
    p_task_id: id,
    p_title: input.title,
    p_notes: input.notes,
    p_due_date: input.dueDate,
    p_due_time: input.dueTime,
    p_project_id: input.projectId,
  });
}

export async function taskAction(ctx: FinisherContext, taskId: string, body: Body): Promise<{ status: string }> {
  const id = requireId(taskId);
  const input = unwrap(parseTaskAction(body, ctx.now.date));
  const status = await rpc<string>(ctx, "finisher_task_action", {
    p_tz: ctx.timeZone,
    p_task_id: id,
    p_action: input.action,
    p_revisit_date: input.action === "park" ? input.revisitDate : null,
    p_reason: input.action === "let_go" ? input.reason : input.action === "delegate" ? input.delegatedTo : null,
    p_keep_position: input.action === "reopen" ? input.keepPosition : false,
  });
  return { status };
}

/** FIN-037: change only the due date and time of an Open task. */
export async function setTaskDue(ctx: FinisherContext, taskId: string, body: Body): Promise<void> {
  const id = requireId(taskId);
  const input = unwrap(parseDueInput(body, ctx.now.date));
  await rpc(ctx, "finisher_set_task_due", {
    p_tz: ctx.timeZone,
    p_task_id: id,
    p_due_date: input.dueDate,
    p_due_time: input.dueTime,
  });
}

/** FIN-038: move an Open task between the neighbours the caller sees (ADR-0005). */
export async function moveTask(ctx: FinisherContext, taskId: string, body: Body): Promise<void> {
  const id = requireId(taskId);
  const input = unwrap(parseMoveInput(body, id));
  await rpc(ctx, "finisher_move_task", { p_task_id: id, p_after_id: input.afterId, p_before_id: input.beforeId });
}

/** FIN-039: start a 25-minute Pomodoro on an Open task (ADR-0007). */
export async function startPomodoro(ctx: FinisherContext, taskId: string, body: Body): Promise<{ id: string }> {
  const id = requireId(taskId);
  const input = unwrap(parseStartPomodoro(body));
  const pomodoroId = await rpc<string>(ctx, "finisher_start_pomodoro", { p_task_id: id, p_replace: input.replace });
  return { id: pomodoroId };
}

/** FIN-039: stop (abandon) the running Pomodoro; it isn't counted. */
export async function stopPomodoro(ctx: FinisherContext, pomodoroId: string): Promise<void> {
  const id = requireId(pomodoroId);
  await rpc(ctx, "finisher_stop_pomodoro", { p_id: id });
}

export async function deleteTask(ctx: FinisherContext, taskId: string): Promise<void> {
  const id = requireId(taskId);
  await rpc(ctx, "finisher_delete_task", { p_task_id: id });
}

export async function createProject(ctx: FinisherContext, body: Body): Promise<{ id: string }> {
  const input = unwrap(parseNewProject(body, ctx.now.date));
  const id = await rpc<string>(ctx, "finisher_create_project", {
    p_tz: ctx.timeZone,
    p_title: input.title,
    p_goal: input.goal,
    p_done_when: input.doneWhen,
    p_target_date: input.targetDate,
    p_slots: input.slots.map((slot) => ({
      activity: slot.activity,
      days: slot.days,
      durationMinutes: slot.durationMinutes,
      startTime: slot.startTime,
    })),
  });
  return { id };
}

export async function updateProject(ctx: FinisherContext, projectId: string, body: Body): Promise<void> {
  const id = requireId(projectId);
  const { data: current, error } = await ctx.supabase
    .from("finisher_projects")
    .select("target_date")
    .eq("id", id)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!current) throw notFound();
  const input = unwrap(parseProjectInput(body, ctx.now.date, (current as { target_date: string | null }).target_date));
  await rpc(ctx, "finisher_update_project", {
    p_tz: ctx.timeZone,
    p_project_id: id,
    p_title: input.title,
    p_goal: input.goal,
    p_done_when: input.doneWhen,
    p_target_date: input.targetDate,
  });
}

export async function projectAction(ctx: FinisherContext, projectId: string, body: Body): Promise<{ status: string }> {
  const id = requireId(projectId);
  const input = unwrap(parseProjectAction(body, ctx.now.date));
  const note = input.action === "finish" ? input.reflection : input.action === "let_go" ? input.reason : null;
  const status = await rpc<string>(ctx, "finisher_project_action", {
    p_tz: ctx.timeZone,
    p_project_id: id,
    p_action: input.action,
    p_revisit_date: input.action === "park" ? input.revisitDate : null,
    p_note: note,
  });
  return { status };
}

export async function deleteProject(ctx: FinisherContext, projectId: string): Promise<void> {
  const id = requireId(projectId);
  await rpc(ctx, "finisher_delete_project", { p_project_id: id });
}

export async function addSlot(ctx: FinisherContext, projectId: string, body: Body): Promise<{ id: string }> {
  const id = requireId(projectId);
  const input = unwrap(parseSlotInput(body));
  const slotId = await rpc<string>(ctx, "finisher_add_slot", {
    p_tz: ctx.timeZone,
    p_project_id: id,
    p_activity: input.activity,
    p_days: input.days,
    p_duration_minutes: input.durationMinutes,
    p_start_time: input.startTime,
  });
  return { id: slotId };
}

export async function updateSlot(ctx: FinisherContext, slotId: string, body: Body): Promise<void> {
  const id = requireId(slotId);
  const input = unwrap(parseSlotInput(body));
  await rpc(ctx, "finisher_update_slot", {
    p_tz: ctx.timeZone,
    p_slot_id: id,
    p_activity: input.activity,
    p_days: input.days,
    p_duration_minutes: input.durationMinutes,
    p_start_time: input.startTime,
  });
}

export async function removeSlot(ctx: FinisherContext, slotId: string): Promise<void> {
  const id = requireId(slotId);
  await rpc(ctx, "finisher_remove_slot", { p_tz: ctx.timeZone, p_slot_id: id });
}

export async function markSession(ctx: FinisherContext, body: Body): Promise<{ state: string }> {
  const input = unwrap(parseMarkInput(body));
  const state = await rpc<string>(ctx, "finisher_mark_session", {
    p_tz: ctx.timeZone,
    p_slot_id: input.slotId,
    p_date: input.date,
    p_state: input.state,
  });
  return { state };
}
