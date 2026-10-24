/**
 * Image rules for uploads (INS-004, ADR-0009). Pure, so the Worker and the
 * browser agree and the maths is testable; the browser-only decoding and
 * encoding is in ../upload.ts.
 */

/** Longer side of the stored image and of its thumbnail, in pixels. */
export const FULL_EDGE = 2048;
export const THUMB_EDGE = 480;

/** Largest file the user may pick, before resizing. */
export const MAX_PICKED_BYTES = 20 * 1024 * 1024;
/** Largest stored file (the bucket's file_size_limit). */
export const MAX_STORED_BYTES = 5 * 1024 * 1024;
/** Files per "Add images" form. */
export const MAX_FILES = 10;

/** What the user may pick. */
export const PICKABLE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
/** What is stored (the bucket's allowed_mime_types). */
export const STORED_TYPES = ["image/webp", "image/jpeg"] as const;
export type StoredType = (typeof STORED_TYPES)[number];

export function isStoredType(value: unknown): value is StoredType {
  return (STORED_TYPES as readonly unknown[]).includes(value);
}

/** Scales `width × height` so the longer side is at most `edge`; never enlarges. */
export function fitWithin(width: number, height: number, edge: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const scale = Math.min(1, edge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export type PickProblem = "type" | "size";

/** Why a picked file can't be used, before trying to decode it. */
export function pickProblem(file: { type: string; size: number }): PickProblem | null {
  if (!(PICKABLE_TYPES as readonly string[]).includes(file.type)) return "type";
  if (file.size > MAX_PICKED_BYTES) return "size";
  return null;
}

/** Storage object paths of an image (ADR-0009). Built only from a verified user id and a server-made key. */
export function imagePaths(userId: string, key: string): { full: string; thumb: string } {
  return { full: `${userId}/${key}/full`, thumb: `${userId}/${key}/thumb` };
}

export const BUCKET = "inspiration";

/** "48 MB", "812 KB": the usage line (INS-009). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(0, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** INS-009: the advisory warning threshold. */
export const USAGE_WARNING_BYTES = 800 * 1024 * 1024;
