# ADR-0008: The Week tab plans with the due date, moves tasks in bounded batches, and stores one note per week

- Status: accepted (Technical Architect, 2026-10-24). Adopted for implementing FIN-042 to FIN-048 and the removal of the Today tab (decision 40). This is not a record of user approval.
- Related:
  - [requirements/finisher.md](../../../requirements/finisher.md) v6.2: FIN-042 to FIN-048, decisions 33–40, A21–A33.
  - [Finisher architecture](../finisher.md#week-tab-fin-042-to-fin-048).
  - [ADR-0002](ADR-0002-finisher-rpc-writes.md), [ADR-0005](ADR-0005-finisher-task-order-keys.md), [ADR-0006](ADR-0006-drag-and-drop-library.md), [ADR-0007](ADR-0007-finisher-pomodoros.md).
  - Design: [week-planner.html](../../../output/designs/finisher/week-planner.html).

## Context

The Week tab shows a Monday-to-Sunday board of tasks and project sessions, lets the user put a task on a day or give it a time, carries over unfinished tasks, and reviews the week. Its review includes Pomodoros per day and a weekly note. The user decided that a task's day **is** its due date (decision 34) and its time **is** its due time (FIN-048), so the task model does not change.

The constraints are these:
- Workers on the free plan allow few subrequests per request.
- Writes go through `SECURITY DEFINER` functions (ADR-0002).
- Personal data must not reach browser storage.
- Nothing may change without a user action.

## Alternatives

1. **Moving a task:**
   - (a) **Chosen:** reuse `finisher_set_task_due` for single moves, Set time, and Undo. It already applies the field rules, puts a task with a changed date at the bottom of the order (FIN-038), and keeps the position for a time-only change.
   - (b) Rejected: a new "planned day" column, because decision 34 rules it out.
2. **"Move all" (FIN-046, FIN-047):**
   - (a) Rejected: one request per task from the browser. It is slow, and it can't report a partial failure in one message.
   - (b) Rejected: looping in the Worker. Up to 200 Supabase subrequests would exceed the Workers limits.
   - (c) **Chosen:** one database function, `finisher_set_tasks_due(p_tz, p_changes jsonb)`. It applies at most 200 changes, each in its own subtransaction, by calling `finisher_set_task_due`. It returns `{moved, failed}`, so the UI can report a partial failure. Undo is the same call with each task's previous values.
3. **Weekly note:**
   - (a) **Chosen:** a table `finisher_weekly_notes` keyed by `(user_id, week_start)`, with SELECT-only RLS for the owner and writes through `finisher_save_weekly_note`. Saving an empty text deletes the row.
   - (b) Rejected: storing the note on some other row, because there is no week entity.
4. **Week reads:** one `GET /api/finisher/week?start=` for the board and one `GET /api/finisher/week/review?start=` for the review. The review needs tasks closed in the week, the Pomodoro counts, and the note, which the board does not. Splitting them keeps the Plan view (the Finisher home) cheap.
5. **Ordering within a day (decision 39):** this is a pure function in `domain/week.ts`, applied in the browser to the server's lists (open tasks already in `sort_key` order). No new storage is needed.
6. **Drag between days:** `@dnd-kit/core` `useDraggable` and `useDroppable` (ADR-0006, the library already installed). A custom keyboard coordinate getter jumps the dragged card between day columns, so keyboard users get the same moves.

## Decision

Options 1(a), 2(c), 3(a), 4, 5 and 6, as described in [the architecture section](../finisher.md#week-tab-fin-042-to-fin-048). The Today view, `GET /api/finisher/today` and the Today tab count are removed in the same change (decision 40). `/finisher` renders the Week tab, so old Today links keep working.

## Consequences

- **No new task columns, and no change to RLS on tasks.** The bulk function inherits every rule of the single-task function, because it calls that function.
- **Lists are bounded:** a week read returns at most 500 dated tasks, 200 Unplanned and 200 carried-over tasks, with exact totals. The UI pages through what it received, and says when there are more than it loaded (TD-FIN-1 in [technical-debt.md](../technical-debt.md)).
- **One new table** with owner-only reads, and writes only through a function. The migration is additive; rolling back the code leaves an unused table and two functions behind.

## Revisit when

A user has more than 200 open undated or carried-over tasks, a planned-day concept separate from the due date is requested, or the Today tab returns.
