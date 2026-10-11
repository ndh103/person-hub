# ADR-0003: Single-page app and a Hono API on one Cloudflare Worker

- Status: accepted (the user asked for this stack on 2026-10-11; implemented by the Developer. This is not a record of any other approval.)
- Date: 2026-10-11
- Supersedes: [ADR-0001](ADR-0001-supabase-auth-ssr.md) (Supabase SSR cookie sessions with server-side auth routes)
- Related: [docs/architecture/auth.md](../auth.md), [ADR-0002](ADR-0002-finisher-rpc-writes.md), [docs/implementation/platform.md](../../implementation/platform.md)

## Context

The hub was a Next.js App Router application aimed at Vercel. The user wants to host it on Cloudflare's free plan and chose this stack:

- **SPA:** Vite, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query and TanStack Router.
- **API:** Hono on Cloudflare Workers, Zod, and `@supabase/supabase-js`.
- **Database:** Supabase Postgres with RLS, unchanged.
- **Auth:** Supabase Auth in the browser. The browser sends a Bearer token, the API verifies it, and queries are RLS-scoped.

CLAUDE.md requires an ADR for any change to the default data flow. It also requires that application data goes through the backend, that the server verifies identity, and that policies stay safe under direct Supabase requests.

## Decision

1. **One Worker, one origin.** `wrangler.jsonc` serves the built SPA as static assets. Unknown paths fall back to `index.html`, and `run_worker_first` sends only `/api/*` to Worker code. The API sends no CORS headers. In development, `@cloudflare/vite-plugin` runs the same Worker in workerd.
2. **Data flow.** Data goes browser → `/api/*` (Hono) → feature service (`src/features/*/server`) → Supabase as the caller → RLS.
   - The browser never reads or writes application tables directly, even though the publishable key would allow it. RLS and ADR-0002 keep that safe anyway.
   - Server Components are gone, so every page loads its data through the API with TanStack Query.
3. **Auth in the browser.** The browser Supabase client (`src/lib/supabase/client.ts`) uses the PKCE flow and keeps the session in `localStorage`. It signs in with password, OTP or magic link, and Google, and it signs out and refreshes tokens.
   - `src/features/auth/api.ts` maps every Supabase error to the same small set of codes the old routes used, so pages still give uniform answers (AUTH-008).
   - Email links land on the SPA routes `/auth/confirm` and `/auth/callback`, so the email templates are unchanged.
4. **API authentication.**
   - Every `/api/finisher` route runs `requireUser` (`src/worker/auth.ts`). It reads `Authorization: Bearer <jwt>`, builds a per-request client with the publishable key and that token, and calls `getClaims(token)`.
   - It accepts the token only when the signature and expiry are valid, `sub` is present, `role` is `authenticated`, and the user isn't anonymous. Anything else gets 401 before any data access.
   - No secret or service-role key is bound to the Worker.
5. **CSRF.** Browsers never attach the token automatically, so cross-site request forgery doesn't apply. As defence in depth:
   - writes whose `Origin` header names another site are refused (403);
   - write bodies must be JSON (415 otherwise);
   - there are no CORS headers.
6. **Validation.**
   - Zod validates route parameters and query strings at the Hono boundary. A non-UUID id gives 404; out-of-range pagination gives 400.
   - Request bodies keep the existing field allowlists in `src/features/finisher/domain/validation.ts`. The SPA forms share those rules, and the database functions check again (ADR-0002).
7. **Caching and headers.**
   - Every API response is `Cache-Control: private, no-store` and carries Hono's `secureHeaders`.
   - The SPA's static responses get a CSP, `X-Frame-Options: DENY`, `nosniff`, a referrer policy and a permissions policy from `public/_headers`.
   - Fingerprinted assets are cached as immutable. The SPA shell contains no personal data.
8. **Timezone.** The SPA sends the browser's IANA zone in `X-Time-Zone` on every API call. This replaces the `ph-tz` cookie (Finisher assumption A1). An unknown zone falls back to UTC.

## Alternatives

1. **Keep Next.js and host it on Cloudflare with the OpenNext adapter.** This avoids a rewrite. But it needs the Node compatibility layer, and Next.js's server bundle size and cold starts sit close to the free plan's Worker limits. The user picked the SPA stack instead.
2. **Separate Workers, or Pages plus a Worker, for the SPA and the API.** This means two deployments, cross-origin calls, and a CORS policy to keep correct. One Worker with static assets is simpler and keeps everything on one origin.
3. **Cookie sessions issued by the API.** The Worker would perform sign-in and set `HttpOnly` cookies, which keeps tokens away from scripts. However, it would bring back CSRF handling and token refresh on the server. The user also asked for Supabase Auth in the browser.
4. **The SPA queries Supabase directly (PostgREST and RPC) with no API.** This is the least code and is safe under RLS and ADR-0002. However, it breaks CLAUDE.md's rule that application data goes through the backend. It would also move response shaping (view models, safe error codes) into the browser.

## Consequences

- **Positive:**
  - Free-plan hosting with one deployment and one origin.
  - The API boundary is explicit: browser code can't import server modules, and ESLint enforces that.
  - No cookies means no CSRF surface and nothing to keep out of shared caches except the API responses, which are `no-store`.
- **Negative:** tokens in `localStorage`.
  - Any script running on the page (XSS) can read the access and refresh tokens. Earlier, HttpOnly cookies kept them out of reach.
  - Mitigations: a strict CSP (`script-src 'self'`, no inline scripts; the theme bootstrap moved to `/theme-init.js`), React's escaping, and no `dangerouslySetInnerHTML` in app code.
  - Dependencies need careful review.
- **Negative:** loading.
  - The first paint waits for the JS bundle (about 300 kB gzip today; see the debt in platform.md), then for data.
  - Page guards run in the browser and are only a convenience; the API remains the control.
- **Negative:** revocation delay.
  - Unchanged from before: a revoked session is accepted until its access token expires (architecture R3).
  - Password changes call `updateUser` against the Auth server, which checks the session itself.
- **Neutral:**
  - The anti-enumeration wording is now chosen in the browser.
  - Supabase's raw responses were already reachable by anyone calling the Auth API directly with the publishable key, so moving this changes nothing about what an attacker can learn. Supabase's rate limits remain the real control.

## Revisit when

- The hub stores more sensitive data, or a third-party script is added to the page. Then reconsider HttpOnly cookie sessions issued by the Worker (alternative 3).
- Free-plan limits change, or the Worker bundle approaches the size limit.
- Supabase changes its recommended browser or JWT verification flow (for example `getClaims`).
- A second client, such as a native app, needs the API. That would require a deliberate CORS and Origin policy.
