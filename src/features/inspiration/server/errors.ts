import type { ItemFieldErrors } from "../domain/validation";
import type { InspirationApiErrorCode } from "../types";

/** An expected failure with a safe code for the client. Never carries database or Storage text. */
export class InspirationError extends Error {
  constructor(
    readonly code: InspirationApiErrorCode,
    readonly status: number,
    readonly fields?: ItemFieldErrors,
  ) {
    super(code);
    this.name = "InspirationError";
  }
}

export const notFound = () => new InspirationError("not_found", 404);
export const badRequest = () => new InspirationError("invalid_request", 400);
export const invalid = (fields: ItemFieldErrors) => new InspirationError("validation", 422, fields);
export const uploadMissing = () => new InspirationError("upload_missing", 409);

type DbError = { code?: string } | null | undefined;

/**
 * Maps a PostgREST/Postgres error to an InspirationError by SQLSTATE only.
 * A constraint violation means the Worker's own checks missed something; its
 * name stays on the server (ADR-0004).
 */
export function fromDbError(error: DbError): InspirationError {
  switch (error?.code) {
    case "23505": // unique_violation: the image key is already used by an entry
      return uploadMissing();
    case "23514": // check_violation
    case "22P02": // invalid_text_representation
      return badRequest();
    case "28000":
    case "42501":
    case "PGRST301":
      return new InspirationError("unauthenticated", 401);
    default:
      // Log the code only: messages may echo personal content.
      console.error("inspiration: database error", error?.code ?? "unknown");
      return new InspirationError("unavailable", 503);
  }
}

/** Storage failures carry paths, which hold the user id: log the status only. */
export function fromStorageError(error: unknown): InspirationError {
  const status = (error as { statusCode?: string | number; status?: number } | null)?.statusCode ?? (error as { status?: number } | null)?.status;
  console.error("inspiration: storage error", status ?? "unknown");
  return new InspirationError("unavailable", 503);
}
