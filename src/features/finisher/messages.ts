import type { FieldErrorCode } from "./domain/validation";
import { LIMITS } from "./domain/validation";

/** Error codes returned by /api/finisher/*. */
export type FinisherApiErrorCode =
  | "invalid_request"
  | "invalid_origin"
  | "unsupported_media_type"
  | "validation"
  | "unauthenticated"
  | "not_found"
  | "not_allowed"
  | "unavailable"
  | "network";

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  notes: "Notes",
  dueDate: "Due date",
  dueTime: "Due time",
  projectId: "Project",
  goal: "Goal",
  doneWhen: "Done when",
  targetDate: "Target date",
  activity: "Activity",
  days: "Days",
  durationMinutes: "Duration",
  startTime: "Start time",
  revisitDate: "Revisit date",
  reason: "Reason",
  reflection: "Reflection",
  slots: "Slots",
};

const MAX_BY_FIELD: Record<string, number> = {
  title: LIMITS.title,
  notes: LIMITS.notes,
  goal: LIMITS.goal,
  doneWhen: LIMITS.doneWhen,
  activity: LIMITS.activity,
  reason: LIMITS.reason,
  reflection: LIMITS.reflection,
};

/** Message for a field error. `field` may be "slots.<index>.<field>". */
export function fieldErrorMessage(field: string, code: FieldErrorCode | undefined): string | null {
  if (!code) return null;
  const name = field.split(".").at(-1) ?? field;
  const label = FIELD_LABELS[name] ?? "This field";

  if (name === "dueTime" && code === "needs_date") return "Add a due date to set a time.";
  if (name === "dueDate" && code === "out_of_range") return "Choose a date within 5 years of today.";
  if (name === "targetDate" && code === "out_of_range") return "Choose today or a later date.";
  if (name === "revisitDate" && code === "out_of_range") return "Choose a date from tomorrow up to a year ahead.";
  if (name === "revisitDate" && code === "required") return "Choose when to revisit this.";
  if (name === "projectId") return "Choose one of your active or parked projects.";
  if (name === "days") return "Choose at least one day.";
  if (name === "durationMinutes" && code !== "required") {
    return `Enter whole minutes from ${LIMITS.minDuration} to ${LIMITS.maxDuration}.`;
  }
  if (name === "slots" && code === "too_many") return `A project can have at most ${LIMITS.slots} slots.`;
  if (name === "reason" && code === "required") return "Say briefly why you’re letting this go.";

  switch (code) {
    case "required":
      return `${label} is required.`;
    case "too_long":
      return `${label} must be ${MAX_BY_FIELD[name] ?? "fewer"} characters or fewer.`;
    default:
      return `Enter a valid ${label.toLowerCase()}.`;
  }
}

export function generalErrorMessage(code: FinisherApiErrorCode): string {
  switch (code) {
    case "network":
      return "Couldn’t reach the server. Check your connection and try again.";
    case "unauthenticated":
      return "Your session has ended. Sign in again to continue.";
    case "not_found":
      return "This item no longer exists. It may have been deleted.";
    case "not_allowed":
      return "That isn’t possible in the item’s current state. Refresh to see the latest version.";
    case "validation":
      return "Check the highlighted fields.";
    default:
      return "Something went wrong and nothing was saved. Try again.";
  }
}
