import { formatDate, instantToLocalDate } from "@/lib/dates";
import { LIMITS, type ItemField, type ItemFieldErrorCode } from "./domain/validation";
import type { InspirationApiErrorCode } from "./types";
import type { UploadProblem } from "./upload";

/** Message for an Inspiration field error (INS-003, INS-006). */
export function fieldMessage(field: ItemField, code: ItemFieldErrorCode | undefined): string | null {
  if (!code) return null;
  switch (field) {
    case "title":
      return code === "too_long" ? `Keep it to ${LIMITS.title} characters or fewer.` : "Enter a title.";
    case "link":
      return code === "too_long"
        ? `Links can be up to ${LIMITS.link} characters.`
        : "Enter a web address starting with http:// or https://, or leave it empty.";
    case "body":
      return code === "too_long" ? `Article text can be up to ${LIMITS.body.toLocaleString("en")} characters.` : "Images don’t have article text.";
    case "notes":
      return `Notes can be up to ${LIMITS.notes} characters.`;
    case "tags":
      return code === "too_many"
        ? `Use up to ${LIMITS.tags} tags.`
        : code === "too_long"
          ? `Each tag can be up to ${LIMITS.tag} characters.`
          : "Separate tags with commas.";
  }
}

export function inspirationErrorMessage(code: InspirationApiErrorCode): string {
  switch (code) {
    case "network":
      return "Couldn’t reach the server. Check your connection and try again. Your entries are kept.";
    case "unauthenticated":
      return "Your session has ended. Sign in again to continue.";
    case "not_found":
      return "This entry no longer exists. It may have been deleted.";
    case "validation":
      return "Check the highlighted fields.";
    default:
      return "Couldn’t save. Try again. Your entries are kept.";
  }
}

/** INS-011: an image's text alternative is its title, else "Image saved on 24 Oct 2026". Browser code only. */
export function imageAlt(item: { title: string | null; createdAt: string }): string {
  return item.title ?? `Image saved on ${formatDate(instantToLocalDate(item.createdAt))}`;
}

/** Per-file messages in the upload list (INS-004). */
export function uploadMessage(problem: UploadProblem | "type" | "size"): string {
  switch (problem) {
    case "type":
    case "decode":
      return "This file type isn’t supported.";
    case "size":
    case "too_large":
      return "This image is too large.";
    case "network":
      return "Couldn’t reach the server.";
    case "unauthenticated":
      return "Your session has ended.";
    default:
      return "Couldn’t save this image.";
  }
}
