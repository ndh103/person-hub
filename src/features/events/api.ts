import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { apiFetch, type ApiMethod } from "@/lib/api";
import type { EventInput } from "./domain/validation";
import type { EventItem, EventsApiErrorCode, EventsApiResult, EventsPage } from "./types";

/** Calls a same-origin /api/events endpoint with JSON. Never throws. */
export async function eventsApi<T>(method: ApiMethod, path: string, body?: Record<string, unknown>): Promise<EventsApiResult<T>> {
  return (await apiFetch<T, EventsApiErrorCode>(method, path, body)) as EventsApiResult<T>;
}

/** A failed read. The page shows the error state with Retry and no error detail (EVT-002). */
export class EventsLoadError extends Error {
  constructor(readonly code: EventsApiErrorCode) {
    super(code);
    this.name = "EventsLoadError";
  }
}

export type EventsFilter = { q?: string; year?: number };

/**
 * Every Events read, keyed under "events" so a successful write can refresh
 * them all at once. Personal data lives only in this in-memory cache, never
 * in browser storage.
 */
export const eventsKeys = { all: ["events"] as const };

export const eventsQueries = {
  // Search text goes in the POST body, never in the API URL (EVT-007).
  list: ({ q, year }: EventsFilter) =>
    infiniteQueryOptions({
      queryKey: ["events", "list", { q: q ?? "", year: year ?? null }],
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam }) => {
        const result = await eventsApi<EventsPage>("POST", "/api/events/query", {
          ...(q ? { q } : {}),
          ...(year ? { year } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        });
        if (!result.ok) throw new EventsLoadError(result.error);
        return result.data;
      },
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    }),
  years: () =>
    queryOptions({
      queryKey: ["events", "years"],
      queryFn: async () => {
        const result = await eventsApi<{ years: number[] }>("GET", "/api/events/years");
        if (!result.ok) throw new EventsLoadError(result.error);
        return result.data.years;
      },
    }),
};

export function createEvent(input: EventInput) {
  return eventsApi<{ item: EventItem }>("POST", "/api/events", input);
}

export function updateEvent(id: string, input: EventInput) {
  return eventsApi<{ item: EventItem }>("PATCH", `/api/events/${encodeURIComponent(id)}`, input);
}

export function deleteEvent(id: string) {
  return eventsApi<{ ok: true }>("DELETE", `/api/events/${encodeURIComponent(id)}`);
}
