# Authentication: implementation notes

- Feature slug: `auth`
- Status: `ready` for Tester. Not verified against a real Supabase project (see Not verified).
- Date: 2026-10-11
- Inputs:
  - [requirements/auth.md](../../requirements/auth.md)
  - [docs/architecture/auth.md](../architecture/auth.md)
  - [ADR-0001](../architecture/decisions/ADR-0001-supabase-auth-ssr.md)
  - [Foundation theme](../../output/designs/_foundation/theme.css)
- Design gap: there is no `output/designs/auth/` reference yet. The pages follow the foundation tokens and the app-shell conventions (orange frame, floating card, 44px targets). Revisit them when the Designer delivers that reference.

## Scaffold (first application code in the repo)

| Item | Version / choice |
| --- | --- |
| Next.js | 16.4.0 (App Router, `src/`, Turbopack). `cacheComponents` and `partialPrefetching` are on, as the scaffold's defaults. |
| React | 19.3.0 |
| Tailwind CSS | v4 |
| shadcn/ui | CLI 4.21, style `base-nova` (Base UI primitives), icons `lucide`. The theme comes from the foundation. |
| Supabase | `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.3 |
| Tests | Vitest 3.2 (Vitest 5 needs Node ≥ 22.12, but this machine has 22.2.0) |

Exact versions are pinned in `package-lock.json`. The `shadcn` CLI added `cn` (shadcn's own class-merging package, `github.com/shadcn-ui/cn`) instead of `clsx` and `tailwind-merge`. This is expected.

Scripts: `npm run dev | build | start | lint | typecheck | test`.

## Requirement coverage

| ID | Where |
| --- | --- |
| AUTH-001 | `src/app/api/auth/password/route.ts`; Password tab in `src/features/auth/components/sign-in-form.tsx` |
| AUTH-002 | `api/auth/otp`, `api/auth/otp/verify`, `(auth)/auth/confirm`; Email link tab (code entry, 60-second resend cooldown) |
| AUTH-003 | `api/auth/google`, `(auth)/auth/callback`; Google tab |
| AUTH-004, 005 | `(auth)/auth/confirm` (invite, recovery) → `(auth)/account/set-password` → `api/auth/password/update`; `(auth)/forgot-password` → `api/auth/forgot` |
| AUTH-006 | `api/auth/sign-out`; `SignOutButton` in the `(app)` layout |
| AUTH-007 | `src/proxy.ts` (redirects with `next`, `reason=expired`, signed-in users sent away from `/sign-in`); `(app)/layout.tsx` re-checks the session; `src/lib/server/auth.ts` `requireUser()` for future APIs |
| AUTH-008 | Uniform responses in the password, OTP, and forgot-password routes (`src/lib/auth/errors.ts`); Supabase messages are never forwarded |
| AUTH-009 | `(auth)/auth/error/page.tsx` |
| AUTH-010 | `(auth)/layout.tsx` and pages: labelled fields, `autocomplete`, linked errors, 44px targets, no shell |

## Security controls as built

- Identity comes from `getClaims()` in `proxy.ts`, `getSessionUser()`, and `requireUser()`. `getUser()` is used only in `requireFreshUser()`, for password changes. `getSession()` is never used.
- Every `/api/auth/*` POST:
  - requires `Origin` to equal the site origin (otherwise 403) and `Content-Type: application/json` (otherwise 415);
  - accepts a JSON object of at most 4 KB;
  - validates its fields (`src/lib/auth/validation.ts`).
- `next` is always passed through `safeNext()`. It allows only a same-site path, never `/api/*`, and otherwise falls back to `/home`.
- **Cookies are hardened beyond the `@supabase/ssr` defaults:** `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` when `NEXT_PUBLIC_SITE_URL` is https (`sessionCookieOptions()` in `src/lib/supabase/env.ts`).
- The proxy sets `Cache-Control: private, no-store` on every matched response, and the route handlers set it themselves. Personal content in `(app)` renders behind `<Suspense>`, so the prerendered static shell contains only a skeleton.
- Security headers on all paths (`next.config.ts`): `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, and no `X-Powered-By`.
- No secret or service-role key is used anywhere. `.env.example` lists only the three browser-safe variables.

## Deviations from the architecture (now recorded in it)

1. `src/lib/supabase/client.ts` was not created, because no flow needs it.
2. The magic-link `emailRedirectTo` is the app path itself (`SITE/<path>`), not `/auth/confirm?next=…`. The Supabase redirect allowlist therefore needs `https://<prod-host>/**`.
3. A per-address email rate limit is answered as "sent", with a client-side cooldown, so that AUTH-008 holds. The requirements change note records this.
4. The cookie options were hardened as described above.

## Checks run (2026-10-11, Windows, Node 22.2.0)

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass (with `.claude/**` and `output/**` ignored, because they hold skill scripts and static mock-ups, not app code) |
| `npm test` | **50 passed**: `safe-next` (19), `validation` (5), and `auth-routes` (26). The route tests replace the Supabase client with a stub and cover the CSRF guard, uniform responses, redirects, no-store, and the Google-URL origin check. |
| `npm run build` | Pass, both without env vars and with placeholder env vars |
| `npm audit --omit=dev` | 0 vulnerabilities. `npm audit` reports 5 high-severity issues in dev-only lint tooling (the eslint dependency chain). |

**Production-server probe** (`next start`, using a placeholder Supabase URL and no real project; curl):
- Signed out:
  - `/` → `/sign-in`
  - `/home?x=1` → `/sign-in?next=%2Fhome%3Fx%3D1`
  - `/finisher` → `/sign-in?next=%2Ffinisher`
  - `/account/set-password` → sign-in, with `next`
- A stale or invalid auth cookie leads to `/sign-in?...&reason=expired`.
- `/sign-in` and `/auth/error` return 200.
- Every response carries `cache-control: private, no-store` and the security headers.
- Rejected requests:
  - A cross-origin POST returns 403.
  - A form-encoded POST returns 415.
  - A GET on a POST-only route returns 405.
- `POST /api/auth/google`:
  - Returns 200 with the authorize URL on the project's origin, carrying `redirect_to=/auth/callback?next=/finisher`.
  - Sets the PKCE verifier cookies (`HttpOnly; SameSite=lax`). This resolves architecture R6.
- `/auth/confirm?type=email_change` returns 303 to `/auth/error`.
- `/auth/callback?error_code=signup_disabled` returns 303 to `/sign-in?error=google_no_access`.

**Headless Chrome** at 1280, 390, and 320 px, light and dark:
- No horizontal overflow on `/sign-in` (including its notice variants), `/forgot-password`, or `/auth/error`.
- Page titles and `h1` elements are correct.
- Submitting the form empty marks Email and Password `aria-invalid` and shows their errors.
- The Email-link tab switches and its form is labelled.
- No console errors.

## Fixes after handoff

- **2026-10-11: "Blocking Route: unstable `Date.now()`" on `/home`**, reported by the user in `next dev` while signed in. The cause:
  - With `partialPrefetching`, `cookies()` does not stop prerendering, because the App Shell may include session data.
  - Supabase's token-expiry check then calls `Date.now()` during that render.

  The fix is `await connection()` at the top of `createClient()` (`src/lib/supabase/server.ts`), so every Supabase-backed read runs at request time. This also keeps session-derived content out of runtime prefetches.

  I could not reproduce or re-verify the fix locally, because it needs a signed-in session on the real project. Typecheck, lint, tests and build pass.

## Not verified (needs a real Supabase project)

The following were not run, because no real project credentials were available in this session:
- Any real sign-in: password, magic link, code, or Google.
- The invite flow.
- The reset flow.
- Session refresh and expiry.
- Sign-out revocation.
- Email templates.
- Supabase's own sign-up refusal for unknown OTP or Google users (architecture T3, R1).
- Rate-limit behaviour and timing (T2, R5).

These are the Tester's priority with a real project (architecture T1–T11). The route tests prove only how the hub maps Supabase's responses, not how Supabase itself behaves.

## Local setup (Tester / owner)

1. Use Node ≥ 22. Node 22.13+ or 24 LTS is recommended: some lint packages warn on 22.2.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and fill in the project URL, the publishable key, and `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
4. Apply the Supabase dashboard checklist in [docs/architecture/auth.md](../architecture/auth.md#configuration):
   - Turn **sign-ups off**.
   - Set the redirect URLs.
   - Replace the four email templates.
   - Set up custom SMTP.
   - Enable the Google provider.
5. Invite yourself (Dashboard → Authentication → Users → Add user → Send invitation). Open the email, set a password, and confirm that you land on `/home`.
6. Run `npm run dev` and open http://localhost:3000.

## Follow-ups

- Designer: produce `output/designs/auth/`, then reconcile these pages with it.
- ~~Implement the full sidebar shell.~~ Done 2026-10-11; see [finisher.md](finisher.md).
- A Content-Security-Policy with script nonces is not set yet. The root layout uses one inline script (pre-paint theme), and Next.js needs a nonce or hash setup for a strict CSP. Review this when the shell lands.
