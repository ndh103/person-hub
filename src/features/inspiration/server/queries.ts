import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET, imagePaths } from "../domain/image";
import type { ItemKind } from "../domain/validation";
import type { InspirationItem, InspirationListItem, InspirationPage, TagCount } from "../types";
import { badRequest, fromDbError, notFound } from "./errors";

/**
 * Inspiration reads (INS-002, INS-005, INS-008, INS-009). Every call runs with
 * the caller's session; the functions are SECURITY INVOKER, so RLS limits
 * them to the caller's rows, and Storage RLS limits signed links to the
 * caller's folder (ADR-0009).
 */
export const PAGE_SIZE = 30;

/** Signed image links live an hour; the SPA treats data as fresh for 30 minutes. */
export const SIGNED_URL_SECONDS = 3600;

/** Columns read for the detail view: never search_folded. user_id only to build paths. */
export const ITEM_COLUMNS = "id, user_id, kind, title, link, body, notes, tags, image_key, created_at, updated_at";

export type PageRow = {
  id: string;
  kind: ItemKind;
  title: string | null;
  link: string | null;
  excerpt: string | null;
  has_body: boolean;
  tags: string[];
  image_key: string | null;
  created_at: string;
  updated_at: string;
};

export type ItemRow = {
  id: string;
  user_id: string;
  kind: ItemKind;
  title: string | null;
  link: string | null;
  body: string | null;
  notes: string | null;
  tags: string[];
  image_key: string | null;
  created_at: string;
  updated_at: string;
};

type Cursor = { c: string; i: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Opaque to the browser: base64url JSON of the last row's sort keys. created_at
// is kept exactly as Postgres sent it (microseconds), so the keyset is exact.
export function encodeCursor(row: { created_at: string; id: string }): string {
  const cursor: Cursor = { c: row.created_at, i: row.id };
  return btoa(JSON.stringify(cursor)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

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
    typeof c.c === "string" &&
    c.c.length <= 40 &&
    !Number.isNaN(Date.parse(c.c)) &&
    typeof c.i === "string" &&
    UUID_RE.test(c.i);
  if (!valid) throw badRequest();
  return c as Cursor;
}

/**
 * Signed links for many paths in one Storage call. A path that can't be
 * signed (missing file) maps to null, so one broken image never fails the
 * whole list (INS-002 "Image unavailable").
 */
export async function signPaths(supabase: SupabaseClient, paths: string[]): Promise<Map<string, string | null>> {
  const links = new Map<string, string | null>();
  if (!paths.length) return links;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) {
    console.error("inspiration: storage error", "sign");
    for (const path of paths) links.set(path, null);
    return links;
  }
  for (const entry of data ?? []) {
    if (entry.path) links.set(entry.path, entry.error ? null : entry.signedUrl || null);
  }
  return links;
}

function toListItem(row: PageRow, thumbUrl: string | null): InspirationListItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    link: row.link,
    excerpt: row.excerpt,
    hasText: row.has_body,
    tags: row.tags ?? [],
    thumbUrl,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** A row from the table in list form, for write responses. */
export function rowToListItem(row: ItemRow, thumbUrl: string | null): InspirationListItem {
  return toListItem(
    {
      ...row,
      excerpt: (row.notes ?? row.body)?.slice(0, 280) ?? null,
      has_body: row.body !== null,
    },
    thumbUrl,
  );
}

export async function listItems(
  supabase: SupabaseClient,
  userId: string,
  request: { q: string | null; kind: ItemKind | null; tag: string | null; cursor: string | null },
): Promise<InspirationPage> {
  const after = request.cursor ? decodeCursor(request.cursor) : null;
  const filters = { p_q: request.q, p_kind: request.kind, p_tag: request.tag };
  const [page, count] = await Promise.all([
    supabase.rpc("inspiration_page", {
      ...filters,
      p_after_created: after?.c ?? null,
      p_after_id: after?.i ?? null,
      p_limit: PAGE_SIZE + 1,
    }),
    after ? Promise.resolve(null) : supabase.rpc("inspiration_count", filters),
  ]);
  if (page.error) throw fromDbError(page.error);
  if (count?.error) throw fromDbError(count.error);

  const rows = ((page.data ?? []) as PageRow[]).slice(0, PAGE_SIZE + 1);
  const shown = rows.slice(0, PAGE_SIZE);
  const thumbs = await signPaths(
    supabase,
    shown.filter((row) => row.image_key).map((row) => imagePaths(userId, row.image_key!).thumb),
  );
  const result: InspirationPage = {
    items: shown.map((row) => toListItem(row, row.image_key ? (thumbs.get(imagePaths(userId, row.image_key).thumb) ?? null) : null)),
    nextCursor: rows.length > PAGE_SIZE ? encodeCursor(shown[shown.length - 1]) : null,
  };
  if (count) result.count = Number(count.data ?? 0);
  return result;
}

/** The caller's entry or a 404; another user's entry is hidden by RLS and looks the same (INS-005). */
export async function readItem(supabase: SupabaseClient, id: string): Promise<ItemRow> {
  const { data, error } = await supabase.from("inspiration_items").select(ITEM_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw notFound();
  return data as ItemRow;
}

export async function getItem(supabase: SupabaseClient, id: string): Promise<InspirationItem> {
  const row = await readItem(supabase, id);
  let thumbUrl: string | null = null;
  let imageUrl: string | null = null;
  if (row.image_key) {
    const paths = imagePaths(row.user_id, row.image_key);
    const links = await signPaths(supabase, [paths.full, paths.thumb]);
    imageUrl = links.get(paths.full) ?? null;
    thumbUrl = links.get(paths.thumb) ?? null;
  }
  return { ...rowToListItem(row, thumbUrl), notes: row.notes, body: row.body, imageUrl };
}

export async function listTags(supabase: SupabaseClient): Promise<TagCount[]> {
  const { data, error } = await supabase.rpc("inspiration_tags");
  if (error) throw fromDbError(error);
  return ((data ?? []) as { tag: string; uses: number }[]).map((row) => ({ tag: row.tag, count: Number(row.uses) }));
}

export async function getUsage(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc("inspiration_usage");
  if (error) throw fromDbError(error);
  return Number(data ?? 0);
}
