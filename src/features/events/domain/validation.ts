import { isLocalDate, type LocalDate } from "@/lib/dates";

/**
 * Input parsing for Events writes ("Fields and validation" in
 * requirements/events.md). Runs in the browser for immediate field errors and
 * again in the Worker. The database constraints repeat every rule (ADR-0004),
 * so these are the friendly first line, not the only one.
 */
export type EventFieldErrorCode = "required" | "too_long" | "invalid" | "out_of_range";
export type EventFieldErrors = Partial<Record<EventField, EventFieldErrorCode>>;
export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: EventFieldErrors };

export const EVENT_FIELDS = ["title", "date", "time", "link", "notes"] as const;
export type EventField = (typeof EVENT_FIELDS)[number];

export const LIMITS = { title: 120, notes: 2000, link: 2048, query: 100 } as const;
export const DATE_MIN: LocalDate = "1900-01-01";
export const DATE_MAX: LocalDate = "2100-12-31";

/** The writable fields of an event. `null` clears an optional field. */
export type EventInput = {
  title: string;
  date: LocalDate;
  time: string | null;
  link: string | null;
  notes: string | null;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
// Whitespace or control characters never belong in a stored link.
// eslint-disable-next-line no-control-regex
const UNSAFE_LINK_CHARS = /[\s\u0000-\u001f\u007f]/;

/** Code points, like Postgres char_length. */
export function codePoints(value: string): number {
  return [...value].length;
}

/** Trim and NFC-normalize, so stored text matches the database rule and exact search (A13). */
export function cleanText(value: string): string {
  return value.trim().normalize("NFC");
}

/** "7:45" → "07:45" (lenient typing in the form); anything else is returned trimmed. */
export function padTime(value: string): string {
  const trimmed = value.trim();
  return /^\d:[0-5]\d$/.test(trimmed) ? `0${trimmed}` : trimmed;
}

/** Adds https:// when the user left out the scheme (A4). Empty stays empty. */
export function normalizeLink(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return SCHEME_RE.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** True for an absolute http(s) URL with a host: the only links ever stored or made clickable. */
export function isSafeLink(value: string): boolean {
  if (value.length > LIMITS.link || UNSAFE_LINK_CHARS.test(value)) return false;
  if (!/^https?:\/\/[^/?#]+/i.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
  } catch {
    return false;
  }
}

/** Each parser returns the clean value, or undefined after recording a field error. */
type Errors = EventFieldErrors;

function parseTitle(raw: unknown, errors: Errors): string | undefined {
  if (raw !== undefined && raw !== null && typeof raw !== "string") {
    errors.title = "invalid";
    return undefined;
  }
  const value = cleanText(raw ?? "");
  if (!value) {
    errors.title = "required";
    return undefined;
  }
  if (codePoints(value) > LIMITS.title) {
    errors.title = "too_long";
    return undefined;
  }
  return value;
}

function parseDate(raw: unknown, errors: Errors): LocalDate | undefined {
  if (raw === undefined || raw === null || raw === "") {
    errors.date = "required";
    return undefined;
  }
  if (!isLocalDate(raw)) {
    errors.date = "invalid";
    return undefined;
  }
  if (raw < DATE_MIN || raw > DATE_MAX) {
    errors.date = "out_of_range";
    return undefined;
  }
  return raw;
}

function parseTime(raw: unknown, errors: Errors): string | null | undefined {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || !TIME_RE.test(raw.trim())) {
    errors.time = "invalid";
    return undefined;
  }
  return raw.trim();
}

function parseLink(raw: unknown, errors: Errors): string | null | undefined {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    errors.link = "invalid";
    return undefined;
  }
  const value = normalizeLink(raw);
  if (!value) return null;
  if (value.length > LIMITS.link) {
    errors.link = "too_long";
    return undefined;
  }
  if (!isSafeLink(value)) {
    errors.link = "invalid";
    return undefined;
  }
  return value;
}

function parseNotes(raw: unknown, errors: Errors): string | null | undefined {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    errors.notes = "invalid";
    return undefined;
  }
  const value = cleanText(raw);
  if (!value) return null;
  if (codePoints(value) > LIMITS.notes) {
    errors.notes = "too_long";
    return undefined;
  }
  return value;
}

const PARSERS = { title: parseTitle, date: parseDate, time: parseTime, link: parseLink, notes: parseNotes } as const;

/** True when every key of the body is a writable field (the strict allowlist). */
export function hasOnlyEventFields(body: Record<string, unknown>): boolean {
  return Object.keys(body).every((key) => (EVENT_FIELDS as readonly string[]).includes(key));
}

/** A new event (EVT-003): title and date are required. Unknown keys are ignored here; the API rejects them first. */
export function parseNewEvent(body: Record<string, unknown>): Parsed<EventInput> {
  const errors: Errors = {};
  const value = {
    title: parseTitle(body.title, errors),
    date: parseDate(body.date, errors),
    time: parseTime(body.time, errors),
    link: parseLink(body.link, errors),
    notes: parseNotes(body.notes, errors),
  };
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: value as EventInput };
}

/**
 * A change to an event (EVT-005): only the fields present are parsed. Title and
 * date cannot be cleared; time, link and notes clear with null or "".
 * An empty change is invalid.
 */
export function parseEventChange(body: Record<string, unknown>): Parsed<Partial<EventInput>> | { ok: false; empty: true } {
  const present = EVENT_FIELDS.filter((field) => field in body);
  if (!present.length) return { ok: false, empty: true };
  const errors: Errors = {};
  const value: Partial<EventInput> = {};
  for (const field of present) {
    const parsed = PARSERS[field](body[field], errors);
    if (parsed !== undefined) (value as Record<string, unknown>)[field] = parsed;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value };
}

/** Search text for EVT-009: trimmed, NFC, at most 100 code points. Empty means no search. */
export function cleanQuery(value: string): string {
  return cleanText(value);
}
