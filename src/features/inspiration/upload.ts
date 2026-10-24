import { supabase } from "@/lib/supabase/client";
import { createImageItem, discardUpload, requestUpload, type ImageTextInput } from "./api";
import { BUCKET, FULL_EDGE, fitWithin, MAX_STORED_BYTES, THUMB_EDGE, type StoredType } from "./domain/image";
import type { InspirationListItem } from "./types";

/**
 * Browser-only image handling for INS-004 (ADR-0009): decode the picked file,
 * resize it on a canvas, re-encode it (which drops EXIF data such as the
 * camera location), and send both files to the signed upload URLs the API
 * issued. The browser Supabase client is used here for Storage uploads only;
 * every read and every database write still goes through the API.
 */
export type PreparedImage = { type: StoredType; full: Blob; thumb: Blob };

export type UploadProblem = "decode" | "too_large" | "upload" | "save" | "network" | "unauthenticated";

export class UploadError extends Error {
  constructor(readonly problem: UploadProblem) {
    super(problem);
    this.name = "UploadError";
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Draws `bitmap` scaled to fit `edge`; JPEG gets a white background (no transparency). */
function draw(bitmap: ImageBitmap, edge: number, opaque: boolean): HTMLCanvasElement {
  const size = fitWithin(bitmap.width, bitmap.height, edge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new UploadError("decode");
  if (opaque) {
    context.fillStyle = "#fff";
    context.fillRect(0, 0, size.width, size.height);
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  return canvas;
}

async function encode(bitmap: ImageBitmap, edge: number, type: StoredType, quality: number): Promise<Blob | null> {
  const blob = await toBlob(draw(bitmap, edge, type === "image/jpeg"), type, quality);
  return blob && blob.type === type ? blob : null;
}

/** WebP where the browser can encode it (Safari can't), otherwise JPEG. GIFs keep their first frame. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new UploadError("decode");
  }
  try {
    for (const type of ["image/webp", "image/jpeg"] as const) {
      for (const quality of [0.82, 0.7]) {
        const full = await encode(bitmap, FULL_EDGE, type, quality);
        if (!full) break; // this browser can't encode the type: try the next one
        if (full.size > MAX_STORED_BYTES) continue;
        const thumb = await encode(bitmap, THUMB_EDGE, type, 0.78);
        if (thumb) return { type, full, thumb };
      }
    }
    throw new UploadError("too_large");
  } finally {
    bitmap.close();
  }
}

async function put(path: string, token: string, blob: Blob, type: StoredType) {
  const { error } = await supabase()
    .storage.from(BUCKET)
    // max-age matches the signed links' lifetime (ADR-0009: browser caching exception).
    .uploadToSignedUrl(path, token, blob, { contentType: type, cacheControl: "3600" });
  if (error) throw new UploadError("upload");
}

function apiProblem(error: string): UploadProblem {
  return error === "network" ? "network" : error === "unauthenticated" ? "unauthenticated" : "save";
}

/**
 * Uploads one prepared image and saves its entry. On any failure after the
 * upload was issued, the files are discarded (best effort), so a retry
 * starts clean and nothing is left behind (INS-010).
 */
export async function saveImage(image: PreparedImage, text: ImageTextInput): Promise<InspirationListItem> {
  const target = await requestUpload(image.type);
  if (!target.ok) throw new UploadError(apiProblem(target.error));
  const { key, full, thumb } = target.data;
  try {
    await Promise.all([put(full.path, full.token, image.full, image.type), put(thumb.path, thumb.token, image.thumb, image.type)]);
    const created = await createImageItem(key, text);
    if (!created.ok) throw new UploadError(apiProblem(created.error));
    return created.data.item;
  } catch (error) {
    void discardUpload(key);
    throw error instanceof UploadError ? error : new UploadError("upload");
  }
}
