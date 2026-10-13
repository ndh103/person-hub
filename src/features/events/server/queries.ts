import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventItem, EventsPage } from "../types";
import { badRequest, fromDbError } from "./errors";

/**
 * Events reads (EVT-002, EVT-009). Every call runs with the caller's session;
 * the search functions are SECURITY INVOKER, so RLS limits them to the
 * caller's rows (ADR-0004).
 */
export const PAGE_SIZE = 50;

/** Columns returned to the browser: never user_id or search_folded. */
export const EVENT_COLUMNS = "id, title, event_date, event_time, link, notes, created_at, updated_at";

export type EventRow = {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  link: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  match_rank?: number;
};

/** Position after a row in the list order (docs/architecture/events.md, keyset). */
type Cursor = { r: number; d: string; t: string | null; c: string; i: string };

export function toEventItem(row: EventRow, searching = false): EventItem {
  return {
    id: row.id,
    title: row.title,
    date: row.event_date,
    time: row.event_time ? row.event_time.slice(0, 5) : null,
    link: row.link,
    notes: row.notes,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    match: searching ? (row.match_rank === 1 ? "accent" : "exact") : null,
  };
}

// The cursor is opaque to the browser: base64url JSON of the last row's sort keys.
// created_at is kept exactly as Postgres sent it (microseconds), so the keyset is exact.
export function encodeCursor(row: EventRow): string {
  const cursor: Cursor = { r: row.match_rank ?? 2, d: row.event_date, t: row.event_time, c: row.created_at, i: row.id };
  return btoa(JSON.stringify(cursor)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Decodes and fully re-validates a cursor; anything unexpected is a 400. */
export function decodeCursor(value: string): Cursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(atob(value.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    throw badRequest();
  }
  const c = parsed as Partial<Cursor> | null;
  const valid =
    c !== null &&
    typeof c === "object" &&
    (c.r === 1 || c.r === 2) &&
    typeof c.d === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(c.d) &&
    (c.t === null || (typeof c.t === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(c.t))) &&
    typeof c.c === "string" &&
    c.c.length <= 40 &&
    !Number.isNaN(Date.parse(c.c)) &&
    typeof c.i === "string" &&
    UUID_RE.test(c.i);
  if (!valid) throw badRequest();
  return c as Cursor;
}

export async function listEvents(
  supabase: SupabaseClient,
  request: { q: string | null; year: number | null; cursor: string | null },
): Promise<EventsPage> {
  const after = request.cursor ? decodeCursor(request.cursor) : null;
  const searching = request.q !== null;
  const args = { p_q: request.q, p_year: request.year };

  const [page, counts] = await Promise.all([
    supabase.rpc("events_page", {
      ...args,
      p_after_rank: after?.r ?? null,
      p_after_date: after?.d ?? null,
      p_after_has_time: after ? after.t !== null : null,
      p_after_time: after?.t ?? null,
      p_after_created: after?.c ?? null,
      p_after_id: after?.i ?? null,
      p_limit: PAGE_SIZE + 1,
    }),
    after ? Promise.resolve(null) : supabase.rpc("events_counts", args),
  ]);
  if (page.error) throw fromDbError(page.error);
  if (counts?.error) throw fromDbError(counts.error);

  const rows = (page.data ?? []) as EventRow[];
  const items = rows.slice(0, PAGE_SIZE);
  const result: EventsPage = {
    items: items.map((row) => toEventItem(row, searching)),
    nextCursor: rows.length > PAGE_SIZE ? encodeCursor(items[items.length - 1]) : null,
  };
  if (counts) {
    const row = ((counts.data ?? []) as { exact_count: number; accent_count: number }[])[0];
    result.counts = { exact: row?.exact_count ?? 0, accent: row?.accent_count ?? 0 };
  }
  return result;
}

export async function listYears(supabase: SupabaseClient): Promise<number[]> {
  const { data, error } = await supabase.rpc("events_years");
  if (error) throw fromDbError(error);
  return ((data ?? []) as unknown[]).map(Number).filter(Number.isInteger);
}
