import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { apiFetch, type ApiMethod } from "@/lib/api";
import type { StoredType } from "./domain/image";
import type { ItemText } from "./domain/validation";
import type {
  InspirationApiErrorCode,
  InspirationApiResult,
  InspirationFilter,
  InspirationItem,
  InspirationListItem,
  InspirationPage,
  TagCount,
  UploadTarget,
} from "./types";

/** Calls a same-origin /api/inspiration endpoint with JSON. Never throws. */
export async function inspirationApi<T>(method: ApiMethod, path: string, body?: Record<string, unknown>): Promise<InspirationApiResult<T>> {
  return (await apiFetch<T, InspirationApiErrorCode>(method, path, body)) as InspirationApiResult<T>;
}

/** A failed read. The page shows the error state with Retry and no error detail (INS-002). */
export class InspirationLoadError extends Error {
  constructor(readonly code: InspirationApiErrorCode) {
    super(code);
    this.name = "InspirationLoadError";
  }
}

/**
 * Responses carry signed image links that expire after an hour (ADR-0009),
 * so cached data is refetched after 30 minutes and never kept longer.
 */
const FRESH_MS = 30 * 60_000;
const KEEP_MS = 40 * 60_000;

/**
 * Every Inspiration read, keyed under "inspiration" so a write can refresh
 * them all. Personal data lives only in this in-memory cache, never in
 * browser storage.
 */
export const inspirationKeys = { all: ["inspiration"] as const };

export const inspirationQueries = {
  // Search text, kind and tag go in the POST body, never in the API URL (INS-008).
  list: ({ q, kind, tag }: InspirationFilter) =>
    infiniteQueryOptions({
      queryKey: ["inspiration", "list", { q: q ?? "", kind: kind ?? null, tag: tag ?? null }],
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam }) => {
        const result = await inspirationApi<InspirationPage>("POST", "/api/inspiration/query", {
          ...(q ? { q } : {}),
          ...(kind ? { kind } : {}),
          ...(tag ? { tag } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        });
        if (!result.ok) throw new InspirationLoadError(result.error);
        return result.data;
      },
      getNextPageParam: (page) => page.nextCursor ?? undefined,
      staleTime: FRESH_MS,
      gcTime: KEEP_MS,
    }),
  item: (id: string) =>
    queryOptions({
      queryKey: ["inspiration", "item", id],
      queryFn: async () => {
        const result = await inspirationApi<{ item: InspirationItem }>("GET", `/api/inspiration/${encodeURIComponent(id)}`);
        if (!result.ok) throw new InspirationLoadError(result.error);
        return result.data.item;
      },
      staleTime: FRESH_MS,
      gcTime: KEEP_MS,
    }),
  tags: () =>
    queryOptions({
      queryKey: ["inspiration", "tags"],
      queryFn: async () => {
        const result = await inspirationApi<{ tags: TagCount[] }>("GET", "/api/inspiration/tags");
        if (!result.ok) throw new InspirationLoadError(result.error);
        return result.data.tags;
      },
    }),
  usage: () =>
    queryOptions({
      queryKey: ["inspiration", "usage"],
      queryFn: async () => {
        const result = await inspirationApi<{ bytes: number }>("GET", "/api/inspiration/usage");
        if (!result.ok) throw new InspirationLoadError(result.error);
        return result.data.bytes;
      },
    }),
};

export type ArticleInput = { title: string; link: string | null; body: string | null; notes: string | null; tags: string[] };
export type ImageTextInput = { title: string | null; link: string | null; notes: string | null; tags: string[] };

export function createArticle(input: ArticleInput) {
  return inspirationApi<{ item: InspirationListItem }>("POST", "/api/inspiration", { kind: "article", ...input });
}

export function createImageItem(imageKey: string, input: ImageTextInput) {
  return inspirationApi<{ item: InspirationListItem }>("POST", "/api/inspiration", { kind: "image", imageKey, ...input });
}

export function updateItem(id: string, input: Partial<ItemText>) {
  return inspirationApi<{ item: InspirationListItem }>("PATCH", `/api/inspiration/${encodeURIComponent(id)}`, input);
}

export function deleteItem(id: string) {
  return inspirationApi<{ ok: true }>("DELETE", `/api/inspiration/${encodeURIComponent(id)}`);
}

export function requestUpload(contentType: StoredType) {
  return inspirationApi<UploadTarget>("POST", "/api/inspiration/uploads", { contentType });
}

export function discardUpload(key: string) {
  return inspirationApi<{ ok: true }>("DELETE", `/api/inspiration/uploads/${encodeURIComponent(key)}`);
}
