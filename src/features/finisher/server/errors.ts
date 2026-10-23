import type { FieldErrors } from "../domain/validation";
import type { FinisherApiErrorCode } from "../messages";

/** An expected failure with a safe code for the client. Never carries database text. */
export class FinisherError extends Error {
  constructor(
    readonly code: FinisherApiErrorCode,
    readonly status: number,
    readonly fields?: FieldErrors,
  ) {
    super(code);
    this.name = "FinisherError";
  }
}

export const notFound = () => new FinisherError("not_found", 404);
export const invalid = (fields: FieldErrors) => new FinisherError("validation", 422, fields);

/** Database field names (raised by the write functions) → API field names. */
const DB_FIELDS: Record<string, string> = {
  title: "title",
  notes: "notes",
  due_date: "dueDate",
  due_time: "dueTime",
  project: "projectId",
  goal: "goal",
  done_when: "doneWhen",
  target_date: "targetDate",
  activity: "activity",
  days: "days",
  duration: "durationMinutes",
  revisit_date: "revisitDate",
  reason: "reason",
  delegated_to: "delegatedTo",
  reflection: "reflection",
  slots: "slots",
  state: "state",
  action: "action",
  position: "position",
};

type DbError = { code?: string; message?: string } | null | undefined;

/**
 * Maps a PostgREST/Postgres error to a FinisherError. Only the SQLSTATE and
 * the field name raised by our own functions are inspected; the rest is
 * dropped so no database detail reaches the client.
 */
export function fromDbError(error: DbError): FinisherError {
  switch (error?.code) {
    case "PH404":
      return notFound();
    case "PH409":
      return new FinisherError("not_allowed", 409);
    case "PH422": {
      const field = DB_FIELDS[error.message ?? ""];
      if (field === "slots") return invalid({ slots: "too_many" });
      if (field === "projectId") return invalid({ projectId: "invalid" });
      if (field === "revisitDate" || field === "targetDate" || field === "dueDate") return invalid({ [field]: "out_of_range" });
      return field ? invalid({ [field]: "invalid" }) : new FinisherError("invalid_request", 400);
    }
    case "28000":
    case "42501":
    case "PGRST301":
      return new FinisherError("unauthenticated", 401);
    default:
      // Log the code only: messages may echo personal content.
      console.error("finisher: database error", error?.code ?? "unknown");
      return new FinisherError("unavailable", 503);
  }
}
