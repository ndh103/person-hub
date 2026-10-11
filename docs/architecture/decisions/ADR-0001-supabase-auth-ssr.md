# ADR-0001: Supabase SSR cookie sessions with server-side auth routes

- Status: accepted (adopted for the auth work; this is not a record of user approval)
- Date: 2026-10-11
- Related: [docs/architecture/auth.md](../auth.md), [requirements/auth.md](../../../requirements/auth.md)

## Context

The hub needs sign-in by email and password, magic link or code, and Google, for invited users only. CLAUDE.md requires:

- Supabase Auth and no separate password system.
- Server-side identity verification through the supported Supabase SSR flow.
- No trust in `getSession()` on the server.
- CSRF protection on cookie-authenticated mutations.
- Responses that are never publicly cached.

Browser-side Supabase Auth calls are allowed. Application data must go through the Next.js backend.

## Alternatives

1. **Browser client sign-in.** Call `createBrowserClient` `signIn*` from the page directly, and have the server only read cookies. This is the simplest option and is allowed by CLAUDE.md. However, raw Supabase errors reach the browser, which makes uniform anti-enumeration messages harder. It also splits cookie writing between the browser and the server.
2. **Server Actions.** These are concise, but Next.js warns that each Server Function is a public POST endpoint that needs its own checks. The project prefers Route Handlers as its API boundary.
3. **Auth.js / NextAuth with a Supabase adapter.** This adds a second auth system, which CLAUDE.md rules out.
4. **Next.js Route Handlers (`/api/auth/*`) using a per-request `createServerClient`, with `proxy.ts` refreshing the session and `getClaims()` checking identity.** (Chosen.)

## Decision

Use option 4:

- Auth actions are JSON POST Route Handlers with Origin checks, validated input, mapped errors, and `private, no-store` responses.
- Email links land on `GET /auth/confirm` (`verifyOtp` with a token hash).
- OAuth lands on `GET /auth/callback` (`exchangeCodeForSession`).
- `proxy.ts` (Next.js 16) refreshes the session.
- Every layout, Route Handler, and server service checks identity again with `getClaims()`.
- `getUser()` is used only where immediate revocation matters.
- Public sign-up is disabled in Supabase. OTP uses `shouldCreateUser: false`. Users are invited from the dashboard, so the app holds no secret key.

## Consequences

- Positive:
  - One place writes cookies.
  - Uniform error messages that don't reveal whether an account exists.
  - Consistent CSRF protection.
  - No tokens in browser code.
  - No server secret is needed for sign-in.
- Negative:
  - A few more route files than the browser-client approach.
  - Cookie handling on Route Handler responses must be verified on the scaffolded version (risk R6).
  - JWT-based checks with `getClaims()` keep accepting a revoked session until the access token expires (risk R3).
- Reversibility: high. Moving individual flows to the browser client later is local to the auth pages and does not touch the data layer.

## Revisit triggers

- Supabase or Next.js changes the recommended SSR or proxy pattern.
- An in-app admin or invite UI is needed, which would introduce a secret key with separate authorization.
- Immediate revocation becomes a requirement.
- Public sign-up is enabled.
