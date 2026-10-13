import type { LocalDate } from "@/lib/dates";
import type { EventFieldErrors } from "./domain/validation";

/** One event as the API returns it (docs/architecture/events.md). */
export type EventItem = {
  id: string;
  title: string;
  date: LocalDate;
  /** "HH:mm", a wall-clock time without a timezone (A10). */
  time: string | null;
  link: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  /** Which search group the event is in (EVT-009); null without search text. */
  match: "exact" | "accent" | null;
};

export type EventsPage = {
  items: EventItem[];
  nextCursor: string | null;
  /** First page only. Without search text, `exact` is the total. */
  counts?: { exact: number; accent: number };
};

export type EventsListRequest = { q?: string; year?: number; cursor?: string };

/** Error codes returned by /api/journal/*. */
export type EventsApiErrorCode =
  | "invalid_request"
  | "invalid_origin"
  | "unsupported_media_type"
  | "validation"
  | "unauthenticated"
  | "not_found"
  | "unavailable"
  | "network";

export type EventsApiResult<T> = { ok: true; data: T } | { ok: false; error: EventsApiErrorCode; fields?: EventFieldErrors };
