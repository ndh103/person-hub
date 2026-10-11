/**
 * Browser-safe Supabase settings, bundled by Vite. Both values are public by
 * design: access is enforced by Supabase Auth and RLS, not by keeping these
 * secret.
 */
export function supabaseEnv(): { url: string; publishableKey: string } {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
    );
  }
  return { url, publishableKey };
}
