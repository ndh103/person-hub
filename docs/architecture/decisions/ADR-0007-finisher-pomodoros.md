# ADR-0007: Pomodoro sessions are stored server-side, with completion derived from time

- Status: accepted (Technical Architect, 2026-10-20). Adopted for implementing FIN-039 and FIN-040; this is not a record of user approval.
- Related: [requirements/finisher.md](../../../requirements/finisher.md) v5.0 (FIN-039, FIN-040, decisions 23–26, A18–A20), [Finisher architecture](../finisher.md#pomodoro-fin-039-fin-040), [ADR-0002](ADR-0002-finisher-rpc-writes.md), design notes ([Pomodoro](../../../output/designs/finisher/design-notes.md#pomodoro-fin-039-fin-040))

## Context

A Pomodoro lasts a fixed 25 minutes. It must survive a reload, navigation and other devices, and only one may run per user. Stopping early abandons it, and a session that reaches 25 minutes counts even if the app is closed (A20). Today's count uses the local date on which a session ended. The rules forbid automation: nothing may change state without a user action. The hosting has no scheduler on the free plan we rely on.

## Alternatives

1. **Timer in the browser only (local storage), and the client posts "completed".** It doesn't survive another device. A closed tab never reports completion, which breaks A20. Personal data would sit in browser storage, which CLAUDE.md forbids. Rejected.
2. **The server stores the session, and a scheduled job marks it completed.** It needs Cron Triggers or `pg_cron`, and it is "automation". Rejected.
3. **The server stores `started_at` and `ends_at` set by `now()` in a database function; the state is derived from the time.** (Chosen.)
   - running = `stopped_at is null and now() < ends_at`;
   - completed = `stopped_at is null and ends_at <= now()`;
   - abandoned = `stopped_at is not null`.

## Decision

- **Table `public.finisher_pomodoros`:**
  - columns: `id`, `user_id`, `task_id` (nullable), `started_at`, `ends_at`, `duration_minutes` (check `= 25`), `stopped_at`;
  - a composite foreign key `(task_id, user_id)` to `finisher_tasks (id, user_id)` with `on delete set null (task_id)`, so completed sessions stay counted after a task is deleted (A19);
  - SELECT for the owner under RLS; no write grants (ADR-0002).
- **Writes through `SECURITY DEFINER` functions,** each starting with `require_uid()` and filtering by it:
  - **`finisher_start_pomodoro(p_task_id, p_replace default false)`:**
    - takes a per-user advisory lock;
    - the task must be the caller's own (otherwise `PH404`) and Open (otherwise `PH409`, A18);
    - a running session gives `PH409`, unless `p_replace`, which stops it first (Switch);
    - inserts `started_at = now()` and `ends_at = now() + 25 min`.
  - **`finisher_stop_pomodoro(p_id)`:** the caller's own session (otherwise `PH404`), which must still be running (otherwise `PH409`, meaning already completed or stopped). Sets `stopped_at = now()`.
  - **`finisher_delete_task`** (replaced) abandons that task's running session before deleting the task. A session for a deleted task would otherwise run and count against nothing.
- **Clock:** the database's `now()` is the only clock for state. The API returns `serverNow` with the active session, and the browser counts down using the offset between that and its own clock, so a wrong device clock doesn't shift the countdown.
- **Completion signal in the app:** when the countdown reaches zero, the browser shows the message and plays a chime, then refetches. It writes nothing; the server already treats the session as completed.

## Consequences

- **No background work and no automation.** Counts are always consistent across devices.
- **Reads compare against `now()`.** The Worker passes ISO instants (now, and the start of the local day from `zonedToUtc`) as filters.
- **A session can complete while the user is away,** and it counts. That is A20, and Stop is the only way to abandon one.
- **Double-click Start:** one write function under a lock means two quick Start clicks give one session and one `PH409`, never two running sessions.
- **One more table and three functions,** each with second-user denial tests (ADR-0002).

## Revisit when

- Configurable lengths, pause or breaks are requested (out of scope now): `duration_minutes` and a pause log would then be needed.
- Notifications are brought into scope: completion would need a server-side event.
