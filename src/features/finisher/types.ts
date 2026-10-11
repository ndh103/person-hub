import type { LocalDate, LocalNow, LocalTime } from "./domain/dates";
import type { SessionState, WeekSummary } from "./domain/schedule";

/**
 * Narrow view models the server hands to pages and API clients. They carry
 * only what the UI shows: no user IDs, no internal history rows.
 */
export type TaskStatus = "open" | "parked" | "done" | "let_go";
export type ProjectStatus = "active" | "parked" | "finished" | "let_go";

export type TaskItem = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: LocalDate | null;
  dueTime: LocalTime | null;
  revisitDate: LocalDate | null;
  projectId: string | null;
  projectTitle: string | null;
  overdue: boolean;
};

export type TaskDetail = TaskItem & {
  notes: string | null;
  reason: string | null;
  createdOn: LocalDate;
  closedOn: LocalDate | null;
  projectStatus: ProjectStatus | null;
};

export type ProjectOption = { id: string; title: string; status: ProjectStatus };

export type SessionItem = {
  slotId: string;
  projectId: string;
  projectTitle: string;
  date: LocalDate;
  activity: string;
  durationMinutes: number;
  startTime: LocalTime | null;
  state: SessionState;
};

export type TodayData = {
  now: LocalNow;
  sessions: SessionItem[];
  overdue: TaskItem[];
  dueToday: TaskItem[];
  doneSessions: SessionItem[];
  doneTasks: TaskItem[];
  sessionsTotal: number;
  sessionsDone: number;
  revisitDue: { tasks: number; projects: number };
  projects: ProjectOption[];
};

export const TASK_GROUPS = ["overdue", "today", "upcoming", "nodate", "parked"] as const;
export type TaskGroupKey = (typeof TASK_GROUPS)[number];

/** "all", "none" (tasks without a project) or a project id. */
export type ProjectFilter = string;

export type TaskPage = { items: TaskItem[]; nextOffset: number | null };

export type TasksTabData = {
  now: LocalNow;
  filter: ProjectFilter;
  groups: Record<TaskGroupKey, TaskPage>;
  projects: ProjectOption[];
};

export type ProjectCard = {
  id: string;
  title: string;
  status: ProjectStatus;
  revisitDate: LocalDate | null;
  week: WeekSummary;
  todaySessions: { total: number; done: number };
  openTasks: number;
};

export type ProjectsTabData = { now: LocalNow; active: ProjectCard[]; parked: ProjectCard[] };

export type SlotItem = {
  id: string;
  activity: string;
  days: number[];
  durationMinutes: number;
  startTime: LocalTime | null;
};

export type StripCell = {
  date: LocalDate;
  /** null when no session is scheduled that day. */
  state: SessionState | null;
  markable: boolean;
};

export type StripRow = { slotId: string; activity: string; removed: boolean; cells: StripCell[] };

export type ProjectDetail = {
  now: LocalNow;
  id: string;
  title: string;
  goal: string | null;
  doneWhen: string;
  targetDate: LocalDate | null;
  status: ProjectStatus;
  revisitDate: LocalDate | null;
  note: string | null;
  startedOn: LocalDate;
  closedOn: LocalDate | null;
  slots: SlotItem[];
  stripDates: LocalDate[];
  strip: StripRow[];
  weeks: WeekSummary[];
  openTasks: TaskItem[];
  closedTasks: TaskItem[];
  projects: ProjectOption[];
};

export type ClosedType = "all" | "tasks" | "projects";
export type ClosedOutcome = "all" | "completed" | "let_go";

export type ClosedEntry = {
  kind: "task" | "project";
  id: string;
  title: string;
  outcome: "done" | "finished" | "let_go";
  closedAt: string;
  closedOn: LocalDate;
  note: string | null;
  durationDays: number | null;
  sessions: { done: number; scheduled: number } | null;
};

export type ClosedCounts = { tasksDone: number; tasksLetGo: number; projectsFinished: number; projectsLetGo: number };

export type ClosedPage = { items: ClosedEntry[]; nextCursor: string | null };

export type ClosedTabData = { now: LocalNow; type: ClosedType; outcome: ClosedOutcome; page: ClosedPage; counts: ClosedCounts };
