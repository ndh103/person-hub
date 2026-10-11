import { getSiteOrigin } from "@/lib/auth/site-url";

/**
 * Session cookie hardening. All Auth calls run on the server (ADR-0001), so
 * browser scripts never need to read these cookies: HttpOnly keeps tokens away
 * from injected scripts. Secure whenever the site is served over https.
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: getSiteOrigin().startsWith("https://"),
    sameSite: "lax" as const,
    path: "/",
  };
}

/**
 * Browser-safe Supabase settings. Both values are public by design: access is
 * enforced by Supabase Auth and RLS, not by keeping these secret.
 * Referenced as literal `process.env.NEXT_PUBLIC_*` so Next.js can inline them.
 */
export function supabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
    );
  }
  return { url, publishableKey };
}
