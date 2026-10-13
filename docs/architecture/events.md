# Events: architecture

- Feature slug: `events`
- Status: `ready` (sufficient for implementation; not a record of user approval)
- Date: 2026-10-13
- Requirements: [requirements/events.md](../../requirements/events.md) v2.1, EVT-001 to EVT-009
- Design: [output/designs/events/](../../output/designs/events/design-notes.md) (expandable rows, no detail route, search groups)
- Decisions: [ADR-0003](decisions/ADR-0003-spa-and-worker-api.md) (SPA + Worker API), [ADR-0004](decisions/ADR-0004-events-table-writes-under-rls.md) (table writes under RLS, invoker search functions). [ADR-0002](decisions/ADR-0002-finisher-rpc-writes.md) does **not** apply to Events.
- Debt: [technical-debt.md](technical-debt.md) TD-EVT-1

## Context and constraints

- A single table of personal records, owned by one user, with no references to other features.
- Rules are per-row and static (lengths, date range, link scheme). There is no lifecycle, and nothing depends on "today" on the server (decision 4 allows future dates).
- Search (EVT-009): case-insensitive matching on title and notes. Exact (accent-sensitive) matches come first, then matches that only appear when Vietnamese accent marks are ignored (A13). The link is not searched (decision 7). The order within groups follows EVT-002, with stable "Load more" paging.
- The CLAUDE.md security baseline applies: data flows browser → Worker API → feature service → Supabase as the caller, with RLS safe for direct Supabase requests and no personal content in logs.
- Free tiers: no new services, no background work, no extra Worker bindings.

## Components and data flow

```
EventsPage (SPA, /events?q=&year=)
  │  TanStack Query: useInfiniteQuery(["events","list",{q,year}]), useQuery(["events","years"])
  ▼
src/features/events/api.ts ── apiFetch (Bearer token) ──► /api/journal/* (Hono, src/worker/events.ts)
                                                            │ requireUser → getClaims(token)
                                                            │ Zod: params, body (allowlist)
                                                            ▼
                                       src/features/events/server/{queries,mutations}.ts
                                                            │ supabase-js with the caller's token
                                                            ▼
                         Supabase PostgREST ── RLS ──► public.events
                                             └──────► rpc events_page / events_counts / events_years
                                                       (SECURITY INVOKER: RLS applies inside)
```

### Files

| Path | Responsibility |
| --- | --- |
| `supabase/migrations/<timestamp>_events.sql` | Table, constraints, trigger, grants, RLS, search functions ([Appendix A](#appendix-a-draft-migration)) |
| `src/worker/events.ts` | Hono routes under `/journal`, `requireUser`, Zod parsing, response shaping. Mounted in `src/worker/app.ts` with `.route("/journal", events)`. |
| `src/features/events/server/queries.ts` | `listEvents`, `listYears`: RPC calls and row → view-model mapping. Server-only. |
| `src/features/events/server/mutations.ts` | `createEvent`, `updateEvent`, `deleteEvent`. Server-only. |
| `src/features/events/server/errors.ts` | `EventsError` (safe code, status, field errors) and `fromDbError` |
| `src/features/events/domain/validation.ts` | Field rules shared by the form and the Worker: trim, NFC, code-point lengths, date, time, and link normalization |
| `src/features/events/types.ts` | `EventItem`, `EventsPage`, request and error types (browser-safe) |
| `src/features/events/api.ts` | Query options and mutation helpers over `apiFetch` |
| `src/features/events/components/*` | List, row, search bar, form dialog, delete dialog |
| `src/app/pages/events.tsx` | Replace the placeholder. The route declares `validateSearch` for `q` and `year`. |
| `src/lib/dates.ts` (moved) | `LocalDate`, `formatDate` ("13 Oct 2026") and the calendar helpers, moved out of `src/features/finisher/domain/dates.ts`. Finisher keeps its week/session logic and re-imports these. Events must not import Finisher modules. |
| `src/components/forms/date-picker.tsx`, `form-field.tsx` (moved) | The Finisher `DatePicker` and `FormField` become shared, so Events reuses them without a cross-feature import. They get a `min`/`max` range, and the calendar caption lets the user reach 1900 and 2100 quickly. |

The moves are mechanical; keep Finisher tests green. If the Developer prefers to defer them, duplicating `formatDate` is **not** acceptable (it has already caused a "Sept" bug in the prototype). Move at least `src/lib/dates.ts`.

## API contract

All routes are under `/api/journal` (not `/api/events`: ad and tracking blockers match that path as analytics and silently block it, seen on a phone browser 2026-10-13) and run `requireUser` (Bearer token, verified with `getClaims`, non-anonymous). Responses carry `Cache-Control: private, no-store` and the existing security headers (ADR-0003). Errors are `{ error, fields? }` with safe codes; database text is never forwarded. Writes pass the existing `guardWrites` checks (foreign `Origin` → 403, non-JSON body → 415). No CORS headers are sent. The `X-Time-Zone` header is not needed: the server never computes "today" for Events.

### `EventItem` (response view model)

```ts
type EventItem = {
  id: string;            // uuid
  title: string;
  date: string;          // "YYYY-MM-DD" (date-only)
  time: string | null;   // "HH:mm" (Postgres "07:45:00" trimmed by the Worker)
  link: string | null;   // http(s) URL
  notes: string | null;
  createdAt: string;     // ISO instant (UTC)
  updatedAt: string;
  match: "exact" | "accent" | null; // null when no search text
};
```

`user_id` and `search_folded` are never returned.

### `POST /api/journal/query`: list and search (EVT-002, EVT-009)

The list is read with a **POST with a JSON body**, not `GET ?q=`. Workers Logs is enabled (`wrangler.jsonc` `observability`), and invocation logs record request URLs, so search text in a query string would end up in Cloudflare logs (EVT-007). This is a read: it changes nothing and is safe to retry.

| Body field | Rule | Invalid → |
| --- | --- | --- |
| `q` | Optional string. Trimmed, NFC-normalized, at most 100 code points; empty means none. | 400 `invalid_request` |
| `year` | Optional integer, 1900–2100 | 400 |
| `cursor` | Optional opaque string, at most 512 chars, from a previous `nextCursor` | 400 |
| other keys | Rejected (`z.strictObject`) | 400 |

Response `200`:

```ts
{ items: EventItem[];            // up to 50
  nextCursor: string | null;     // null when no more
  counts?: { exact: number; accent: number } } // only on the first page (no cursor)
```

- **Paging.** The service calls `rpc("events_page", { p_q, p_year, p_after_*…, p_limit: 51 })`. With 51 rows it returns 50, and `nextCursor` encodes the 50th row's keyset (`rank, date, hasTime, time, createdAt, id`) as base64url JSON. The cursor is opaque to the browser and fully re-validated by Zod when it comes back. A tampered cursor can only reposition the caller's own results.
- **Counts.** `rpc("events_counts", { p_q, p_year })` is called on the first page only. Without `q`, `exact` is the total and `accent` is 0. The SPA shows "N events" or "N events found · X exact, Y more without accents".
- **Group headings.** The SPA starts a new group heading when `match` changes from `exact` to `accent` between consecutive items (including across pages).

### `GET /api/journal/years` (EVT-009)

`200 { years: number[] }`, descending, from `rpc("events_years")`. It contains no personal text.

### `POST /api/journal`: create (EVT-003)

Body (strict allowlist): `{ title: string; date: string; time?: string | null; link?: string | null; notes?: string | null }`.

- `201 { item: EventItem }` (with `match: null`). The service inserts the allowlisted columns only, then `.select(<columns>).single()`.
- `422 { error: "validation", fields }`, where `fields` maps a field name to a reason:
  - `title`: `required`, `too_long`
  - `date`: `required`, `invalid`, `out_of_range`
  - `time`: `invalid`
  - `link`: `invalid`, `too_long`
  - `notes`: `too_long`
- `400 invalid_request` for a malformed body, unknown keys, or a body over the existing 32 KB limit.
- **Duplicates.** POST is not idempotent. Double submission is prevented in the SPA (the button is disabled while pending, EVT-003). A retried request after a lost response can create a duplicate, which the user can delete. That's acceptable for a manual log, so no idempotency keys are needed.

### `PATCH /api/journal/:id`: edit (EVT-005)

- `:id` must be a UUID, otherwise 404 (same as Finisher's `idParam`).
- **Body:** any non-empty subset of the create fields, as a strict allowlist. `title` and `date` can't be null. `time`, `link` and `notes` accept `null` or `""` to clear.
- **Responses:**
  - `200 { item }` on success.
  - `404 not_found` when no row was updated: it doesn't exist, it belongs to someone else (RLS hides it), or it was deleted elsewhere.
  - `422` and `400` as for create.
- `updated_at` is set by the trigger. Concurrent edits are last-write-wins, which is acceptable for a single-owner log; no version column.

### `DELETE /api/journal/:id` (EVT-006)

- `200 { ok: true }` whether or not a row was deleted: "already gone" counts as success. That reveals nothing about other users' rows, because the answer is the same for every ID.
- A non-UUID ID gives 404.

### Status codes summary

| Code | When |
| --- | --- |
| 401 `unauthenticated` | Missing, invalid, expired or anonymous token, or the database reports 28000/42501/PGRST301 |
| 403 `invalid_origin` | A write from a foreign `Origin` |
| 404 `not_found` | Unknown route, non-UUID ID, or PATCH matched no row |
| 415 | A write without a JSON content type |
| 400 `invalid_request` | Malformed body, query or cursor; database 23514/22007/22008/22P02 (a constraint the Worker missed) |
| 422 `validation` | Field errors from `domain/validation.ts` |
| 503 `unavailable` | Any other database or network error. Only the error code is logged. |

The app-level `onError` in `src/worker/app.ts` handles `EventsError` the same way as `FinisherError`. A tiny shared base class (`ApiError` with `code`, `status`, `fields`) is a welcome clean-up but not required.

## Validation rules (shared `domain/validation.ts`)

| Field | Normalize | Accept | Error |
| --- | --- | --- | --- |
| title | Trim, then NFC | 1–120 **code points** (`[...s].length`, which matches Postgres `char_length`) | `required`, `too_long` |
| date | none | `^\d{4}-\d{2}-\d{2}$`, a real calendar date, 1900-01-01 to 2100-12-31 | `required`, `invalid`, `out_of_range` |
| time | Trim; `""` → null | `^([01]\d\|2[0-3]):[0-5]\d$` (the SPA pads "7:45" before sending) | `invalid` |
| link | Trim; `""` → null; if there's no `scheme:` prefix, add `https://` (A4) | ≤ 2048 chars; `new URL()` parses it; protocol `http:`/`https:`; non-empty hostname; no whitespace or control characters. The value is stored as entered (after adding the scheme), not as `URL.href`. | `invalid`, `too_long` |
| notes | Trim, NFC; `""` → null | ≤ 2000 code points | `too_long` |

The database constraints repeat these rules (Appendix A) as the authority for direct Supabase writes. Edge case: input such as `localhost:3000/x` looks like it has a scheme and is rejected as `invalid`. That's acceptable.

## Data model

`public.events` (one row per event):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | `gen_random_uuid()`; not insertable by users |
| `user_id` | `uuid not null` | `default auth.uid()`, FK `auth.users` `on delete cascade`; not insertable or updatable by users |
| `title` | `text not null` | 1–120, not blank, NFC |
| `event_date` | `date not null` | 1900-01-01 to 2100-12-31. A date-only value, never a timestamp. |
| `event_time` | `time(0)` null | A whole minute, no timezone (A10) |
| `link` | `text` null | ≤ 2048, `^https?://[^/?#\s]+` |
| `notes` | `text` null | 1–2000 when present, NFC |
| `search_folded` | `text` | `generated always as (events_private.fold(title ' ' notes)) stored` |
| `created_at`, `updated_at` | `timestamptz` | Defaults `now()`; trigger on update; not writable by users |

- **Index:** `(user_id, event_date desc, created_at desc)`. It serves the unfiltered list and the year range. Search scans the caller's rows (TD-EVT-1).
- **Grants:** revoke all from `public`, `anon` and `authenticated`. Then grant `authenticated` `SELECT` and `DELETE`, plus `INSERT (title, event_date, event_time, link, notes)` and `UPDATE (same columns)`.
- **RLS policies** (`to authenticated`):
  - select: `user_id = (select auth.uid())`
  - insert: `with check (user_id = (select auth.uid()))`
  - update: `using (…)` and `with check (…)`
  - delete: `using (…)`
- **Functions:**
  - `public.events_search(p_q, p_year)`, `events_page(…)`, `events_counts(p_q, p_year)` and `events_years()`. All are `security invoker`, `stable`, `search_path = ''`, executable by `authenticated` only.
  - `events_private.fold(text)` is immutable; `authenticated` may execute it (it's needed inside the invoker functions and by the generated column).

### Search semantics (A11, A13, decision 8)

- `q` is NFC-normalized and trimmed. Stored text is NFC (a constraint), so the same letter typed composed or decomposed matches as exact.
- **exact** (rank 2): `strpos(lower(title || ' ' || coalesce(notes,'')), lower(q)) > 0`
- **accent** (rank 1): not exact, and `strpos(search_folded, fold(q)) > 0`
- `fold(t) = lower(translate(regexp_replace(normalize(t, NFD), '[U+0300-U+036F]', '', 'g'), 'đĐ', 'dD'))`. This removes all Vietnamese tone and vowel marks (they are all combining marks in that block, including the horn U+031B and the dot below U+0323).
- `strpos` treats `%` and `_` as plain characters, so no escaping is needed.
- **Order:** `match_rank desc, event_date desc, (event_time is not null) desc, coalesce(event_time,'00:00') desc, created_at desc, id desc`. This is EVT-002's order (A1, A9) inside each group, with `id` as the final tie-breaker so the order is total.
- **Keyset:** a row-value comparison on the same six keys, all descending, so a single `<` works. It was checked across the exact → accent boundary.

## Dates and timezone

- `event_date` is a date-only value and `event_time` is a wall-clock time without a zone. Neither is ever converted, so no `X-Time-Zone` is needed.
- "Today" (the default date in the form, the "Upcoming" label) is computed in the browser from its local date. The server enforces only 1900–2100.
- `created_at` and `updated_at` are UTC instants, displayed with `formatDate` on the browser's local date.

## Security: threats and controls

| Threat | Control | Test |
| --- | --- | --- |
| Direct PostgREST reads or writes of another user's rows | Owner RLS on every operation; RPCs are invoker functions | DB: B can't select, update, delete or search A's rows; B's years exclude A's |
| Spoofed owner (`user_id` in the body, or a direct insert with `user_id`) | The Worker allowlist drops it; column grants refuse it (42501); the default is `auth.uid()` | DB: insert with `user_id` and update `user_id` are both denied |
| Tampering with `id`, `created_at`, `updated_at`, `search_folded` | Not granted for insert or update | DB: each one is denied |
| Bypassing validation through direct Supabase calls | CHECK constraints mirror every rule | DB: bad link, date, time, blank title and NFD title are all rejected |
| Anonymous or signed-out access | `anon` has no table or function privileges; the API requires a non-anonymous JWT | DB: anon select and RPC are denied; API: 401 cases |
| Supabase anonymous sign-ins (role `authenticated` with `is_anonymous`) | The API refuses them. **The DB policies do not**, which is the same as Finisher. They rely on anonymous sign-ins staying disabled in Supabase Auth (the invite-only access model). | Revisit trigger in ADR-0004 |
| Record-ID guessing | UUIDs; RLS; PATCH returns 404, and DELETE returns 200 for every ID, so neither reveals whether a row exists | API: B patching A's ID → 404, and A's row is unchanged |
| XSS through title, notes or link | React text rendering only (no `dangerouslySetInnerHTML`); notes use `white-space: pre-wrap`; the link is rendered as `href` only after the browser re-checks the protocol is `http:`/`https:`; strict CSP (`script-src 'self'`) | Unit: `javascript:` and `data:` are refused at validation; component or E2E: HTML in notes is shown literally |
| Leaking the app URL (with `?q=`) to linked sites | `rel="noopener noreferrer"` on event links; `Referrer-Policy: strict-origin-when-cross-origin` | Review |
| Search text or content in logs | Search goes in a POST body; `onError` and `fromDbError` log the error name or code only; no request logging middleware | Review; grep for `console.*` in the events modules |
| Shared caching | `private, no-store` on every API response; list data stays in the TanStack Query memory cache only | API: header asserted |
| CSRF | Bearer token; `guardWrites` (Origin and JSON); no CORS | Existing tests cover the middleware; add one events write |
| Oversized payloads or enumeration by paging | 32 KB body limit; `p_limit` capped at 101 in SQL and 51 from the service; `q` ≤ 100 | API: 400 on oversized `q` and bad cursor |
| SSRF or link previews | The Worker never fetches links | Review |

Session revocation follows the existing behaviour (auth architecture R3): a revoked session works until its access token expires.

## Failure and concurrency behaviour

- **List load fails:** the SPA shows the error with Retry (EVT-002). Search text and year stay in the URL.
- **Write fails:** the dialog keeps the values (EVT-003). The mutation is not retried automatically (TanStack Query `retry: 0` for mutations), which avoids duplicate creates.
- **Edit of a deleted row:** 404 → "This event no longer exists" and the list is invalidated (EVT-005).
- **Delete races:** idempotent 200 (EVT-006).
- **Concurrent edits from two tabs:** last write wins.
- **Cache refresh:** after any write, invalidate `["events"]` (the list and years). On first-page refetch, the infinite query resets to page 1. The SPA keeps the edited row open and focused when it is in the first page; otherwise it shows the toast (design notes).

## Implementation steps

1. **Shared code moves:** `src/lib/dates.ts`, and `src/components/forms/{date-picker,form-field}.tsx`. Update the Finisher imports, then run the tests.
2. **Migration** `supabase/migrations/<timestamp>_events.sql` from Appendix A. Add the header comment that names ADR-0004.
3. **DB tests** `supabase/tests/events-rls.test.ts`, using `tests/support/supabase-db.ts` (PGlite).
4. **Domain validation and its unit tests:** `tests/unit/events-validation.test.ts`.
5. **Server service, errors and Worker routes**, mounted in `app.ts`. API tests in `tests/unit/api-events.test.ts`, following `api-finisher.test.ts`.
6. **SPA:** `api.ts`, components, page and route search params, using the design reference.
7. Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. Generate database types if the CLI becomes available; otherwise use hand-written row types, as Finisher does.

### Deployment and rollback

- Apply the migration to the Supabase project before deploying the Worker, because the routes depend on the table.
- **Rollback:** redeploy the previous Worker. The table can stay, since nothing else reads it. A down-migration (`drop function …; drop table public.events; drop schema events_private;`) destroys user data, so run it only before real use, and only with the user's explicit approval.
- **Re-check on the hosted Postgres (15 or 17):**
  - `normalize()` and `IS NFC NORMALIZED` in a CHECK constraint;
  - the immutable `fold` in a generated column;
  - column-level grants via PostgREST (insert and update with only the granted columns);
  - that `returning`/`.select()` after insert works with `SELECT` granted. It does, because select is granted on all columns.

## Test obligations (for the Tester)

- **Database (PGlite):**
  - all rows of the security table above;
  - search groups with the requirement's examples ("phở", "pho", "gia dinh"), `%`/`_` as literals, the year filter, counts;
  - keyset paging with page size 1 across the group boundary, and with equal dates or times;
  - constraints at their edges (1900-01-01, 2100-12-31, 120/121 and 2000/2001 code points, a 2048/2049-character link).
- **API:**
  - 401 without a token or with an anonymous token;
  - `no-store` on every response;
  - 403 on a foreign Origin, 415 on a non-JSON body;
  - strict bodies (unknown key → 400);
  - 422 field codes;
  - PATCH on another user's ID → 404;
  - DELETE is idempotent;
  - `q` over 100 → 400; tampered cursor → 400;
  - no database text in any error body.
- **Unit:** validation (link normalization, `javascript:`, `data:`, `mailto:`, emoji counted by code point, NFC), time padding, cursor encode/decode.
- **Browser (when Playwright is available):** create, edit, delete; search with URL restore; HTML in notes shown literally; layout at 320px.

## Alternatives considered

- **Definer-function writes (ADR-0002 style):** rejected in ADR-0004.
- **`GET /api/journal?q=`:** the natural REST shape, but it puts search text into Workers Logs. Rejected in favour of `POST /api/journal/query`.
- **PostgREST `ilike` filters plus `unaccent`:** this would need `%`/`_` escaping and two queries merged for grouping. `unaccent` is not immutable, so it can't feed a generated column without a wrapper, and its rules must be checked for Vietnamese stacked marks. `normalize(NFD)` plus stripping combining marks covers Vietnamese completely and was verified.
- **A `pg_trgm` index now:** unnecessary at personal scale (TD-EVT-1).
- **A separate detail route `GET /api/journal/:id`:** not needed, because the design shows details inline from the list data. Add it if a shareable event URL is ever required.

## Appendix A: draft migration

This SQL was checked on 2026-10-13 in PGlite (Postgres 18) with the repository's Supabase bootstrap (roles, default grants, `auth.uid()` from JWT claims):

- **Search groups:**
  - "phở" → exact "Ăn phở với gia đình", then accent "Pho cooking class"
  - "PHO" → the reverse
  - "gia dinh" and "da lat" → accent only
  - "%" and "%_" → only the title that literally contains them
- **Year filter and years list.**
- **Keyset paging:** page size 1 across the group boundary; page size 2 over the whole list. No duplicates or gaps.
- **Second user:** can't see, update, delete or search the first user's rows.
- **Column grants:** deny `user_id`, `id`, `created_at` and `updated_at` writes (42501).
- **`anon`:** denied on the table and the RPCs.
- **Constraints:** reject a `javascript:` link, `https://` with no host, 2101-01-01, a blank title, a time with seconds, an NFD title and empty notes. 1900-01-01 is accepted.
- **Trigger:** moves `updated_at`.

`events_counts` was added afterwards, and the whole block below was then re-run exactly as written: counts for "phở" are 1 exact and 1 accent, the year filter applies, the second user's rows are excluded, and anon is denied.

```sql
-- Events: life events log. Requirements: requirements/events.md (EVT-001 to EVT-009).
-- Decision: docs/architecture/decisions/ADR-0004-events-table-writes-under-rls.md
--   * Users write the table directly under owner RLS; column grants allow only
--     title, event_date, event_time, link, notes. CHECK constraints are the authority.
--   * Search and paging are SECURITY INVOKER functions, so RLS applies inside them.

create schema events_private;
revoke all on schema events_private from public, anon, authenticated;
grant usage on schema events_private to authenticated;

-- Accent folding (A13): strip combining marks U+0300–U+036F after NFD, đ → d, lower-case.
-- normalize() must stay unqualified: it is SQL-standard syntax (NFD is a keyword).
create function events_private.fold(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select pg_catalog.lower(pg_catalog.translate(
    pg_catalog.regexp_replace(normalize(t, NFD), '[' || pg_catalog.chr(768) || '-' || pg_catalog.chr(879) || ']', '', 'g'),
    'đĐ', 'dD'))
$$;
revoke all on function events_private.fold(text) from public, anon, authenticated;
grant execute on function events_private.fold(text) to authenticated;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120 and btrim(title) <> '' and title is nfc normalized),
  event_date date not null check (event_date between date '1900-01-01' and date '2100-12-31'),
  event_time time(0) check (event_time is null or extract(second from event_time) = 0),
  link text check (link is null or (char_length(link) <= 2048 and link ~ '^https?://[^/?#[:space:]]+')),
  notes text check (notes is null or (char_length(notes) between 1 and 2000 and notes is nfc normalized)),
  search_folded text generated always as (events_private.fold(title || ' ' || coalesce(notes, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_user_order_idx on public.events (user_id, event_date desc, created_at desc);

create function events_private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := pg_catalog.now(); return new; end $$;
create trigger events_touch_updated_at before update on public.events
  for each row execute function events_private.touch_updated_at();

alter table public.events enable row level security;
revoke all on table public.events from public, anon, authenticated;
grant select, delete on table public.events to authenticated;
grant insert (title, event_date, event_time, link, notes) on table public.events to authenticated;
grant update (title, event_date, event_time, link, notes) on table public.events to authenticated;

create policy events_select_own on public.events for select to authenticated
  using (user_id = (select auth.uid()));
create policy events_insert_own on public.events for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy events_update_own on public.events for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy events_delete_own on public.events for delete to authenticated
  using (user_id = (select auth.uid()));

-- match_rank: 2 = exact (case-insensitive), 1 = only after accent folding. No search text: every row is 2.
create function public.events_search(p_q text default null, p_year integer default null)
returns table (id uuid, title text, event_date date, event_time time, link text, notes text,
               created_at timestamptz, updated_at timestamptz, match_rank integer)
language sql stable security invoker set search_path = '' as $$
  with p as (select nullif(pg_catalog.btrim(normalize(coalesce(p_q, ''), NFC)), '') as q)
  select * from (
    select e.id, e.title, e.event_date, e.event_time, e.link, e.notes, e.created_at, e.updated_at,
      case
        when p.q is null then 2
        when pg_catalog.strpos(pg_catalog.lower(e.title || ' ' || coalesce(e.notes, '')), pg_catalog.lower(p.q)) > 0 then 2
        when pg_catalog.strpos(e.search_folded, events_private.fold(p.q)) > 0 then 1
        else 0
      end as match_rank
    from public.events e cross join p
    where p_year is null
       or (e.event_date >= pg_catalog.make_date(p_year, 1, 1) and e.event_date < pg_catalog.make_date(p_year + 1, 1, 1))
  ) s where s.match_rank > 0
$$;

create function public.events_page(
  p_q text default null, p_year integer default null,
  p_after_rank integer default null, p_after_date date default null, p_after_has_time boolean default null,
  p_after_time time default null, p_after_created timestamptz default null, p_after_id uuid default null,
  p_limit integer default 50)
returns table (id uuid, title text, event_date date, event_time time, link text, notes text,
               created_at timestamptz, updated_at timestamptz, match_rank integer)
language sql stable security invoker set search_path = '' as $$
  select s.* from public.events_search(p_q, p_year) s
  where p_after_id is null
     or (s.match_rank, s.event_date, s.event_time is not null, coalesce(s.event_time, time '00:00'), s.created_at, s.id)
      < (p_after_rank, p_after_date, p_after_has_time, coalesce(p_after_time, time '00:00'), p_after_created, p_after_id)
  order by s.match_rank desc, s.event_date desc, (s.event_time is not null) desc,
           coalesce(s.event_time, time '00:00') desc, s.created_at desc, s.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 101)
$$;

create function public.events_counts(p_q text default null, p_year integer default null)
returns table (exact_count integer, accent_count integer)
language sql stable security invoker set search_path = '' as $$
  select (count(*) filter (where s.match_rank = 2))::integer,
         (count(*) filter (where s.match_rank = 1))::integer
  from public.events_search(p_q, p_year) s
$$;

create function public.events_years() returns setof integer
language sql stable security invoker set search_path = '' as $$
  select distinct pg_catalog.date_part('year', e.event_date)::integer from public.events e order by 1 desc
$$;

revoke all on function public.events_search(text, integer) from public, anon;
revoke all on function public.events_page(text, integer, integer, date, boolean, time, timestamptz, uuid, integer) from public, anon;
revoke all on function public.events_counts(text, integer) from public, anon;
revoke all on function public.events_years() from public, anon;
grant execute on function public.events_search(text, integer) to authenticated;
grant execute on function public.events_page(text, integer, integer, date, boolean, time, timestamptz, uuid, integer) to authenticated;
grant execute on function public.events_counts(text, integer) to authenticated;
grant execute on function public.events_years() to authenticated;
```

## Open technical questions

None block implementation. To confirm at deployment: the hosted Postgres behaviour listed under Deployment and rollback.
