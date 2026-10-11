/**
 * The hub's canonical origin, used for auth redirect URLs and the Origin check.
 * NEXT_PUBLIC_SITE_URL wins; Vercel previews fall back to their deployment URL.
 */
export function getSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return new URL(configured).origin;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000";
}

export function siteUrl(path: string): URL {
  return new URL(path, getSiteOrigin());
}
