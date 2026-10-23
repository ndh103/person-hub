# Finisher: architecture

- Feature slug: `finisher`
- Status: `ready` for the v4 task enhancements (FIN-034 Tomorrow, FIN-036, FIN-037, FIN-038). This document does **not** yet describe the whole of Finisher. The existing data model and write path are recorded in [ADR-0002](decisions/ADR-0002-finisher-rpc-writes.md), in the migration `supabase/migrations/20261011120000_finisher.sql` and in [the implementation notes](../implementation/finisher.md). See [Gaps](#gaps-in-this-document).
- Date: 2026-10-20
- Requirements: [requirements/finisher.md](../../requirements/finisher.md) v5.0: FIN-034, FIN-036, FIN-037, FIN-038, FIN-039, FIN-040, and related FIN-017, FIN-020, FIN-021, FIN-022, FIN-031. Decisions 15–26, assumptions A11–A20.
- Design: [design notes](../../output/designs/finisher/design-notes.md), `output/designs/finisher/task-list.html` and `index.html`.
- Decisions: [ADR-0007 Pomodoro sessions](decisions/ADR-0007-finisher-pomodoros.md) (new, v5), [ADR-0005 task order keys](decisions/ADR-0005-finisher-task-order-keys.md) (new), [ADR-0006 drag-and-drop library](decisions/ADR-0006-drag-and-drop-library.md) (new), [ADR-0002 RPC writes](decisions/ADR-0002-finisher-rpc-writes.md), [ADR-0003 SPA and Worker API](decisions/ADR-0003-spa-and-worker-api.md).

## Summary of changes

| Requirement | SPA | Worker API | Database |
| --- | --- | --- | --- |
| FIN-034 Tomorrow shortcut | `task-form-dialog.tsx`, `domain/dates.ts` | none | none |
| FIN-036 side panel | Route search parameter `task`; panel component; reuses `finisherQueries.task(id)` | none (uses `GET /tasks/:id`) | none |
| FIN-037 quick due date | Menu items in `TaskActionsMenu`; date and time rule in `domain/` | **new** `PUT /api/finisher/tasks/:id/due` | **new** `finisher_set_task_due` |
| FIN-038 order | `@dnd-kit` sortable sections; Move items in the menu | **new** `PUT /api/finisher/tasks/:id/position`; `reopen` accepts `keepPosition`; list queries ordered by `sort_key` | **new** column `sort_key`, function `finisher_move_task`, helpers; changes to create, update and action functions |

The data flow is unchanged (ADR-0003): browser (TanStack Query) → Hono route in the Worker → `src/features/finisher/server` → Supabase RPC as the caller, under RLS-protected reads and `SECURITY DEFINER` writes (ADR-0002). No service-role key is used.

```
SortableSection (dnd-kit) ──PUT /tasks/:id/position {afterId, beforeId}──▶ Hono finisher route
TaskActionsMenu ───────────PUT /tasks/:id/due {dueDate, dueTime}─────────▶   │ zod body, requireUser
TaskCheck Undo ────────────POST /tasks/:id/actions {reopen, keepPosition}▶   ▼
                                                                    mutations.ts ─rpc(caller JWT)─▶ finisher_* functions
Side panel ────────────────GET /tasks/:id (existing)──────────────────▶ queries.ts ──select (RLS)──▶ finisher_tasks
```

## Review of ADR-0002

The Developer proposed ADR-0002 and asked for review when this document existed. I have reviewed it: table reads under owner RLS, no direct write grants, and `SECURITY DEFINER` write functions that derive the owner from `auth.uid()`. That approach suits Finisher's multi-row, rule-heavy writes. The new functions below follow it. **ADR-0002 is accepted** as of 2026-10-20 (TA review, not user approval).

## Task order (FIN-038)

The details are in [ADR-0005](decisions/ADR-0005-finisher-task-order-keys.md). In short: there is one `numeric` `sort_key` per task, a move sends the ids of the neighbours it lands between, and the database computes an exact midpoint.

### Schema change (new migration `supabase/migrations/20261020120000_finisher_task_order.sql`)

```sql
alter table public.finisher_tasks add column sort_key numeric;

-- Seed (A16): reproduce the pre-v4 display order per user.
with ranked as (
  select id, row_number() over (
           partition by user_id
           order by
             (status <> 'open'),                              -- open tasks first
             (due_date is null),                              -- dated before undated
             due_date, due_time nulls last,                   -- dated: by due date and time
             case when due_date is null and status = 'open'
                  then extract(epoch from created_at) end desc nulls last, -- undated: newest first
             created_at, id
         ) as n
    from public.finisher_tasks
)
update public.finisher_tasks t set sort_key = r.n from ranked r where r.id = t.id;

alter table public.finisher_tasks alter column sort_key set not null;
alter table public.finisher_tasks
  add constraint finisher_tasks_user_sort_key unique (user_id, sort_key) deferrable initially deferred;
create index finisher_tasks_user_status_order on public.finisher_tasks (user_id, status, sort_key, id);
```

- **Seed order:** it reproduces each pre-v4 section. Overdue and Upcoming were sorted by date and time, Today by time (nulls last), and No date newest first. Non-open tasks get keys after the open ones; their keys only matter for the Done → Undo case.
- **Constraint:** the unique constraint is deferrable, so a rebalance (a renumber of every row) can run in one statement without breaking it partway through.
- **Index:** the new index serves `status = 'open' order by sort_key, id`, including with a `project_id` filter for small per-user sets. The existing `finisher_tasks_user_status_due` stays for the date-range filters.
- **Grants and RLS:** no change. Users keep `SELECT` only, so `sort_key` cannot be written directly (ADR-0002). The new column is not added to the columns the API selects for the client.

### Database functions

Every function in the new migration uses `security definer set search_path = ''`, begins with `finisher_private.require_uid()`, filters every statement by `user_id = v_uid`, and uses existing SQLSTATEs.

| Function | Change |
| --- | --- |
| `finisher_private.lock_task_order(p_uid)` (new, private) | `pg_advisory_xact_lock(hashtextextended('finisher_task_order:' \|\| p_uid::text, 0))`. It serialises one user's order writes. |
| `finisher_private.bottom_key(p_uid)` (new, private) | Calls `lock_task_order`, then returns `coalesce(max(sort_key), 0) + 1` over **all** of the caller's tasks. |
| `finisher_private.rebalance_task_order(p_uid)` (new, private) | Renumbers the caller's tasks `1..n` by `(sort_key, id)`. |
| `finisher_create_task` | Inserts with `sort_key = bottom_key(v_uid)`. |
| `finisher_update_task` | If `p_due_date is distinct from v_task.due_date`, it sets `sort_key = bottom_key(v_uid)`. A change to the time or other fields keeps the key (FIN-038). |
| `finisher_task_action` | **Signature change**: adds `p_keep_position boolean default false`. `unpark` sets `bottom_key`; `reopen` sets `bottom_key` unless `p_keep_position`; `done`, `park` and `let_go` keep the key. The migration must `drop function public.finisher_task_action(text, uuid, text, date, text)`, create the 6-argument version, and re-grant execute to `authenticated` only. |
| `finisher_set_task_due(p_tz, p_task_id, p_due_date, p_due_time)` (new) | Locks the caller's task `for update`: not found raises `PH404`, and a status other than `open` raises `PH409` (FIN-037: Open only). Validates with `check_task_fields(..., v_task.project_id, v_task.project_id)` (date range ±5 years; time needs a date). Sets `due_date` and `due_time`, then `sort_key = bottom_key` when the date changed, and `updated_at = now()`. Idempotent: repeating the same values does not move the task again. |
| `finisher_move_task(p_task_id, p_after_id, p_before_id)` (new) | Described below. |

`finisher_move_task` works as follows:

1. **Check the input.** If both neighbour ids are null, or either equals `p_task_id`, raise `PH422 position`.
2. **Lock.** Call `lock_task_order(v_uid)`, then select the task `for update` where `id = p_task_id and user_id = v_uid`. Not found raises `PH404`; a status other than `open` raises `PH409`.
3. **Read the neighbours.** For each non-null neighbour, read its key `where id = … and user_id = v_uid`. Not found raises `PH404`; a status other than `open` raises `PH409`.
4. **Check the neighbours are still in order.** If both are given and `v_after >= v_before`, raise `PH409 order_changed` (a stale view).
5. **Find the gap between two adjacent keys of any status**, excluding the moving task. Keys are unique across all of a user's tasks, so a Parked or Done task can sit between two open neighbours (corrected during implementation, 2026-10-20):
   - `v_lower := coalesce(v_after, max(sort_key) where sort_key < v_before)`;
   - `v_upper := min(sort_key) where sort_key > v_lower` (or the smallest key when `v_lower` is null).
   The open neighbours fix the visible bounds, and the new key goes strictly inside them.
6. **Compute the key:** `v_key := case when v_lower is null then ceil(v_upper) - 1 when v_upper is null then floor(v_lower) + 1 else (v_lower + v_upper) * 0.5 end`.
7. **Write and rebalance.** Update `sort_key = v_key`. If `scale(v_key) > 20`, rebalance. `updated_at` is not touched: reordering is not an edit.

Both new functions are added to the grant list: revoke from `public` and `anon`, grant `execute` to `authenticated`.

### Error mapping

`fromDbError` maps `PH404` → 404 `not_found`, `PH409` → 409 `not_allowed`, and `PH422` → 422 `validation`. Add `position: "position"` to `DB_FIELDS` so a bad move is reported as `{ position: "invalid" }`. A stale order (`order_changed`) can stay `409 not_allowed`: the client's response to any 409 on a move is the same, a refetch.

## API contracts

The existing Worker rules apply to every route below:

- `requireUser` (Bearer token through `getClaims`; non-anonymous user);
- the write guards (foreign `Origin` refused; JSON-only bodies, bounded by `readJsonObject`);
- `Cache-Control: private, no-store`;
- no CORS headers;
- safe error codes only.

Ids that are not UUIDs give 404 (the existing `idParam`).

### `PUT /api/finisher/tasks/:id/position` (FIN-038)

- **Body** (Zod, strict, nothing else accepted): `{ afterId: uuid | null, beforeId: uuid | null }`. At least one is non-null, and neither equals `:id`.
- **Meaning:** the moved task sits directly after `afterId` and directly before `beforeId`, as the client displays the section at the drop. Top of a section: `afterId: null`, `beforeId: <first>`. Bottom: `afterId: <last>`, `beforeId: null`. When filtered or partly loaded, the client sends the shown neighbours only.
- **Server:** `mutations.moveTask` → RPC `finisher_move_task`. The time zone is not needed.
- **Responses:**
  - `200 { ok: true }`;
  - `401 unauthenticated`;
  - `404 not_found` (the task or a neighbour is missing or belongs to someone else; indistinguishable);
  - `409 not_allowed` (not Open, or a stale order);
  - `422 validation { position }`;
  - `400 invalid_request` (malformed body);
  - `503 unavailable`.
- **Idempotency:** repeating the same move after success reads the same two neighbour keys and computes the same midpoint, so it writes the same key. A retry is a no-op.

### `PUT /api/finisher/tasks/:id/due` (FIN-037)

- **Body:** `{ dueDate: "YYYY-MM-DD" | null, dueTime: "HH:mm" | null }`. It is parsed with the same rules as `parseTaskInput`'s date and time fields: a valid local date within ±5 years of the caller's today, and a time only with a date. No other fields are accepted, so this route can never wipe notes or a title (the reason it is not a partial `PATCH /tasks/:id`).
- **The client computes the values:**
  - Today, Tomorrow and Next week come from `domain/dates.ts`, using the same helpers as the FIN-034 buttons, evaluated at click time.
  - **Time:** keep the current `dueTime`, except that Today on a task whose time has already passed today sends `null` (A14 and decision 22).
  - **Undo** sends the previous date and time to the same route.
  - The server only validates. It does not need to know that a shortcut was used, which matches FIN-034's statement.
- **Server:** `mutations.setTaskDue` → RPC `finisher_set_task_due` with `p_tz`.
- **Responses:**
  - `200 { ok: true }`;
  - `401`;
  - `404`;
  - `409 not_allowed` (the task is not Open);
  - `422 validation { dueDate | dueTime }`;
  - `400`;
  - `503`.
- **Idempotency:** the PUT is idempotent.

### `POST /api/finisher/tasks/:id/actions`: `keepPosition`

- `parseTaskAction` accepts `keepPosition: boolean` (optional, default `false`), and only when `action` is `reopen`.
- The `TaskCheck` Undo toast (FIN-021) sends `{ action: "reopen", keepPosition: true }`. Every other reopen (the menu, Closed) omits it, so the task goes to the bottom.
- **Security:** a caller could always send `keepPosition: true`. That only affects the position of their own task, so it is accepted; no time window is enforced.

### Reads

- **Order:** in `queries.ts`, the open-task queries order by `sort_key` and then `id` instead of date and time. This covers `taskGroupPage` (overdue, today, upcoming, nodate), the due query in `getToday`, and the project page's open tasks (A13). The `parked` group keeps `order("revisit_date")`. Done today and Closed keep `closed_at`. Group membership (the overdue, today and upcoming filters) is unchanged.
- **No key in responses:** `sort_key` is not added to `TASK_COLUMNS` or any view model; the client needs ids in order only.
- **Pagination:** "Load more" keeps offset paging over `(sort_key, id)`.
- **Panel data (FIN-036):** the panel uses the existing `GET /api/finisher/tasks/:id`. It returns the task, project options and today, with 404 for missing or foreign ids. There is no new endpoint.

## Drag and drop in the SPA

The library choice is in [ADR-0006](decisions/ADR-0006-drag-and-drop-library.md): `@dnd-kit/core@6.3.1` + `@dnd-kit/sortable@10.0.0`, pinned exactly.

- **One component:** `src/features/finisher/components/sortable-task-list.tsx` wraps one section. It renders `TaskRow`s with a handle (`setActivatorNodeRef`), and is used by the Today view (Overdue, Due today) and the Tasks view (four groups). Project pages, Parked and Done lists render the plain list.
- **One context per section:** a `DndContext` for each section makes cross-section drops impossible (decision 19). Use a custom vertical and parent-bounded modifier, and `DragOverlay` for the ghost. Auto-scroll is the library default.
- **Sensors:**
  - `PointerSensor` with an activation distance of about 4px;
  - `TouchSensor` with a delay of about 150ms and a tolerance of about 5px, on the handle only, which has `touch-action: none`;
  - `KeyboardSensor` with `sortableKeyboardCoordinates`.
  - Custom `announcements` and `screenReaderInstructions` with the FIN-038 wording.
- **On drop:**
  1. Compute `afterId` and `beforeId` from the section's displayed list after the move.
  2. Optimistically reorder the section in the TanStack Query cache.
  3. Call the position endpoint.
  4. On any error, `invalidateQueries` for Finisher lists (refetch the server's order) and show the error toast.
  Do **not** restore a whole cache snapshot taken before the request: overlapping writes would lose later moves. The design prototype first did this; see the design notes.
- **Move up/down/top/bottom (menu):** compute the neighbours the same way and use the same mutation.
- **Bundle:** dnd-kit loads only with the Finisher views (route-level code splitting already applies to feature pages if configured; otherwise accept the size and record it).

### Side panel (FIN-036)

- **Route state (A12):** add `task: z.uuid().optional().catch(undefined)` to `validateSearch` on the routes that list tasks: `finisher` (Today), `finisher/tasks`, `finisher/closed`, and `finisher/projects/$id`. The panel renders when `task` is set **and** `matchMedia('(min-width: 1024px)')` matches, through a small `useMediaQuery` hook.
  - **First open:** `navigate({ search: (s) => ({ ...s, task: id }) })` pushes a history entry.
  - **Switching tasks:** the same call with `replace: true`.
  - **Close:** go back if the panel added the entry; otherwise navigate without `task`, with `replace: true`.
  - **Below 1024px:** the title link navigates to `/finisher/tasks/$id` as today, and a stale `task` parameter is ignored.
- **Data:** `useQuery(finisherQueries.task(id))`. Data lives in TanStack Query's memory cache only, never in browser storage (CLAUDE.md). A row's list data may be shown as a placeholder while the detail loads.
- **Links:** the title link keeps `href="/finisher/tasks/$id"`. A plain left click on laptop is intercepted to open the panel, while modifier clicks fall through to the browser.
- **Document title:** it stays generic, because task titles are personal (existing rule).

### Dates (FIN-034, FIN-037)

- **Shortcut dates:** Today, Tomorrow (`addDays(today, 1)`) and Next week (the Monday of next week) are local dates in the browser's IANA zone (A1). They are computed with the existing `domain/dates.ts` helpers at click time.
- **Server role:** the server validates the result against its own `today` from `p_tz`, ±5 years. The local date and time decide "passed today" for decision 22. The API is unaware of shortcuts. Date-only values are never converted to UTC.

## Pomodoro (FIN-039, FIN-040)

Decision: [ADR-0007](decisions/ADR-0007-finisher-pomodoros.md). The server stores the start and end, and the state is derived from `now()`:

- **running** = `stopped_at is null and now() < ends_at`;
- **completed** = `stopped_at is null and ends_at <= now()`;
- **abandoned** = `stopped_at is not null`.

### Schema (migration `supabase/migrations/20261021120000_finisher_pomodoros.sql`)

```sql
create table public.finisher_pomodoros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid,
  started_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes smallint not null default 25 check (duration_minutes = 25),
  stopped_at timestamptz,
  foreign key (task_id, user_id) references public.finisher_tasks (id, user_id) on delete set null (task_id),
  check (ends_at = started_at + make_interval(mins => duration_minutes)),
  check (stopped_at is null or stopped_at >= started_at)
);
create index finisher_pomodoros_user_ends on public.finisher_pomodoros (user_id, ends_at);
create index finisher_pomodoros_task on public.finisher_pomodoros (task_id) where task_id is not null;
```

- **Access:** RLS is enabled. Grants are revoked from `public`, `anon` and `authenticated`; `authenticated` gets `select` with the policy `user_id = (select auth.uid())`. There are no write grants.
- **Helper:** `finisher_private.lock_pomodoro(p_uid)`, an advisory transaction lock keyed `'finisher_pomodoro:' || uid`.
- **`finisher_start_pomodoro(p_task_id uuid, p_replace boolean default false) returns uuid`:**
  1. Take the lock.
  2. Select the task `where id = p_task_id and user_id = v_uid`: not found gives `PH404`; a status other than `open` gives `PH409`.
  3. Look for a running session: `PH409 pomodoro_running` unless `p_replace`, which sets `stopped_at = now()` on it.
  4. Insert `(now(), now() + 25 min)`.
- **`finisher_stop_pomodoro(p_id uuid) returns void`:** select `for update` where the id and `user_id` match. Not found gives `PH404`; not running gives `PH409`.
- **`finisher_delete_task`** (create or replace, same signature): before deleting, stop the task's running session.
- **Grants:** `execute` to `authenticated` only for both new functions.

### API

| Route | Body (allowlist) | Function | Responses |
| --- | --- | --- | --- |
| `POST /api/finisher/tasks/:id/pomodoros` | `{ replace?: boolean }` | `finisher_start_pomodoro` | 200 `{ id }`; 404; 409 `not_allowed` (running, or task not Open); 422 (a non-boolean `replace`) |
| `POST /api/finisher/pomodoros/:id/stop` | none | `finisher_stop_pomodoro` | 200; 404; 409 (already completed or stopped: the client refetches and says it counted) |

These use the existing write guards (`requireUser`, the foreign-`Origin` refusal, JSON-only bodies), `private, no-store` and the error mapping.

### Reads

- **`GET /basics`** (`getFinisherBasics`) adds:
  ```
  pomodoro: {
    active: { id, taskId: string | null, taskTitle: string | null, startedAt, endsAt } | null,
    today: { completed, minutes },
    serverNow,
  }
  ```
  - **active:** `stopped_at is null and ends_at > now`, latest first, limit 1. The title comes from a second select on `finisher_tasks` by id, under RLS.
  - **today:** count `stopped_at is null and ends_at >= zonedToUtc(now.date, tz) and ends_at <= now`; `minutes = completed × 25`.
  - **serverNow:** the Worker's ISO instant at the time of the read.
- **`GET /tasks/:id`** (`getTask`) adds `pomodoros: { today, total }` for that task: completed sessions only, with `today` bounded as above.
- **No new GET routes:** the header, Today view, panel and task page already load these two.

### SPA

- **The clock hook** (`use-pomodoro-clock.ts`) takes the `basics.pomodoro` active session and the offset `serverNow − Date.now()` at fetch time. It ticks every second and derives the time left from timestamps.
- **`PomodoroWatcher`** is mounted once by `AppLayout` (every signed-in page, since 2026-10-21). While a session runs it shows the blocking focus popup; at the end it fires the chime, a refresh and the completion popup once per session id. It doesn't write; the popup's Stop and Mark task done use the existing routes. Side effect: Home and Events also load `GET /api/finisher/basics` (one small cached query). The UI no longer uses `replace`; the API keeps it.
- **Chime:** Web Audio oscillators (`components/chime.ts`), unlocked on the Start click. There is no audio file, and the CSP is unchanged because Web Audio needs no `media-src`.

### Tests

- **Database:**
  - anonymous refused; direct writes refused;
  - a second user's start or stop on the owner's data gives `PH404`, unchanged;
  - one running session (`PH409`), replace, and two quick starts;
  - Parked or Done tasks give `PH409`;
  - stopping a completed or stopped session gives `PH409`;
  - deleting a task abandons its running session and keeps completed ones (`task_id` null).
- **API:** the allowlist, the guards and the error mapping on the new routes; `basics` and the task's `pomodoros` fields.
- **Unit:** the time left, the clock-offset handling, and once-only completion.

## Delegated tasks (FIN-041)

Added 2026-10-23 for requirements v5.1 (FIN-041, decisions 29–31). Migration: `supabase/migrations/20261023120000_finisher_task_delegate.sql`.

- **Status:** `delegated` is a closed task status next to `done` and `let_go`. It sets `closed_at`, clears `revisit_date`, and is reopened to `open` at the bottom of its section, like `done`.
- **Name storage:** the delegate's name goes in the existing `close_note` column (1–100 characters for this status), as the Let go reason does. Projects already use `close_note` for two meanings, and the status decides the label. A separate column would add an API field and a constraint without a current need.
- **Constraints:** the unnamed status, closed-time and note checks from the first migration are dropped by definition and re-added with names (`finisher_tasks_status_check`, `finisher_tasks_closed_check`, `finisher_tasks_note_check`). They now require `closed_at` and `close_note` for `delegated`, so direct writes cannot create a half-closed row.
- **Write path:** `finisher_task_action` gains `delegate` (from `open` or `parked`; `p_reason` carries the name, field `delegated_to`). The signature is unchanged, so grants stay. There are no policy changes: users still have SELECT only (ADR-0002).
- **API:** `POST /api/finisher/tasks/:id/actions` takes `{ action: "delegate", delegatedTo }`; validation errors use the field `delegatedTo`. `GET /api/finisher/closed` takes `outcome=delegated` (tasks only) and returns `counts.tasksDelegated`. `GET /api/finisher/today` includes tasks delegated today in `doneTasks`; project detail includes them in `closedTasks`.
- **Rollback:** reopen or delete delegated tasks first, then restore the previous function and constraints. The old checks reject `delegated` rows.

## Threats and controls

| Threat | Control |
| --- | --- |
| Direct RPC with another user's task or neighbour ids | Every lookup filters `user_id = auth.uid()`. Foreign ids raise `PH404`, the same as non-existent ones, with no data change. Tests cover this. |
| Forged order keys | The client never sends keys. Only the database computes `sort_key`, and there is no table `UPDATE` grant. |
| Moving a closed or parked task, or a stale view | `PH409`. The client refetches. |
| Wiping fields through the quick reschedule | A dedicated route accepts only `dueDate` and `dueTime` (allowlist). |
| Spoofed owner | Ownership comes from `auth.uid()` in the function, never from the body. |
| Session expiry or revocation | Unchanged: `getClaims` on each request. Expired tokens give 401, and the SPA refreshes its session. |
| CSRF | Bearer tokens (no cookies), a foreign `Origin` refused, JSON-only bodies, and no state change on GET. |
| Shared caching of personal order | `private, no-store` on the API. Lists live only in the in-memory query cache. |
| XSS through task titles in drag announcements | Announcements are plain strings rendered by React or dnd-kit's live region as text. No `dangerouslySetInnerHTML`. CSP unchanged. |
| Write abuse (rapid drags) | One small write per drop. The same bounds as other Finisher writes; no new public endpoint. The free Workers plan's request limits are ample for one user. |
| Pomodoro: forged times or another user's session | Times come only from the database's `now()`. Start and stop filter by `auth.uid()`; foreign ids give `PH404`. There is no table write grant. |
| Pomodoro: two sessions running | A per-user advisory lock plus the running check in `finisher_start_pomodoro`. |
| New dependency risk | The packages are pinned exactly and reviewed in ADR-0006. They have no network access or HTML injection surface. |

## Concurrency and failure

- **Per-user serialisation:** the advisory lock serialises one user's order writes, so bottom keys cannot collide. The unique constraint backs this up.
- **Two devices moving tasks:** the last write wins. A move against a stale view either applies relative to the current neighbours, or returns 409 when they are out of order; then the client refetches.
- **Failed writes:** each mutation refetches on error. Optimistic changes from other pending writes are not rolled back by unrelated failures.
- **Retries:** both PUT routes are safe to retry.

## Implementation steps

1. Write the migration `20261020120000_finisher_task_order.sql`: column, seed, constraint, index, helpers, changed and new functions, grants. There are no other schema changes.
2. Server:
   - `domain/validation.ts`: `parseMoveInput`, `parseDueInput`, and `keepPosition` in `parseTaskAction`;
   - `server/mutations.ts`: `moveTask`, `setTaskDue`;
   - `server/errors.ts`: the `position` field;
   - `server/queries.ts`: ordering by `sort_key, id`.
3. Worker: the two routes in `src/worker/finisher.ts`.
4. SPA:
   - the Tomorrow button;
   - quick menu items and Move items in `TaskActionsMenu`;
   - `keepPosition` on the Undo toast in `TaskCheck`;
   - `sortable-task-list.tsx` (dnd-kit);
   - the side panel and the `task` search parameter;
   - API client functions in `api.ts`.
5. Tests: see below.
6. Generate database types if the Supabase CLI is available. If not, update the hand-written row types, as ADR-0002 notes.

### Deployment and rollback

- **Order:** apply the migration **before** deploying the Worker. Old code still works against the new schema:
  - Inserts get keys from the function, not from the app.
  - PostgREST resolves the 5-argument `finisher_task_action` call to the new function through the default for `p_keep_position`. Verify this with a test call in the deployment check.
  - The new code needs the new functions.
- **Rollback of the app:** redeploy the previous Worker. Its queries ignore `sort_key`.
- **Rollback of the schema (manual SQL; Supabase migrations are forward-only):**
  1. Drop `finisher_move_task` and `finisher_set_task_due`.
  2. Recreate the 5-argument `finisher_task_action` and the previous `finisher_create_task` and `finisher_update_task` bodies from `20261011120000_finisher.sql`.
  3. Drop the constraint, the index and the column.
  This loses the users' custom order and nothing else.
- **Review:** the migration changes live functions. Review it under the user's authorization before applying it to a hosted project (CLAUDE.md). No deploy or live database change is part of this plan.

## Test obligations

**Database (`supabase/tests/finisher-rls.test.ts`, a real Supabase)**

- **Anonymous:** `finisher_move_task` and `finisher_set_task_due` are rejected (no execute grant, or 28000).
- **Second user:**
  - moving the owner's task, or using the owner's task as a neighbour of their own task, gives `PH404` with no change;
  - `finisher_set_task_due` on the owner's task gives `PH404`.
- **Owner:**
  - a move between two neighbours gives a strict midpoint, and the list order reflects it;
  - top and bottom moves;
  - neighbours out of order give `PH409`;
  - a non-open task or neighbour gives `PH409`;
  - the same id as a neighbour, or both neighbours null, gives `PH422`;
  - 60 repeated inserts into the same gap trigger a rebalance, with the relative order preserved;
  - the seed order matches the pre-v4 sort for a fixture;
  - create, unpark and reopen go to the bottom; reopen with `keepPosition` keeps the key;
  - a due-date change through update or set-due goes to the bottom; a time-only change keeps the key;
  - set-due on a Parked or Done task gives `PH409`;
  - direct `update finisher_tasks set sort_key = …` is denied (no grant).

**API (Worker tests, `tests/`)**

- No token gives 401. A foreign `Origin` is refused. A non-JSON body gives 400 or 415, as existing.
- Extra body fields are rejected; malformed UUIDs give 404 or 400; the error mapping covers 409 and 422.
- `keepPosition` is accepted only with `reopen`.

**Unit**

- The Tomorrow and Next week helpers: Sunday, month end, year end.
- The decision-22 time rule.
- Neighbour computation for drop and for Move up/down/top/bottom, including when filtered.

**Browser (Playwright, if installed)**

- Panel: open, switch, Escape and focus return, Back, reload, and resizing below 1024px.
- Drag with mouse and with keyboard (lift, arrows, drop, Escape), with announcements.
- Quick reschedule, Undo, and the failure refetch.

## Gaps in this document

- The rest of the Finisher design is documented only in ADR-0002, the migration and `docs/implementation/finisher.md`: slot versions, project periods, the marking window and weekly-rate calculations. A full architecture write-up for those parts is still owed. This is not concrete debt with a product impact today, so it is not in the debt register.
- The account time zone (requirements Q1) is unchanged: dates still use the browser's zone (A1).
