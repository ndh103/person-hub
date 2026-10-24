import { cleanText, codePoints, isSafeLink, LINK_MAX, normalizeLink } from "@/lib/text";

/**
 * Input parsing for Inspiration writes ("Fields and validation" in
 * requirements/inspiration.md). Runs in the browser for immediate field
 * errors and again in the Worker. The database constraints repeat every rule
 * (ADR-0004), so these are the friendly first line, not the only one.
 */
export type ItemFieldErrorCode = "required" | "too_long" | "invalid" | "too_many";
export type ItemField = "title" | "link" | "body" | "notes" | "tags";
export type ItemFieldErrors = Partial<Record<ItemField, ItemFieldErrorCode>>;
export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: ItemFieldErrors };

export const LIMITS = { title: 200, link: LINK_MAX, body: 50_000, notes: 2000, tag: 32, tags: 10, query: 100 } as const;

export type ItemKind = "article" | "image";

/** The text fields of an entry. `null` clears an optional field. */
export type ItemText = {
  title: string | null;
  link: string | null;
  body: string | null;
  notes: string | null;
  tags: string[];
};

export const TEXT_FIELDS = ["title", "link", "body", "notes", "tags"] as const;
const CREATE_FIELDS = ["kind", "imageKey", ...TEXT_FIELDS] as const;

export type NewItem = ({ kind: "article" } | { kind: "image"; imageKey: string }) & ItemText;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Commas separate tags in the form; line breaks never belong in one.
const TAG_FORBIDDEN = /[,\r\n]/;

type Errors = ItemFieldErrors;

/** Optional plain text: trimmed, NFC, empty → null. */
function parseText(field: "title" | "body" | "notes", raw: unknown, errors: Errors, max: number): string | null | undefined {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    errors[field] = "invalid";
    return undefined;
  }
  const value = cleanText(raw);
  if (!value) return null;
  if (codePoints(value) > max) {
    errors[field] = "too_long";
    return undefined;
  }
  return value;
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

/** One tag as stored: trimmed, NFC, lower-case. */
export function cleanTag(value: string): string {
  return cleanText(value).toLowerCase().normalize("NFC");
}

/** "Design, ui ,design" → ["design", "ui"]: the form's comma-separated text. */
export function splitTags(text: string): string[] {
  return text.split(",").map(cleanTag).filter(Boolean);
}

/**
 * Tags as an array of strings (the API) or one comma-separated string (the
 * form). Lower-cased, duplicates removed in first-seen order.
 */
export function parseTags(raw: unknown, errors: Errors): string[] | undefined {
  if (raw === undefined || raw === null) return [];
  const list = typeof raw === "string" ? raw.split(",") : raw;
  if (!Array.isArray(list) || list.length > 50 || !list.every((tag) => typeof tag === "string")) {
    errors.tags = "invalid";
    return undefined;
  }
  const tags: string[] = [];
  for (const item of list as string[]) {
    const tag = cleanTag(item);
    if (!tag) continue;
    if (TAG_FORBIDDEN.test(tag)) {
      errors.tags = "invalid";
      return undefined;
    }
    if (codePoints(tag) > LIMITS.tag) {
      errors.tags = "too_long";
      return undefined;
    }
    if (!tags.includes(tag)) tags.push(tag);
  }
  if (tags.length > LIMITS.tags) {
    errors.tags = "too_many";
    return undefined;
  }
  return tags;
}

function parseFields(body: Record<string, unknown>, fields: readonly ItemField[], errors: Errors): Partial<ItemText> {
  const value: Partial<ItemText> = {};
  for (const field of fields) {
    const raw = body[field];
    const parsed =
      field === "link"
        ? parseLink(raw, errors)
        : field === "tags"
          ? parseTags(raw, errors)
          : parseText(field, raw, errors, LIMITS[field]);
    if (parsed !== undefined) (value as Record<string, unknown>)[field] = parsed;
  }
  return value;
}

/** True when every key of a create body is allowed (the strict allowlist). */
export function hasOnlyCreateFields(body: Record<string, unknown>): boolean {
  return Object.keys(body).every((key) => (CREATE_FIELDS as readonly string[]).includes(key));
}

/** True when every key of an update body is a text field. */
export function hasOnlyTextFields(body: Record<string, unknown>): boolean {
  return Object.keys(body).every((key) => (TEXT_FIELDS as readonly string[]).includes(key));
}

/**
 * A new entry (INS-003, INS-004). Articles need a title; images need the
 * upload key and take no article text. A wrong kind or key is a bad request
 * (`null`), not a field error: the form never sends one.
 */
export function parseNewItem(body: Record<string, unknown>): Parsed<NewItem> | null {
  const kind = body.kind;
  if (kind !== "article" && kind !== "image") return null;
  if (kind === "image" && (typeof body.imageKey !== "string" || !UUID_RE.test(body.imageKey))) return null;
  if (kind === "article" && body.imageKey !== undefined) return null;
  const errors: Errors = {};
  if (kind === "image" && body.body !== undefined && body.body !== null && body.body !== "") errors.body = "invalid";
  const text = parseFields(body, kind === "article" ? TEXT_FIELDS : ["title", "link", "notes", "tags"], errors);
  if (kind === "article" && !errors.title && !text.title) errors.title = "required";
  if (Object.keys(errors).length) return { ok: false, errors };
  const item = { title: null, link: null, body: null, notes: null, tags: [], ...text };
  return {
    ok: true,
    value: kind === "image" ? { kind, imageKey: (body.imageKey as string).toLowerCase(), ...item, body: null } : { kind, ...item },
  };
}

/**
 * A change to an entry (INS-006): only the fields present are parsed. An
 * article's title cannot be cleared; images take no article text. An empty
 * change is invalid.
 */
export function parseItemChange(
  body: Record<string, unknown>,
  kind: ItemKind,
): Parsed<Partial<ItemText>> | { ok: false; empty: true } {
  const present = TEXT_FIELDS.filter((field) => field in body);
  if (!present.length) return { ok: false, empty: true };
  const errors: Errors = {};
  if (kind === "image" && present.includes("body") && body.body !== null && body.body !== "") errors.body = "invalid";
  const value = parseFields(body, kind === "image" ? present.filter((field) => field !== "body") : present, errors);
  if (kind === "article" && "title" in value && !value.title && !errors.title) errors.title = "required";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value };
}

/** Code points, like Postgres char_length (for the Worker's request schemas). */
export const codePointsOf = codePoints;

/** Search text (INS-008): trimmed, NFC. Empty means no search. */
export function cleanQuery(value: string): string {
  return cleanText(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
