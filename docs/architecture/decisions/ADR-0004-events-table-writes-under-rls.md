# ADR-0004: Events writes go straight to the table under owner RLS; search runs in invoker SQL functions

- Status: accepted (Technical Architect, 2026-10-13, for the Events implementation. This is not a record of user approval.)
- Date: 2026-10-13
- Related: [requirements/events.md](../../../requirements/events.md) (EVT-007, EVT-009), [docs/architecture/events.md](../events.md), [ADR-0002](ADR-0002-finisher-rpc-writes.md), [ADR-0003](ADR-0003-spa-and-worker-api.md)

## Context

ADR-0002 makes Finisher tables read-only to users and sends every write through `SECURITY DEFINER` functions. It did that because Finisher writes are multi-row (slot versions, project periods) and enforce rules such as lifecycles and the marking window, which plain table writes could bypass.

Events is different:

- **Writes.** Every write touches one row of one table.
- **Rules.** All of them are per-row and static: field lengths, a date range, the link scheme, Unicode normalization. CHECK constraints can express each one. Nothing depends on "today", on other rows, or on a status.
- **Ownership.** It is the only cross-user concern, and it has no references to other tables.
- **Search.** EVT-009 needs case-insensitive and accent-insensitive matching, exact matches ranked first, and stable keyset paging across both groups. PostgREST filters can't express that ranking or a multi-column keyset with mixed null handling cleanly. LIKE patterns would also need `%`/`_` escaping.

## Alternatives

1. **Follow ADR-0002: definer functions for create, update and delete; select-only grants.** This is consistent with Finisher. However, it adds three elevated functions whose `user_id` filters become security-critical, for rules that constraints already enforce. It's more elevated code with no protection gained.
2. **Plain table writes under owner RLS, with column-level grants and CHECK constraints. Reads and search go through `SECURITY INVOKER` SQL functions.** (Chosen.)
3. **Search in the Worker** by loading all the caller's events and filtering in TypeScript. This is simple at first but grows with the data. Paging becomes in-memory, and every search request transfers all notes.

## Decision

Option 2:

- **Table `public.events`.**
  - RLS is enabled, and all privileges are revoked from `public`, `anon` and `authenticated`.
  - `authenticated` gets `SELECT` and `DELETE`, plus `INSERT` and `UPDATE` **only on** `title, event_date, event_time, link, notes`.
  - `id`, `user_id`, `created_at`, `updated_at` and the generated `search_folded` column can't be written by users. `user_id` defaults to `auth.uid()`, and a trigger maintains `updated_at`.
  - There are four owner policies (select, insert with check, update using and with check, delete), each on `user_id = (select auth.uid())`.
- **Constraints** enforce every rule from the requirements' Fields table: lengths, non-blank title, the date range 1900–2100, a whole-minute time, an `http(s)://host` link, non-empty notes when present, and NFC text.
- **Search and paging** are `SECURITY INVOKER`, `STABLE` SQL functions in `public`: `events_search`, `events_page` and `events_years`. Because they run as the caller, RLS applies inside them.
  - Execute is revoked from `public` and `anon` and granted to `authenticated`.
  - Matching uses `strpos`, not LIKE, so `%` and `_` are literal with no escaping.
- **Accent folding** is `events_private.fold(text)`, an immutable SQL function: `normalize(NFD)`, then remove U+0300–U+036F, then map `đ`/`Đ` to `d`/`D`, then `lower`.
  - It feeds a stored generated column, `search_folded`.
  - `authenticated` can execute it, because invoker search calls it; it has no side effects. The `events_private` schema is not exposed by PostgREST.
- **No elevated code.** Events has no `SECURITY DEFINER` function, and the Worker holds no secret key.

## Consequences

- **Positive:**
  - No elevated SQL. Direct Supabase requests (PostgREST with the publishable key and the user's JWT) can do exactly what the API can, and nothing more. They get the same validation, because the constraints are the authority.
  - Searching and paging are a single round trip, scoped by RLS.
- **Negative: two write styles in one codebase.** Finisher uses RPC writes and Events uses table writes, so reviewers need to know which ADR applies. Mitigation: each migration's header names its ADR.
- **Negative: field errors.** A constraint violation (SQLSTATE 23514) names the constraint, not a field. The Worker validates every field with Zod first and returns field errors. The database check is the backstop, and a 23514 that reaches the Worker maps to a generic `invalid_request` (400). Constraint names must not be sent to the client.
- **Neutral:**
  - Search is a sequential scan over the caller's rows. That is fine for a personal log of thousands of events. See [technical-debt.md](../technical-debt.md) TD-EVT-1 for the trigger to add a trigram index.
- **Verified in PGlite (Postgres 18):** the draft SQL in [events.md](../events.md#appendix-a-draft-migration) was checked on 2026-10-13. The checks covered the search groups, paging across the group boundary, cross-user isolation, column-grant denials and the constraints. Supabase runs Postgres 15 or 17. `normalize()` and `IS NFC NORMALIZED` exist since Postgres 13, but this must be re-checked against the hosted project.

## Revisit when

- Events gains multi-row writes, cross-table references (for example, links to Finisher items), or rules that depend on "today" or status. Then reconsider definer functions (ADR-0002 style).
- Search needs word matching, ranking by relevance, or more than about 10,000 events per user.
- Anonymous Supabase sign-ins are enabled for the project. The policies would then need an `is_anonymous` restriction (see the hub-wide note in events.md).
