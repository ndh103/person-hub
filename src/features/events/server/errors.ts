import type { EventFieldErrors } from "../domain/validation";
import type { EventsApiErrorCode } from "../types";

/** An expected failure with a safe code for the client. Never carries database text. */
export class EventsError extends Error {
  constructor(
    readonly code: EventsApiErrorCode,
    readonly status: number,
    readonly fields?: EventFieldErrors,
  ) {
    super(code);
    this.name = "EventsError";
  }
}

export const notFound = () => new EventsError("not_found", 404);
export const badRequest = () => new EventsError("invalid_request", 400);
export const invalid = (fields: EventFieldErrors) => new EventsError("validation", 422, fields);

type DbError = { code?: string } | null | undefined;

/**
 * Maps a PostgREST/Postgres error to an EventsError by SQLSTATE only. A
 * constraint violation means the Worker's own checks missed something; its
 * constraint name stays on the server (ADR-0004).
 */
export function fromDbError(error: DbError): EventsError {
  switch (error?.code) {
    case "23514": // check_violation
    case "22007": // invalid_datetime_format
    case "22008": // datetime_field_overflow
    case "22P02": // invalid_text_representation
      return badRequest();
    case "28000":
    case "42501":
    case "PGRST301":
      return new EventsError("unauthenticated", 401);
    default:
      // Log the code only: messages may echo personal content.
      console.error("events: database error", error?.code ?? "unknown");
      return new EventsError("unavailable", 503);
  }
}
