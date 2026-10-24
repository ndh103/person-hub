# Personal Hub: project instructions

## Purpose and current scope

Build a private personal hub accessible from phone and laptop browsers, containing separate apps in a shared shell. Initial apps are Finisher (tasks and projects to follow through on; first in the navigation) Events (record life events, such as buying a TV), and Inspiration (saved articles and images, added 2026-10-24; images in a private Supabase Storage bucket, see ADR-0009). Habit Tracker was dropped on 2026-10-10; Finisher project sessions cover recurring activities. Use a sidebar on larger screens and an accessible collapsible navigation drawer on phones.

The application exists (auth, shell, Finisher). Do not create a live database or deploy simply because these instructions exist. Implement when the user requests implementation. Read [the project brief](docs/project-brief.md) for confirmed choices and unresolved product questions.

## Stack and engineering direction

Decided in [ADR-0003](docs/architecture/decisions/ADR-0003-spa-and-worker-api.md) (2026-10-11, replacing the earlier Next.js/Vercel direction):

- SPA: Vite, React, TypeScript, TanStack Router (routes in `src/app/router.tsx`) and TanStack Query.
- API: Hono on Cloudflare Workers, with Zod at the request boundary. One Worker serves both the SPA's static assets and `/api/*` on the same origin (`wrangler.jsonc`).
- Tailwind CSS, with shadcn/ui preferred for reusable interactive components.
- Supabase Postgres and Supabase Auth; do not implement a separate password system.
- Target Cloudflare's free Workers plan. Aim to fit free hosting tiers; check current provider terms and limits before choosing features or deploying. Do not promise permanent free operation.
- Choose compatible supported package versions during scaffolding, pin through the package manager lockfile, and verify version-specific APIs in official documentation. Do not encode guessed versions in plans.

Default application data flow: browser (TanStack Query) -> Hono route in the Worker (`src/worker`) -> feature service/data access layer (`src/features/*/server`) -> Supabase using the caller's access token and RLS. Supabase Auth runs in the browser (`src/lib/supabase/client.ts`); the browser sends the access token as `Authorization: Bearer`. Application data reads and writes belong behind the API, never direct from browser code. Browser code must not import Worker or server modules, and the Worker must not import browser modules (ESLint enforces both). Explain changes to this boundary in an architecture decision.

Keep Finisher, Events and Inspiration as separate feature modules. Share the shell, navigation, authentication, common UI, and infrastructure. Prefer a modular monolith over separate services until a concrete need justifies more complexity.

## Agent roles and skill routing

These are reusable role instructions, not running processes or installed agent services. Skills live in `.claude/skills/` to keep them versioned with the project. Read the relevant `SKILL.md` before doing that role's work; Claude Code discovers project skills from this location (invoke with `/<skill-name>` or let Claude load one automatically from its description), and this table maps tasks to their role instructions. A single agent can apply multiple roles sequentially. When the user requests a team run and parallel agents are available, delegate bounded tasks with explicit inputs, owned output paths, and dependencies; avoid concurrent edits to the same file. Do not claim delegation occurred when it did not.

| Role | Skill | Main outputs |
| --- | --- | --- |
| Business Analyst (BA) | [person-hub-ba](.claude/skills/person-hub-ba/SKILL.md) | `requirements/<feature>.md` |
| Designer | [person-hub-designer](.claude/skills/person-hub-designer/SKILL.md) | `output/designs/<feature>/index.html`, `styles.css`, `design-notes.md` |
| Technical Architect (TA) | [person-hub-architect](.claude/skills/person-hub-architect/SKILL.md) | `docs/architecture/<feature>.md`, `docs/architecture/decisions/`, debt register |
| Developer | [person-hub-developer](.claude/skills/person-hub-developer/SKILL.md) | Application code, migrations, focused tests, implementation notes |
| Tester | [person-hub-tester](.claude/skills/person-hub-tester/SKILL.md) | Automated tests and `docs/testing/<feature>.md` |

## Collaboration and handoffs

1. BA defines scope and acceptance criteria using stable requirement IDs. Record assumptions and open questions separately from confirmed requirements.
2. Designer and TA consume the same requirements. They can work in parallel, coordinate API and interaction implications, and cross-link their deliverables.
3. Developer reads the requirement, design reference, and applicable architecture decisions. Resolve material contradictions before dependent implementation; continue unrelated work where possible. Routine implementation choices do not need repeated permission.
4. Tester maps tests to acceptance criteria, verifies the implemented behavior and security boundaries, and returns actionable defects. Developer fixes defects; rerun affected checks.
5. Report deliverables, validation performed, untested areas, and unresolved decisions. Completion means the requested scope is satisfied; record partial work honestly.

Each artifact includes feature slug, status (`draft`, `ready`, or `superseded`), related inputs, assumptions, and unresolved issues. `ready` means sufficient for handoff, not user approval. Never fabricate an approval or test result. User instructions take priority over repository guidance. Product behavior is defined in requirements; architectural decisions define implementation constraints; design references define visual and interaction intent. When these conflict, surface the conflict rather than silently choosing one.

Do not turn a role handoff into an automatic approval gate. Ask for missing information only when it materially affects the work; label reversible assumptions and proceed within the authorized scope.

## Security baseline

Security is a required feature, including for an app initially used by one person.

- Verify identity on the server from the Bearer access token with `getClaims(token)` (signature and expiry), requiring a signed-in, non-anonymous user. Do not trust a client-supplied user ID or the browser's `getSession()` view for authorization. Use `getUser()` where a fresh Auth-server check is required, and document session revocation behavior.
- Every API route and data access entry point enforces authentication and record ownership. Client-side route guards are a convenience only.
- Use the caller's session with a publishable/anon key for ordinary application queries. Keep secret/service-role keys server-only and out of normal user request paths because elevated credentials can bypass RLS. Introduce elevated operations only for a documented need with separate authorization and tests.
- Enable RLS explicitly in migrations for user-data tables. Restrict grants and create operation-specific owner policies, including insert/update checks. Model `user_id` ownership from `auth.uid()`; prevent reassignment and cross-user references with database constraints and policies as appropriate. Review views, functions, and storage access separately if introduced.
- The Worker API is not the only possible route to Supabase: database policies must remain safe under direct Supabase requests. Test anonymous, owner, and another authenticated user for reads and writes.
- Validate inputs on the server, allowlist writable fields, bound payloads and pagination, and parameterize queries. Derive ownership server-side. Never spread arbitrary request bodies into database updates.
- The API uses Bearer tokens, not cookies. Keep the write guards (foreign `Origin` refused, JSON-only write bodies) and send no CORS headers unless an ADR adds an intentional origin. No state-changing GET requests to the API. Document callback/redirect allowlists.
- Tokens live in browser storage, so treat XSS as session theft: keep the CSP in `public/_headers` strict (no inline scripts), avoid `dangerouslySetInnerHTML`, and review new dependencies.
- Personal responses must not enter a shared or browser cache: API responses are `private, no-store`, app HTML is `no-store`, and personal data stays in TanStack Query's in-memory cache, never in browser storage. Do not rely on platform defaults for confidentiality.
- Return only needed fields. Do not expose raw database errors, credentials, tokens, or personal journal content in logs, analytics, test reports, or client bundles. Mark server-only modules accordingly.
- Use bounded, documented abuse controls for authentication and writes when implementing public endpoints; in-memory counters alone are not reliable across serverless instances. Avoid paid infrastructure without an explicit need.
- Keep secrets out of Git. Document variable names with placeholders, separating browser-safe values from server secrets. Review dependency and security-header configuration during implementation.

Current official references to recheck when implementing: [Supabase JWTs and `getClaims`](https://supabase.com/docs/guides/auth/jwts), [Supabase PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Workers static assets](https://developers.cloudflare.com/workers/static-assets/), and [Hono](https://hono.dev/docs/).

## Directory conventions

```text
index.html, src/main.tsx      # SPA entry
src/app/                      # Router (router.tsx), layouts and pages
src/worker/                   # Hono API: app, auth middleware, HTTP guards, feature routes
src/features/<feature>/       # Feature UI (components/), domain logic (domain/), API client (api.ts)
src/features/<feature>/server # Worker-only services and data access
src/components/ui/            # shadcn/ui components
src/components/shell/         # Navigation and shared shell
src/lib/supabase/             # Browser Supabase Auth client
src/lib/api.ts                # Browser fetch helper (Bearer token)
public/_headers               # Security and cache headers for static assets
supabase/migrations/          # Schema, grants, constraints, RLS
supabase/tests/               # Database security tests
tests/                        # Unit, integration, and browser tests
```

## Implementation and verification conventions

- Prefer accessible semantic elements, keyboard navigation, visible focus, labelled forms, and mobile layouts without horizontal overflow. Cover loading, empty, error, validation, and success states.
- Store event instants in UTC with timezone-aware types. Define user timezone and the local-day semantics of Finisher sessions and task due dates before implementing recurrence; date-only values are not UTC timestamps.
- Use reproducible migrations rather than undocumented dashboard changes. Generate database types after schema changes. Review irreversible migrations and live mutations according to the user's authorization.
- Prefer Vitest and React Testing Library for targeted logic/component tests, Playwright for browser flows, and Supabase database tests for RLS. Follow installed project tooling if it differs and document the choice.
- During implementation run available lint, TypeScript checks, relevant tests, and a production build for meaningful application changes. Do not invent package scripts or say unrun checks passed. For documentation-only changes, validate skills and references without scaffolding app tooling.
- Test risky boundaries rather than mirroring implementation details. Any ownership-policy change needs direct database allow/deny coverage; security-sensitive API changes need authorization tests.
- Keep generated reports, authenticated browser state, and credentials out of version control. Commit reusable test scripts and sanitized documentation.
