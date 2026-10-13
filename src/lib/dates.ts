/**
 * Date helpers shared by every feature. A LocalDate ("YYYY-MM-DD") is a
 * date-only value, never a UTC timestamp (CLAUDE.md, business rules).
 */
export type LocalDate = string;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== "string") return false;
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}

// Built by hand rather than with Intl: ICU output differs between runtimes
// (for example "Sept" vs "Sep" in en-GB), which would break the one format.
export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The one display format for dates in the app: "12 Oct 2026". */
export function formatDate(date: LocalDate): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7)) - 1;
  const day = Number(date.slice(8, 10));
  return `${day} ${MONTH_SHORT[month]} ${year}`;
}

/** Today's date in the browser's own timezone. Browser code only. */
export function browserToday(): LocalDate {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The browser-local calendar date of a UTC instant, for "Added 13 Oct 2026". Browser code only. */
export function instantToLocalDate(iso: string): LocalDate {
  const at = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}
