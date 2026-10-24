import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET, imagePaths, isStoredType, MAX_STORED_BYTES, type StoredType } from "../domain/image";
import { hasOnlyCreateFields, hasOnlyTextFields, parseItemChange, parseNewItem, type ItemText } from "../domain/validation";
import type { InspirationListItem, UploadTarget } from "../types";
import { badRequest, fromDbError, fromStorageError, invalid, notFound, uploadMissing } from "./errors";
import { ITEM_COLUMNS, readItem, rowToListItem, signPaths, type ItemRow } from "./queries";

/**
 * Inspiration writes (INS-003, INS-004, INS-006, INS-007). Text fields are
 * parsed from a strict allowlist and written to the table as the caller; the
 * database grants only those columns and RLS ties every row to auth.uid()
 * (ADR-0004). Image files are written by the browser to paths the Worker
 * chooses, inside the caller's own Storage folder (ADR-0009).
 */
type Body = Record<string, unknown>;

function toColumns(input: Partial<ItemText>): Record<string, unknown> {
  const columns: Record<string, unknown> = {};
  for (const field of ["title", "link", "body", "notes", "tags"] as const) {
    if (input[field] !== undefined) columns[field] = input[field];
  }
  return columns;
}

async function withThumb(supabase: SupabaseClient, row: ItemRow): Promise<InspirationListItem> {
  if (!row.image_key) return rowToListItem(row, null);
  const { thumb } = imagePaths(row.user_id, row.image_key);
  return rowToListItem(row, (await signPaths(supabase, [thumb])).get(thumb) ?? null);
}

/**
 * Two signed upload URLs for one image (INS-004). The key is random and the
 * paths are built from the verified user id, so no path comes from input.
 * Storage RLS (own folder, no overwrite) applies to the upload itself.
 */
export async function createUpload(supabase: SupabaseClient, userId: string, contentType: StoredType): Promise<UploadTarget> {
  if (!isStoredType(contentType)) throw badRequest();
  const key = crypto.randomUUID();
  const paths = imagePaths(userId, key);
  const bucket = supabase.storage.from(BUCKET);
  const [full, thumb] = await Promise.all([bucket.createSignedUploadUrl(paths.full), bucket.createSignedUploadUrl(paths.thumb)]);
  if (full.error || thumb.error || !full.data || !thumb.data) throw fromStorageError(full.error ?? thumb.error);
  return {
    key,
    full: { path: full.data.path, token: full.data.token },
    thumb: { path: thumb.data.path, token: thumb.data.token },
  };
}

/** Discards an upload that never became an entry (INS-004 cancel). A key still used by an entry is left alone. */
export async function discardUpload(supabase: SupabaseClient, userId: string, key: string): Promise<void> {
  const { data, error } = await supabase.from("inspiration_items").select("id").eq("image_key", key).maybeSingle();
  if (error) throw fromDbError(error);
  if (data) return;
  const paths = imagePaths(userId, key);
  const removed = await supabase.storage.from(BUCKET).remove([paths.full, paths.thumb]);
  if (removed.error) throw fromStorageError(removed.error);
}

/**
 * Both files of an upload, as Storage reports them to the caller. Their sizes
 * become image_bytes (INS-009); a missing or wrongly typed file is a 409.
 */
async function uploadedBytes(supabase: SupabaseClient, userId: string, key: string): Promise<number> {
  const { data, error } = await supabase.storage.from(BUCKET).list(`${userId}/${key}`, { limit: 10 });
  if (error) throw fromStorageError(error);
  let bytes = 0;
  for (const name of ["full", "thumb"]) {
    const file = (data ?? []).find((entry) => entry.name === name);
    const metadata = (file?.metadata ?? {}) as { size?: unknown; mimetype?: unknown };
    const size = Number(metadata.size);
    if (!file || !isStoredType(metadata.mimetype) || !Number.isFinite(size) || size < 0 || size > MAX_STORED_BYTES) throw uploadMissing();
    bytes += size;
  }
  return bytes;
}

export async function createItem(supabase: SupabaseClient, userId: string, body: Body): Promise<InspirationListItem> {
  if (!hasOnlyCreateFields(body)) throw badRequest();
  const parsed = parseNewItem(body);
  if (!parsed) throw badRequest();
  if (!parsed.ok) throw invalid(parsed.errors);
  const item = parsed.value;
  const columns: Record<string, unknown> = { kind: item.kind, ...toColumns(item) };
  if (item.kind === "image") {
    columns.image_key = item.imageKey;
    columns.image_bytes = await uploadedBytes(supabase, userId, item.imageKey);
  }
  const { data, error } = await supabase.from("inspiration_items").insert(columns).select(ITEM_COLUMNS).single();
  if (error) throw fromDbError(error);
  return withThumb(supabase, data as ItemRow);
}

/** 404 when the entry is missing, deleted elsewhere, or another user's (hidden by RLS). */
export async function updateItem(supabase: SupabaseClient, id: string, body: Body): Promise<InspirationListItem> {
  if (!hasOnlyTextFields(body)) throw badRequest();
  const current = await readItem(supabase, id);
  const parsed = parseItemChange(body, current.kind);
  if (!parsed.ok) throw "empty" in parsed ? badRequest() : invalid(parsed.errors);
  const { data, error } = await supabase
    .from("inspiration_items")
    .update(toColumns(parsed.value))
    .eq("id", id)
    .select(ITEM_COLUMNS)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw notFound();
  return withThumb(supabase, data as ItemRow);
}

/**
 * Idempotent (INS-007). The row goes first, so the entry disappears even if
 * Storage then fails; leftover files are logged by status only (TD-INS-1).
 */
export async function deleteItem(supabase: SupabaseClient, id: string): Promise<void> {
  const { data, error } = await supabase.from("inspiration_items").delete().eq("id", id).select("user_id, image_key");
  if (error) throw fromDbError(error);
  const row = ((data ?? []) as { user_id: string; image_key: string | null }[])[0];
  if (!row?.image_key) return;
  const paths = imagePaths(row.user_id, row.image_key);
  const removed = await supabase.storage.from(BUCKET).remove([paths.full, paths.thumb]);
  if (removed.error) fromStorageError(removed.error);
}
