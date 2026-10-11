/**
 * The hub's own origin, used for Supabase Auth redirect URLs. The SPA and the
 * API share one origin (ADR-0003), so this is wherever the page was loaded
 * from. Supabase still only redirects to URLs on its allowlist.
 */
export function siteOrigin(): string {
  return window.location.origin;
}

export function siteUrl(path: string): URL {
  return new URL(path, siteOrigin());
}
