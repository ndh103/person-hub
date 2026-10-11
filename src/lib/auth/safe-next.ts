/** Where users land when no safe destination was requested (requirements A1). */
export const DEFAULT_NEXT = "/home";

const PROBE_ORIGIN = "http://next.invalid";

/**
 * Returns a same-site path to redirect to after sign-in, or DEFAULT_NEXT.
 *
 * Accepts a relative path ("/finisher?tab=tasks") or, when `siteOrigin` is
 * given, an absolute URL on that origin (email templates pass the full
 * redirect URL). Anything else — other origins, protocol-relative "//host",
 * backslash tricks, control characters, API routes — falls back.
 */
export function safeNext(value: unknown, siteOrigin?: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return DEFAULT_NEXT;
  }

  let candidate = value;

  if (/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
    if (!siteOrigin) return DEFAULT_NEXT;
    try {
      const absolute = new URL(candidate);
      if (absolute.origin !== new URL(siteOrigin).origin) return DEFAULT_NEXT;
      candidate = absolute.pathname + absolute.search + absolute.hash;
    } catch {
      return DEFAULT_NEXT;
    }
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//")) return DEFAULT_NEXT;
  // Browsers treat "\" like "/", so "/\evil.test" would become "//evil.test".
  // Control characters are rejected on purpose.
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(candidate)) return DEFAULT_NEXT;

  let resolved: URL;
  try {
    resolved = new URL(candidate, PROBE_ORIGIN);
  } catch {
    return DEFAULT_NEXT;
  }
  if (resolved.origin !== PROBE_ORIGIN) return DEFAULT_NEXT;
  if (resolved.pathname === "/api" || resolved.pathname.startsWith("/api/")) return DEFAULT_NEXT;

  return resolved.pathname + resolved.search + resolved.hash;
}
