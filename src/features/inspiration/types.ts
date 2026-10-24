import type { ItemFieldErrors, ItemKind } from "./domain/validation";

/** One entry in the list (docs/architecture/inspiration.md). */
export type InspirationListItem = {
  id: string;
  kind: ItemKind;
  title: string | null;
  link: string | null;
  /** The first 280 characters of the notes, else of the article text. */
  excerpt: string | null;
  hasText: boolean;
  tags: string[];
  /** Signed, expiring thumbnail link (images only; null when it couldn't be made). */
  thumbUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

/** One entry with everything the detail view shows (INS-005). */
export type InspirationItem = InspirationListItem & {
  notes: string | null;
  body: string | null;
  /** Signed, expiring link to the stored image (images only). */
  imageUrl: string | null;
};

export type InspirationPage = {
  items: InspirationListItem[];
  nextCursor: string | null;
  /** First page only. */
  count?: number;
};

export type InspirationFilter = { q?: string; kind?: ItemKind; tag?: string };

export type TagCount = { tag: string; count: number };

/** Answer to POST /api/inspiration/uploads: where to send the two files. */
export type UploadTarget = {
  key: string;
  full: { path: string; token: string };
  thumb: { path: string; token: string };
};

/** Error codes returned by /api/inspiration/*. */
export type InspirationApiErrorCode =
  | "invalid_request"
  | "invalid_origin"
  | "unsupported_media_type"
  | "validation"
  | "upload_missing"
  | "unauthenticated"
  | "not_found"
  | "unavailable"
  | "network";

export type InspirationApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: InspirationApiErrorCode; fields?: ItemFieldErrors };
