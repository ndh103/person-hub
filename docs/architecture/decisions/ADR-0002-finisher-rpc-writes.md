# ADR-0002: Finisher writes go through database functions; tables are read-only to users

- Status: accepted (reviewed by the Technical Architect on 2026-10-20 in [docs/architecture/finisher.md](../finisher.md#review-of-adr-0002); originally proposed by the Developer on 2026-10-11. This is not a record of user approval.)
- Date: 2026-10-11
- Related: [requirements/finisher.md](../../../requirements/finisher.md) (FIN-017, FIN-025 to FIN-028), [docs/implementation/finisher.md](../../implementation/finisher.md), [ADR-0001](ADR-0001-supabase-auth-ssr.md), migration `supabase/migrations/20261011120000_finisher.sql`

## Context

FIN-017 requires that another user's records behave as if they do not exist, both through the API and **directly through the database with the caller's session**. It also requires that a session record can refer only to the caller's own slot, and only to a date for which FIN-026 schedules a session. CLAUDE.md requires policies that stay safe under direct Supabase requests, because the publishable key and the user's JWT are enough to call PostgREST without the app's own API.

Several Finisher writes change more than one row and must be atomic:

- An edit to a slot closes the current version and opens a new one from today (FIN-025).
- Park, finish, let go, unpark and reopen also change the project's active periods (FIN-026).

`supabase-js` has no client-side transactions.

## Alternatives

1. **Owner RLS policies for SELECT, INSERT, UPDATE and DELETE, with the writes in TypeScript.** This is the simplest option. However, multi-row writes are not atomic. A direct API caller could also bypass the lifecycle rules and the marking window on their own data, for example by inserting a mark for a future date or a date with no session, which FIN-017 forbids.
2. **`SECURITY INVOKER` functions plus owner write policies.** The writes are atomic, but direct table writes stay possible, with the same bypass as option 1. Enforcing the schedule in triggers would duplicate the functions.
3. **`SECURITY DEFINER` functions as the only write path.** Signed-in users get `SELECT` with owner policies, and no role has `INSERT`, `UPDATE` or `DELETE` on the tables. (Chosen.)

## Decision

Option 3:

- **Tables.** On all six `finisher_*` tables, RLS is enabled. Grants are revoked from `public`, `anon` and `authenticated`. `authenticated` gets `SELECT` only, through the policy `user_id = (select auth.uid())`.
- **Write functions.** The twelve `public.finisher_*` write functions:
  - are `SECURITY DEFINER` with `search_path = ''`;
  - may be executed by `authenticated` only (revoked from `public` and `anon`);
  - begin with `finisher_private.require_uid()` (`auth.uid()`, otherwise SQLSTATE 28000) and filter every statement by that ID;
  - derive ownership from that ID and never from an argument;
  - enforce the lifecycle tables, the field limits, the marking window, the schedule rule and the 20-slot cap.
- **Helpers.** These live in the `finisher_private` schema. PostgREST does not expose it, and execute rights are revoked.
- **Foreign keys.** Composite foreign keys `(parent_id, user_id)` stop cross-user references, even for the owner role.
- **App code.** The app's service layer still validates input first, for friendly field errors (`src/features/finisher/domain/validation.ts`). The database is the authority.
- **Default data flow is unchanged.** The data still goes browser → API → server-only service → Supabase with the caller's session (since [ADR-0003](ADR-0003-spa-and-worker-api.md) the API is a Hono Worker, not a Next.js Route Handler). Only the database side changes: writes are RPC calls instead of table writes. No secret or service-role key is used.

## Consequences

- **Elevated code.** `SECURITY DEFINER` bypasses RLS inside the functions. That makes each function's `user_id` filter security-critical. The functions are short and reviewed, and `supabase/tests/finisher-rls.test.ts` calls every write function as a second user and expects "not found" (SQLSTATE PH404) with the data unchanged. Any new write function needs the same test.
- **Rules live in SQL.** Business rules are written in SQL (lifecycle and schedule). The same schedule rule also exists in TypeScript for reads (`domain/schedule.ts`, `finisher_private.is_scheduled`), and the two must be changed together.
- **Timezone.** The caller passes the timezone (`p_tz`, assumption A1), and "today" is computed in the database from it. A caller can shift "today" by about a day by naming another zone. Only their own data is affected, and this is accepted.
- **Errors.** The functions raise SQLSTATEs PH404, PH409 and PH422, where the message for PH422 is the field name. These are mapped to safe API codes in `src/features/finisher/server/errors.ts`. Database text is never forwarded.
- **Database types.** These were not generated: the Supabase CLI is not installed here. The read layer uses hand-written row types.

## Revisit when

- The TA writes `docs/architecture/finisher.md`.
- An account timezone replaces the browser timezone (requirements Q1).
- Finisher needs bulk operations or imports.
- Supabase changes how functions in `public` are exposed.
