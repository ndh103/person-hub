/**
 * Text and link rules shared by features (Events, Inspiration). Pure: runs in
 * the browser and in the Worker. The database constraints repeat them.
 */

/** Longest link any feature stores. */
export const LINK_MAX = 2048;

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
// Whitespace or control characters never belong in a stored link.
// eslint-disable-next-line no-control-regex
const UNSAFE_LINK_CHARS = /[\s\u0000-\u001f\u007f]/;

/** Code points, like Postgres char_length. */
export function codePoints(value: string): number {
  return [...value].length;
}

/** Trim and NFC-normalize, so stored text matches the database rule and exact search. */
export function cleanText(value: string): string {
  return value.trim().normalize("NFC");
}

/** Adds https:// when the user left out the scheme. Empty stays empty. */
export function normalizeLink(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return SCHEME_RE.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** True for an absolute http(s) URL with a host: the only links ever stored or made clickable. */
export function isSafeLink(value: string): boolean {
  if (value.length > LINK_MAX || UNSAFE_LINK_CHARS.test(value)) return false;
  if (!/^https?:\/\/[^/?#]+/i.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
  } catch {
    return false;
  }
}

/** "shop.example.com/tv001": host and path, shortened for display. */
export function shortLink(url: string, max = 48): string {
  try {
    const parsed = new URL(url);
    const text = parsed.host + (parsed.pathname === "/" ? "" : parsed.pathname);
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  } catch {
    return url;
  }
}
