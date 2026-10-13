import type { SupabaseClient } from "@supabase/supabase-js";
import { hasOnlyEventFields, parseEventChange, parseNewEvent, type EventInput } from "../domain/validation";
import type { EventItem } from "../types";
import { badRequest, fromDbError, invalid, notFound } from "./errors";
import { EVENT_COLUMNS, toEventItem, type EventRow } from "./queries";

/**
 * Events writes (EVT-003, EVT-005, EVT-006). Each one parses a strict
 * allowlist of fields and writes the table as the caller. The database grants
 * only these columns and RLS ties every row to auth.uid(), so ownership is
 * never taken from input (ADR-0004).
 */
type Body = Record<string, unknown>;

function toColumns(input: Partial<EventInput>): Record<string, unknown> {
  const columns: Record<string, unknown> = {};
  if (input.title !== undefined) columns.title = input.title;
  if (input.date !== undefined) columns.event_date = input.date;
  if (input.time !== undefined) columns.event_time = input.time;
  if (input.link !== undefined) columns.link = input.link;
  if (input.notes !== undefined) columns.notes = input.notes;
  return columns;
}

export async function createEvent(supabase: SupabaseClient, body: Body): Promise<EventItem> {
  if (!hasOnlyEventFields(body)) throw badRequest();
  const parsed = parseNewEvent(body);
  if (!parsed.ok) throw invalid(parsed.errors);
  const { data, error } = await supabase.from("events").insert(toColumns(parsed.value)).select(EVENT_COLUMNS).single();
  if (error) throw fromDbError(error);
  return toEventItem(data as EventRow);
}

/** 404 when nothing was updated: missing, deleted elsewhere, or another user's (hidden by RLS). */
export async function updateEvent(supabase: SupabaseClient, id: string, body: Body): Promise<EventItem> {
  if (!hasOnlyEventFields(body)) throw badRequest();
  const parsed = parseEventChange(body);
  if (!parsed.ok) throw "empty" in parsed ? badRequest() : invalid(parsed.errors);
  const { data, error } = await supabase
    .from("events")
    .update(toColumns(parsed.value))
    .eq("id", id)
    .select(EVENT_COLUMNS)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw notFound();
  return toEventItem(data as EventRow);
}

/** Idempotent (EVT-006): an event that is already gone counts as deleted, for every ID alike. */
export async function deleteEvent(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw fromDbError(error);
}
