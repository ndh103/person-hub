import {
  addDays,
  diffDays,
  isOverdue,
  localDateOf,
  startOfWeek,
  toLocalTime,
  zonedToUtc,
  type LocalDate,
  type LocalNow,
} from "../domain/dates";
import {
  compareSessions,
  isInMarkingWindow,
  listSessions,
  MARKING_WINDOW_DAYS,
  summarizeWeek,
  weekStarts,
  type ActivePeriod,
  type ScheduledSession,
  type SessionMark,
  type SlotVersion,
} from "../domain/schedule";
import { isUuid } from "../domain/validation";
import {
  TASK_GROUPS,
  type ClosedCounts,
  type ClosedEntry,
  type ClosedOutcome,
  type ClosedTabData,
  type ClosedType,
  type FinisherBasics,
  type ProjectCard,
  type ProjectDetail,
  type ProjectFilter,
  type ProjectOption,
  type ProjectsTabData,
  type ProjectStatus,
  type SessionItem,
  type SlotItem,
  type StripRow,
  type TaskDetail,
  type TaskGroupKey,
  type TaskItem,
  type TaskPage,
  type TasksTabData,
  type TaskStatus,
  type ReviewTask,
  type TaskList,
  type WeekData,
  type WeekReviewData,
} from "../types";
import { weekDates } from "../domain/week";
import type { FinisherContext } from "./context";
import { FinisherError, fromDbError } from "./errors";
import { getPomodoroSummary, getTaskPomodoros } from "./pomodoros";

/**
 * Finisher reads. Every query runs with the caller's session, so RLS limits
 * rows to the caller; queries never filter by a client-supplied user ID.
 * Results are mapped to narrow view models (types.ts).
 */
export const TASK_PAGE_SIZE = 50;
export const CLOSED_PAGE_SIZE = 20;
/** Weeks before the current one shown on a project page (FIN-028). */
const PREVIOUS_WEEKS = 4;
/** Keeps PostgREST `in (…)` filters well under URL length limits. */
const ID_CHUNK = 80;

const TASK_COLUMNS = "id, title, status, due_date, due_time, revisit_date, project_id";

type TaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  due_time: string | null;
  revisit_date: string | null;
  project_id: string | null;
};

type ProjectIndexRow = { id: string; title: string; status: ProjectStatus; revisit_date: string | null };

type Result<T> = { data: T | null; error: { code?: string; message?: string } | null };

function rows<T>(result: Result<unknown>): T {
  if (result.error) throw fromDbError(result.error);
  return (result.data ?? []) as T;
}

function chunks<T>(items: T[], size = ID_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// Shared loaders
// ---------------------------------------------------------------------------

async function projectIndex(ctx: FinisherContext): Promise<Map<string, ProjectIndexRow>> {
  const data = rows<ProjectIndexRow[]>(
    await ctx.supabase.from("finisher_projects").select("id, title, status, revisit_date").order("created_at").limit(1000),
  );
  return new Map(data.map((row) => [row.id, row]));
}

function projectOptions(index: Map<string, ProjectIndexRow>): ProjectOption[] {
  return [...index.values()]
    .filter((project) => project.status === "active" || project.status === "parked")
    .map(({ id, title, status }) => ({ id, title, status }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

function toTaskItem(row: TaskRow, index: Map<string, ProjectIndexRow>, now: LocalNow): TaskItem {
  const dueTime = toLocalTime(row.due_time);
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    dueDate: row.due_date,
    dueTime,
    revisitDate: row.revisit_date,
    projectId: row.project_id,
    projectTitle: row.project_id ? (index.get(row.project_id)?.title ?? null) : null,
    overdue: row.status === "open" && isOverdue(row.due_date, dueTime, now),
  };
}

type ProjectSchedule = {
  versions: SlotVersion[];
  periods: ActivePeriod[];
  marks: SessionMark[];
  slots: { id: string; removedOn: LocalDate | null; createdAt: string }[];
};

/** Slot versions, active periods and marks overlapping [from, to] for the given projects. */
async function loadSchedules(
  ctx: FinisherContext,
  projectIds: string[],
  from: LocalDate,
  to: LocalDate,
): Promise<Map<string, ProjectSchedule>> {
  const byProject = new Map<string, ProjectSchedule>(
    projectIds.map((id) => [id, { versions: [], periods: [], marks: [], slots: [] }]),
  );
  if (projectIds.length === 0) return byProject;

  const slotProject = new Map<string, string>();
  for (const ids of chunks(projectIds)) {
    const [slots, periods] = await Promise.all([
      ctx.supabase.from("finisher_slots").select("id, project_id, removed_on, created_at").in("project_id", ids),
      ctx.supabase
        .from("finisher_project_periods")
        .select("project_id, start_on, end_on")
        .in("project_id", ids)
        .lte("start_on", to)
        .or(`end_on.is.null,end_on.gt.${from}`),
    ]);
    for (const slot of rows<{ id: string; project_id: string; removed_on: string | null; created_at: string }[]>(slots)) {
      slotProject.set(slot.id, slot.project_id);
      byProject.get(slot.project_id)?.slots.push({ id: slot.id, removedOn: slot.removed_on, createdAt: slot.created_at });
    }
    for (const period of rows<{ project_id: string; start_on: string; end_on: string | null }[]>(periods)) {
      byProject.get(period.project_id)?.periods.push({ start: period.start_on, end: period.end_on });
    }
  }

  for (const ids of chunks([...slotProject.keys()])) {
    const [versions, marks] = await Promise.all([
      ctx.supabase
        .from("finisher_slot_versions")
        .select("slot_id, valid_from, valid_to, activity, days, duration_minutes, start_time")
        .in("slot_id", ids)
        .lte("valid_from", to)
        .or(`valid_to.is.null,valid_to.gt.${from}`),
      ctx.supabase
        .from("finisher_session_marks")
        .select("slot_id, session_date, state")
        .in("slot_id", ids)
        .gte("session_date", from)
        .lte("session_date", to),
    ]);
    type VersionRow = {
      slot_id: string;
      valid_from: string;
      valid_to: string | null;
      activity: string;
      days: number[];
      duration_minutes: number;
      start_time: string | null;
    };
    for (const version of rows<VersionRow[]>(versions)) {
      byProject.get(slotProject.get(version.slot_id) ?? "")?.versions.push({
        slotId: version.slot_id,
        validFrom: version.valid_from,
        validTo: version.valid_to,
        activity: version.activity,
        days: version.days,
        durationMinutes: version.duration_minutes,
        startTime: toLocalTime(version.start_time),
      });
    }
    for (const mark of rows<{ slot_id: string; session_date: string; state: "done" | "skipped" }[]>(marks)) {
      byProject.get(slotProject.get(mark.slot_id) ?? "")?.marks.push({
        slotId: mark.slot_id,
        date: mark.session_date,
        state: mark.state,
      });
    }
  }

  for (const schedule of byProject.values()) {
    const order = new Map(schedule.slots.map((slot) => [slot.id, slot.createdAt + slot.id]));
    schedule.versions.sort((a, b) => (order.get(a.slotId) ?? "").localeCompare(order.get(b.slotId) ?? ""));
  }
  return byProject;
}

function sessionsFor(schedule: ProjectSchedule | undefined, from: LocalDate, to: LocalDate): ScheduledSession[] {
  if (!schedule) return [];
  return listSessions({ versions: schedule.versions, periods: schedule.periods, marks: schedule.marks, from, to });
}

// ---------------------------------------------------------------------------
// Week tab (FIN-042 to FIN-047, ADR-0008)
// ---------------------------------------------------------------------------

/** Dated tasks in one week read; a personal week holds far fewer. */
const WEEK_TASK_LIMIT = 500;
/** Unplanned and carried-over tasks loaded per week read (TD-FIN-1). */
export const WEEK_LIST_LIMIT = 200;

/** Sessions of every project between `from` and `to`, with project titles, timed first. */
async function weekSessions(
  ctx: FinisherContext,
  index: Map<string, ProjectIndexRow>,
  from: LocalDate,
  to: LocalDate,
): Promise<{ projectId: string; sessions: ScheduledSession[] }[]> {
  // Every project: a Parked or closed one still shows the sessions it had while Active (FIN-045).
  const ids = [...index.keys()];
  const schedules = await loadSchedules(ctx, ids, from, to);
  return ids.map((projectId) => ({ projectId, sessions: sessionsFor(schedules.get(projectId), from, to) }));
}

async function taskList(
  query: PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null; count: number | null }>,
  index: Map<string, ProjectIndexRow>,
  now: LocalNow,
): Promise<TaskList> {
  const result = await query;
  const items = rows<TaskRow[]>(result).map((row) => toTaskItem(row, index, now));
  return { items, total: result.count ?? items.length };
}

/** The week board (FIN-043): sessions and tasks per day, Unplanned, and Carried over for the current week. */
export async function getWeek(ctx: FinisherContext, weekStart: LocalDate): Promise<WeekData> {
  const { now } = ctx;
  const dates = weekDates(weekStart);
  const weekEnd = dates[6];
  const current = weekStart === startOfWeek(now.date);
  const index = await projectIndex(ctx);

  const openTasks = () =>
    ctx.supabase.from("finisher_tasks").select(TASK_COLUMNS, { count: "exact" }).eq("status", "open");

  const [sessions, datedRows, unplanned, carried, parkedTasks] = await Promise.all([
    weekSessions(ctx, index, weekStart, weekEnd),
    ctx.supabase
      .from("finisher_tasks")
      .select(TASK_COLUMNS)
      .in("status", ["open", "done", "delegated"]) // finished ones stay on their day (decision 36)
      .gte("due_date", weekStart)
      .lte("due_date", weekEnd)
      .order("sort_key") // the user's task order (FIN-038)
      .order("id")
      .limit(WEEK_TASK_LIMIT),
    taskList(openTasks().is("due_date", null).order("sort_key").order("id").limit(WEEK_LIST_LIMIT), index, now),
    current
      ? taskList(openTasks().lt("due_date", now.date).order("sort_key").order("id").limit(WEEK_LIST_LIMIT), index, now)
      : Promise.resolve(null),
    current
      ? ctx.supabase.from("finisher_tasks").select("id", { count: "exact", head: true }).eq("status", "parked").lte("revisit_date", now.date)
      : Promise.resolve(null),
  ]);
  if (parkedTasks?.error) throw fromDbError(parkedTasks.error);

  const dated = rows<TaskRow[]>(datedRows).map((row) => toTaskItem(row, index, now));
  const daySessions = new Map<LocalDate, SessionItem[]>(dates.map((date) => [date, []]));
  for (const { projectId, sessions: list } of sessions) {
    for (const session of list) {
      daySessions.get(session.date)?.push({ ...session, projectId, projectTitle: index.get(projectId)?.title ?? "" });
    }
  }

  return {
    now,
    weekStart,
    days: dates.map((date) => ({
      date,
      sessions: (daySessions.get(date) ?? []).sort(compareSessions),
      // In the current week, open tasks from earlier days are shown once, as carried over (FIN-046).
      open: current && date < now.date ? [] : dated.filter((task) => task.status === "open" && task.dueDate === date),
      finished: dated.filter((task) => task.status !== "open" && task.dueDate === date),
    })),
    unplanned,
    carried,
    revisitDue: parkedTasks
      ? {
          tasks: parkedTasks.count ?? 0,
          projects: [...index.values()].filter(
            (project) => project.status === "parked" && project.revisit_date !== null && project.revisit_date <= now.date,
          ).length,
        }
      : null,
    projects: projectOptions(index),
  };
}

/** The weekly review (FIN-047) of the current or a past week. */
export async function getWeekReview(ctx: FinisherContext, weekStart: LocalDate): Promise<WeekReviewData> {
  const { now } = ctx;
  if (weekStart > startOfWeek(now.date)) throw new FinisherError("not_allowed", 409);
  const dates = weekDates(weekStart);
  const weekEnd = dates[6];
  const from = zonedToUtc(weekStart, ctx.timeZone).toISOString();
  const to = zonedToUtc(addDays(weekStart, 7), ctx.timeZone).toISOString();
  const nowIso = new Date().toISOString();
  const index = await projectIndex(ctx);

  const [sessions, closedRows, dueRows, pomodoroRows, noteRow] = await Promise.all([
    weekSessions(ctx, index, weekStart, weekEnd),
    ctx.supabase
      .from("finisher_tasks")
      .select(`${TASK_COLUMNS}, close_note, closed_at`)
      .in("status", ["done", "delegated", "let_go"])
      .gte("closed_at", from)
      .lt("closed_at", to)
      .order("closed_at")
      .limit(WEEK_TASK_LIMIT),
    ctx.supabase
      .from("finisher_tasks")
      .select(TASK_COLUMNS)
      .eq("status", "open")
      .gte("due_date", weekStart)
      .lte("due_date", weekEnd < now.date ? weekEnd : now.date)
      .order("sort_key")
      .order("id")
      .limit(WEEK_TASK_LIMIT),
    // Completed sessions: not stopped and already ended, counted on their local end date (FIN-040).
    ctx.supabase
      .from("finisher_pomodoros")
      .select("ends_at")
      .is("stopped_at", null)
      .gte("ends_at", from)
      .lt("ends_at", to)
      .lte("ends_at", nowIso)
      .limit(1000),
    ctx.supabase.from("finisher_weekly_notes").select("note").eq("week_start", weekStart).maybeSingle(),
  ]);
  if (noteRow.error) throw fromDbError(noteRow.error);

  const closed: ReviewTask[] = rows<(TaskRow & { close_note: string | null; closed_at: string })[]>(closedRows).map((row) => ({
    ...toTaskItem(row, index, now),
    closedOn: localDateOf(row.closed_at, ctx.timeZone),
    note: row.close_note,
  }));

  const perDay = new Map<LocalDate, number>(dates.map((date) => [date, 0]));
  for (const row of rows<{ ends_at: string }[]>(pomodoroRows)) {
    const date = localDateOf(row.ends_at, ctx.timeZone);
    if (perDay.has(date)) perDay.set(date, perDay.get(date)! + 1);
  }

  return {
    now,
    weekStart,
    done: closed.filter((task) => task.status !== "let_go"),
    letGo: closed.filter((task) => task.status === "let_go"),
    slipped: rows<TaskRow[]>(dueRows)
      .map((row) => toTaskItem(row, index, now))
      .filter((task) => task.overdue),
    projects: sessions
      .filter(({ sessions: list }) => list.length > 0)
      .map(({ projectId, sessions: list }) => ({
        id: projectId,
        title: index.get(projectId)?.title ?? "",
        week: summarizeWeek(list, weekStart, now.date),
      }))
      .sort((a, b) => a.title.localeCompare(b.title)),
    pomodoros: dates.map((date) => ({ date, completed: perDay.get(date) ?? 0 })),
    note: (noteRow.data as { note: string } | null)?.note ?? null,
    projectOptions: projectOptions(index),
  };
}

// ---------------------------------------------------------------------------
// Tasks tab (FIN-022)
// ---------------------------------------------------------------------------

export function parseProjectFilter(value: unknown): ProjectFilter {
  if (value === "none") return "none";
  if (isUuid(value)) return value.toLowerCase();
  return "all";
}

export function isTaskGroup(value: unknown): value is TaskGroupKey {
  return typeof value === "string" && (TASK_GROUPS as readonly string[]).includes(value);
}

async function taskGroupPage(
  ctx: FinisherContext,
  index: Map<string, ProjectIndexRow>,
  group: TaskGroupKey,
  filter: ProjectFilter,
  offset: number,
): Promise<TaskPage> {
  const { now } = ctx;
  let query = ctx.supabase.from("finisher_tasks").select(TASK_COLUMNS);
  if (filter === "none") query = query.is("project_id", null);
  else if (filter !== "all") query = query.eq("project_id", filter);

  switch (group) {
    case "overdue":
      query = query
        .eq("status", "open")
        .or(`due_date.lt.${now.date},and(due_date.eq.${now.date},due_time.lte.${now.time})`)
        .order("sort_key");
      break;
    case "today":
      query = query
        .eq("status", "open")
        .eq("due_date", now.date)
        .or(`due_time.is.null,due_time.gt.${now.time}`)
        .order("sort_key");
      break;
    case "upcoming":
      query = query
        .eq("status", "open")
        .gt("due_date", now.date)
        .order("sort_key");
      break;
    case "nodate":
      query = query.eq("status", "open").is("due_date", null).order("sort_key");
      break;
    case "parked":
      query = query.eq("status", "parked").order("revisit_date");
      break;
  }
  const data = rows<TaskRow[]>(await query.order("id").range(offset, offset + TASK_PAGE_SIZE));
  return {
    items: data.slice(0, TASK_PAGE_SIZE).map((row) => toTaskItem(row, index, now)),
    nextOffset: data.length > TASK_PAGE_SIZE ? offset + TASK_PAGE_SIZE : null,
  };
}

export async function getTasksTab(ctx: FinisherContext, filterValue: unknown): Promise<TasksTabData> {
  const index = await projectIndex(ctx);
  const filter = parseProjectFilter(filterValue);
  const pages = await Promise.all(TASK_GROUPS.map((group) => taskGroupPage(ctx, index, group, filter, 0)));
  return {
    now: ctx.now,
    filter,
    groups: Object.fromEntries(TASK_GROUPS.map((group, i) => [group, pages[i]])) as Record<TaskGroupKey, TaskPage>,
    projects: projectOptions(index),
  };
}

/** One more page of a task group ("Load more"). Offsets are bounded by the caller. */
export async function getTaskGroup(ctx: FinisherContext, group: TaskGroupKey, filterValue: unknown, offset: number): Promise<TaskPage> {
  const index = await projectIndex(ctx);
  return taskGroupPage(ctx, index, group, parseProjectFilter(filterValue), offset);
}

/** Task page data: the task, project options for editing, and the caller's today. */
export async function getTaskPage(
  ctx: FinisherContext,
  taskId: string,
): Promise<{ task: TaskDetail; projects: ProjectOption[]; today: LocalDate } | null> {
  const task = await getTask(ctx, taskId);
  if (!task) return null;
  return { task, projects: projectOptions(await projectIndex(ctx)), today: ctx.now.date };
}

export async function getTask(ctx: FinisherContext, taskId: string): Promise<TaskDetail | null> {
  if (!isUuid(taskId)) return null;
  const result = await ctx.supabase
    .from("finisher_tasks")
    .select(`${TASK_COLUMNS}, notes, close_note, closed_at, created_at`)
    .eq("id", taskId)
    .maybeSingle();
  if (result.error) throw fromDbError(result.error);
  if (!result.data) return null;
  const row = result.data as TaskRow & { notes: string | null; close_note: string | null; closed_at: string | null; created_at: string };
  const [index, pomodoros] = await Promise.all([projectIndex(ctx), getTaskPomodoros(ctx, row.id)]);
  return {
    ...toTaskItem(row, index, ctx.now),
    pomodoros,
    notes: row.notes,
    reason: row.close_note,
    createdOn: localDateOf(row.created_at, ctx.timeZone),
    closedOn: row.closed_at ? localDateOf(row.closed_at, ctx.timeZone) : null,
    projectStatus: row.project_id ? (index.get(row.project_id)?.status ?? null) : null,
  };
}

/** What "Add task" and "New project" need: the caller's today and project options. */
export async function getFinisherBasics(ctx: FinisherContext): Promise<FinisherBasics> {
  const { now } = ctx;
  const index = await projectIndex(ctx);
  const activeIds = [...index.values()].filter((project) => project.status === "active").map((project) => project.id);

  const [open, pomodoro] = await Promise.all([
    ctx.supabase.from("finisher_tasks").select("id", { count: "exact", head: true }).eq("status", "open"),
    getPomodoroSummary(ctx),
  ]);
  if (open.error) throw fromDbError(open.error);

  // FIN-035: open tasks and active projects (the Today count went with the Today tab, decision 40).
  return {
    today: now.date,
    projects: projectOptions(index),
    counts: { tasks: open.count ?? 0, projects: activeIds.length },
    pomodoro, // FIN-039, FIN-040
  };
}

// ---------------------------------------------------------------------------
// Projects tab (FIN-033) and project detail (FIN-024)
// ---------------------------------------------------------------------------

export async function getProjectsTab(ctx: FinisherContext): Promise<ProjectsTabData> {
  const { now } = ctx;
  const index = await projectIndex(ctx);
  const open = [...index.values()].filter((project) => project.status === "active" || project.status === "parked");
  const weekStart = startOfWeek(now.date);
  const weekEnd = addDays(weekStart, 6);
  const activeIds = open.filter((project) => project.status === "active").map((project) => project.id);

  const [schedules, taskRows] = await Promise.all([
    loadSchedules(ctx, activeIds, weekStart, weekEnd),
    ctx.supabase.from("finisher_tasks").select("project_id").eq("status", "open").not("project_id", "is", null).limit(5000),
  ]);
  const openTasks = new Map<string, number>();
  for (const row of rows<{ project_id: string }[]>(taskRows)) {
    openTasks.set(row.project_id, (openTasks.get(row.project_id) ?? 0) + 1);
  }

  const cards: ProjectCard[] = open.map((project) => {
    const sessions = sessionsFor(schedules.get(project.id), weekStart, weekEnd);
    const today = sessions.filter((session) => session.date === now.date);
    return {
      id: project.id,
      title: project.title,
      status: project.status,
      revisitDate: project.revisit_date,
      week: summarizeWeek(sessions, weekStart, now.date),
      todaySessions: { total: today.length, done: today.filter((session) => session.state === "done").length },
      openTasks: openTasks.get(project.id) ?? 0,
    };
  });
  return {
    now,
    active: cards.filter((card) => card.status === "active").sort((a, b) => a.title.localeCompare(b.title)),
    parked: cards
      .filter((card) => card.status === "parked")
      .sort((a, b) => (a.revisitDate ?? "").localeCompare(b.revisitDate ?? "")),
  };
}

type ProjectRow = {
  id: string;
  title: string;
  goal: string | null;
  done_when: string;
  target_date: string | null;
  status: ProjectStatus;
  revisit_date: string | null;
  close_note: string | null;
  started_on: string;
  closed_at: string | null;
};

export async function getProject(ctx: FinisherContext, projectId: string): Promise<ProjectDetail | null> {
  if (!isUuid(projectId)) return null;
  const { now } = ctx;
  const result = await ctx.supabase
    .from("finisher_projects")
    .select("id, title, goal, done_when, target_date, status, revisit_date, close_note, started_on, closed_at")
    .eq("id", projectId)
    .maybeSingle();
  if (result.error) throw fromDbError(result.error);
  if (!result.data) return null;
  const project = result.data as ProjectRow;

  const weeks = weekStarts(now.date, PREVIOUS_WEEKS);
  const windowStart = addDays(now.date, -MARKING_WINDOW_DAYS);
  const from = weeks.at(-1)! < windowStart ? weeks.at(-1)! : windowStart;
  const to = addDays(weeks[0], 6);

  const [index, schedules, openRows, closedRows] = await Promise.all([
    projectIndex(ctx),
    loadSchedules(ctx, [project.id], from, to),
    ctx.supabase
      .from("finisher_tasks")
      .select(TASK_COLUMNS)
      .eq("project_id", project.id)
      .in("status", ["open", "parked"])
      .order("status")
      .order("sort_key") // open tasks in the user's order (A13), then parked
      .order("id")
      .limit(200),
    ctx.supabase
      .from("finisher_tasks")
      .select(TASK_COLUMNS)
      .eq("project_id", project.id)
      .in("status", ["done", "delegated", "let_go"])
      .order("closed_at", { ascending: false })
      .limit(50),
  ]);
  const schedule = schedules.get(project.id)!;
  const sessions = sessionsFor(schedule, from, to);

  const stripDates = Array.from({ length: MARKING_WINDOW_DAYS + 1 }, (_, i) => addDays(windowStart, i));
  const current = new Map(schedule.versions.filter((version) => version.validTo === null).map((v) => [v.slotId, v]));
  const strip: StripRow[] = [];
  for (const slot of schedule.slots) {
    const slotSessions = new Map(
      sessions.filter((session) => session.slotId === slot.id && session.date >= windowStart && session.date <= now.date).map((s) => [s.date, s]),
    );
    if (slot.removedOn !== null && slotSessions.size === 0) continue;
    const latest = current.get(slot.id) ?? [...slotSessions.values()].at(-1);
    if (!latest) continue;
    strip.push({
      slotId: slot.id,
      activity: latest.activity,
      removed: slot.removedOn !== null,
      cells: stripDates.map((date) => {
        const session = slotSessions.get(date);
        return { date, state: session?.state ?? null, markable: Boolean(session) && isInMarkingWindow(date, now.date) };
      }),
    });
  }

  const slots: SlotItem[] = schedule.slots
    .filter((slot) => slot.removedOn === null && current.has(slot.id))
    .map((slot) => {
      const version = current.get(slot.id)!;
      return {
        id: slot.id,
        activity: version.activity,
        days: version.days,
        durationMinutes: version.durationMinutes,
        startTime: version.startTime,
      };
    });

  return {
    now,
    id: project.id,
    title: project.title,
    goal: project.goal,
    doneWhen: project.done_when,
    targetDate: project.target_date,
    status: project.status,
    revisitDate: project.revisit_date,
    note: project.close_note,
    startedOn: project.started_on,
    closedOn: project.closed_at ? localDateOf(project.closed_at, ctx.timeZone) : null,
    slots,
    stripDates,
    strip,
    weeks: weeks.map((weekStart) => summarizeWeek(sessions, weekStart, now.date)),
    openTasks: rows<TaskRow[]>(openRows).map((row) => toTaskItem(row, index, now)),
    closedTasks: rows<TaskRow[]>(closedRows).map((row) => toTaskItem(row, index, now)),
    projects: projectOptions(index),
  };
}

// ---------------------------------------------------------------------------
// Closed tab (FIN-032)
// ---------------------------------------------------------------------------

export function parseClosedType(value: unknown): ClosedType {
  return value === "tasks" || value === "projects" ? value : "all";
}

export function parseClosedOutcome(value: unknown): ClosedOutcome {
  return value === "completed" || value === "delegated" || value === "let_go" ? value : "all";
}

/** Cursor = closed_at of the last entry shown. Anything unparsable starts from the top. */
export function parseClosedCursor(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

async function countRows(ctx: FinisherContext, table: string, status: string): Promise<number> {
  const result = await ctx.supabase.from(table).select("id", { count: "exact", head: true }).eq("status", status);
  if (result.error) throw fromDbError(result.error);
  return result.count ?? 0;
}

export async function getClosed(ctx: FinisherContext, typeValue: unknown, outcomeValue: unknown, cursorValue: unknown): Promise<ClosedTabData> {
  const type = parseClosedType(typeValue);
  const outcome = parseClosedOutcome(outcomeValue);
  const cursor = parseClosedCursor(cursorValue);
  const wantTasks = type !== "projects";
  // Only tasks can be delegated (FIN-041).
  const wantProjects = type !== "tasks" && outcome !== "delegated";
  const wants = (status: "completed" | "delegated" | "let_go") => outcome === "all" || outcome === status;
  const taskStatuses = outcome === "all" ? ["done", "delegated", "let_go"] : [outcome === "completed" ? "done" : outcome];
  const projectStatuses = outcome === "completed" ? ["finished"] : outcome === "let_go" ? ["let_go"] : ["finished", "let_go"];

  const withCursor = <Q extends { lt: (column: string, value: string) => Q }>(query: Q) =>
    cursor ? query.lt("closed_at", cursor) : query;

  const [taskRows, projectRows, counts] = await Promise.all([
    wantTasks
      ? withCursor(
          ctx.supabase
            .from("finisher_tasks")
            .select("id, title, status, close_note, closed_at")
            .in("status", taskStatuses),
        )
          .order("closed_at", { ascending: false })
          .limit(CLOSED_PAGE_SIZE + 1)
      : Promise.resolve({ data: [], error: null }),
    wantProjects
      ? withCursor(
          ctx.supabase
            .from("finisher_projects")
            .select("id, title, status, close_note, closed_at, started_on")
            .in("status", projectStatuses),
        )
          .order("closed_at", { ascending: false })
          .limit(CLOSED_PAGE_SIZE + 1)
      : Promise.resolve({ data: [], error: null }),
    Promise.all([
      wantTasks && wants("completed") ? countRows(ctx, "finisher_tasks", "done") : 0,
      wantTasks && wants("delegated") ? countRows(ctx, "finisher_tasks", "delegated") : 0,
      wantTasks && wants("let_go") ? countRows(ctx, "finisher_tasks", "let_go") : 0,
      wantProjects && wants("completed") ? countRows(ctx, "finisher_projects", "finished") : 0,
      wantProjects && wants("let_go") ? countRows(ctx, "finisher_projects", "let_go") : 0,
    ]),
  ]);

  type ClosedRow = { id: string; title: string; status: string; close_note: string | null; closed_at: string; started_on?: string };
  const merged = [
    ...rows<ClosedRow[]>(taskRows).map((row) => ({ kind: "task" as const, row })),
    ...rows<ClosedRow[]>(projectRows).map((row) => ({ kind: "project" as const, row })),
  ].sort((a, b) => b.row.closed_at.localeCompare(a.row.closed_at));
  const page = merged.slice(0, CLOSED_PAGE_SIZE);

  const projectPage = page.filter((entry) => entry.kind === "project").map((entry) => entry.row);
  const earliest = projectPage.reduce<LocalDate | null>(
    (min, row) => (min === null || row.started_on! < min ? row.started_on! : min),
    null,
  );
  const schedules = earliest
    ? await loadSchedules(ctx, projectPage.map((row) => row.id), earliest, ctx.now.date)
    : new Map<string, ProjectSchedule>();

  const items: ClosedEntry[] = page.map(({ kind, row }) => {
    const closedOn = localDateOf(row.closed_at, ctx.timeZone);
    let sessions: ClosedEntry["sessions"] = null;
    let durationDays: number | null = null;
    if (kind === "project" && row.started_on) {
      durationDays = Math.max(0, diffDays(row.started_on, closedOn));
      const all = sessionsFor(schedules.get(row.id), row.started_on, closedOn < ctx.now.date ? closedOn : ctx.now.date);
      sessions = { done: all.filter((session) => session.state === "done").length, scheduled: all.length };
    }
    return {
      kind,
      id: row.id,
      title: row.title,
      outcome: row.status === "let_go" || row.status === "delegated" ? row.status : kind === "task" ? "done" : "finished",
      closedAt: row.closed_at,
      closedOn,
      note: row.close_note,
      durationDays,
      sessions,
    };
  });

  const [tasksDone, tasksDelegated, tasksLetGo, projectsFinished, projectsLetGo] = counts;
  const closedCounts: ClosedCounts = { tasksDone, tasksDelegated, tasksLetGo, projectsFinished, projectsLetGo };
  return {
    now: ctx.now,
    type,
    outcome,
    page: { items, nextCursor: merged.length > CLOSED_PAGE_SIZE ? page.at(-1)!.row.closed_at : null },
    counts: closedCounts,
  };
}
