import { queryOptions } from "@tanstack/react-query";
import { apiFetch, type ApiMethod } from "@/lib/api";
import type { LocalDate } from "./domain/dates";
import type { FieldErrors } from "./domain/validation";
import type { FinisherApiErrorCode } from "./messages";
import type {
  ClosedOutcome,
  ClosedTabData,
  ClosedType,
  ProjectDetail,
  ProjectOption,
  ProjectsTabData,
  TaskDetail,
  TasksTabData,
  TodayData,
} from "./types";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: FinisherApiErrorCode; fields?: FieldErrors };

/** Same name the Worker reads (src/features/finisher/server/context.ts). */
const TIME_ZONE_HEADER = "X-Time-Zone";

function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Calls a same-origin /api/finisher endpoint with JSON. Never throws. Sends
 * the browser's timezone, so the server computes "today" in the user's zone
 * (assumption A1); a change of zone (travel) applies from the next request.
 */
export async function finisherApi<T = Record<string, unknown>>(
  method: ApiMethod,
  path: string,
  body?: Record<string, unknown>,
): Promise<ApiResult<T>> {
  const zone = browserTimeZone();
  const result = await apiFetch<T, FinisherApiErrorCode>(method, path, body, zone ? { [TIME_ZONE_HEADER]: zone } : {});
  return result as ApiResult<T>;
}

/** A failed read. Views show the error state with Retry and no error detail (FIN-001). */
export class FinisherLoadError extends Error {
  constructor(readonly code: FinisherApiErrorCode) {
    super(code);
    this.name = "FinisherLoadError";
  }
}

async function load<T>(path: string): Promise<T> {
  const result = await finisherApi<T>("GET", path);
  if (!result.ok) throw new FinisherLoadError(result.error);
  return result.data;
}

/** Like load, but a missing (or another user's) record is null rather than an error. */
async function loadOrNull<T>(path: string): Promise<T | null> {
  const result = await finisherApi<T>("GET", path);
  if (result.ok) return result.data;
  if (result.error === "not_found") return null;
  throw new FinisherLoadError(result.error);
}

function withQuery(path: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

/**
 * Every Finisher read, keyed under "finisher" so a successful write can
 * refresh them all at once (components/use-refresh.ts). Personal data lives
 * only in this in-memory cache, never in browser storage.
 */
export const finisherKeys = { all: ["finisher"] as const };

export const finisherQueries = {
  basics: () =>
    queryOptions({
      queryKey: ["finisher", "basics"],
      queryFn: () => load<{ today: LocalDate; projects: ProjectOption[] }>("/api/finisher/basics"),
    }),
  today: () => queryOptions({ queryKey: ["finisher", "today"], queryFn: () => load<TodayData>("/api/finisher/today") }),
  tasks: (project: string | undefined) =>
    queryOptions({
      queryKey: ["finisher", "tasks", project ?? "all"],
      queryFn: () => load<TasksTabData>(withQuery("/api/finisher/tasks", { project })),
    }),
  task: (id: string) =>
    queryOptions({
      queryKey: ["finisher", "task", id],
      queryFn: () =>
        loadOrNull<{ task: TaskDetail; projects: ProjectOption[]; today: LocalDate }>(`/api/finisher/tasks/${encodeURIComponent(id)}`),
    }),
  projects: () =>
    queryOptions({ queryKey: ["finisher", "projects"], queryFn: () => load<ProjectsTabData>("/api/finisher/projects") }),
  project: (id: string) =>
    queryOptions({
      queryKey: ["finisher", "project", id],
      queryFn: () => loadOrNull<ProjectDetail>(`/api/finisher/projects/${encodeURIComponent(id)}`),
    }),
  closed: (type: ClosedType | undefined, outcome: ClosedOutcome | undefined) =>
    queryOptions({
      queryKey: ["finisher", "closed", type ?? "all", outcome ?? "all"],
      queryFn: () => load<ClosedTabData>(withQuery("/api/finisher/closed", { type, outcome })),
    }),
};
