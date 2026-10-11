/**
 * Worker bindings (wrangler.jsonc, .dev.vars, `wrangler secret put`). Both
 * values are browser-safe: the API calls Supabase with the publishable key and
 * the caller's own access token, so RLS always applies. No secret or
 * service-role key is bound to this Worker (CLAUDE.md security baseline).
 */
export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
};
