import { LIMITS, type EventField, type EventFieldErrorCode } from "./domain/validation";
import type { EventsApiErrorCode } from "./types";

/** Message for an Events field error (EVT-003). */
export function eventFieldMessage(field: EventField, code: EventFieldErrorCode | undefined): string | null {
  if (!code) return null;
  switch (field) {
    case "title":
      return code === "too_long" ? `Keep it to ${LIMITS.title} characters or fewer.` : "Enter what happened.";
    case "date":
      return code === "required" ? "Pick a date." : "Pick a date between 1900 and 2100.";
    case "time":
      return "Use 24-hour time, like 07:45, or clear it.";
    case "link":
      return code === "too_long"
        ? `Links can be up to ${LIMITS.link} characters.`
        : "Enter a web address starting with http:// or https://, or leave it empty.";
    case "notes":
      return `Notes can be up to ${LIMITS.notes} characters.`;
  }
}

export function eventsErrorMessage(code: EventsApiErrorCode): string {
  switch (code) {
    case "network":
      return "Couldn’t reach the server. Check your connection and try again. Your entries are kept.";
    case "unauthenticated":
      return "Your session has ended. Sign in again to continue.";
    case "not_found":
      return "This event no longer exists. It may have been deleted.";
    case "validation":
      return "Check the highlighted fields.";
    default:
      return "Couldn’t save the event. Try again. Your entries are kept.";
  }
}
