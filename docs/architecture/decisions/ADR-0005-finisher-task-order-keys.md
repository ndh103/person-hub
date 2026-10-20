# ADR-0005: Finisher task order uses exact numeric keys, moved by neighbours, in a database function

- Status: accepted (Technical Architect, 2026-10-20). Adopted for implementing FIN-038; this is not a record of user approval.
- Related: [requirements/finisher.md](../../../requirements/finisher.md) v4.1 (FIN-038, FIN-037, FIN-021, A13, A16), [Finisher architecture](../finisher.md#task-order-fin-038), [ADR-0002](ADR-0002-finisher-rpc-writes.md) (writes through `SECURITY DEFINER` functions), design [task-list.html notes](../../../output/designs/finisher/design-notes.md#tasks-list-fin-036-fin-037-fin-038)

## Context

FIN-038 gives each user **one order for all open tasks**. Every section (Overdue, Today, Upcoming, No date, on both tabs and on project pages) shows its tasks in that order. The requirement adds these rules:

- When the Tasks tab is filtered, a reorder changes places only among the **shown** tasks; hidden tasks keep their positions.
- A task goes to the **bottom** when it is created, reopened or unparked, or when the user changes its due date. The immediate Undo after Mark done is the exception: it restores the old place.
- Time passing changes nothing in storage (no automation).
- Existing tasks start in the order each section showed before (A16).
- The order is saved on the server, and the last write wins across devices.

The server enforces ownership and Open status, but not sections. Writes go through database functions only (ADR-0002), so the design has to work under direct Supabase RPC calls as well.

## Alternatives

1. **Dense integer positions, renumbering on each move.** Positions are easy to read. But one move rewrites every task between the old and new position across all sections. Under a filter, the client would also have to send the full order, including hidden tasks, which it does not have. Rejected.
2. **The client sends the whole visible order of a section.** The server would have to merge it with the hidden tasks, and requests grow with the list (up to 50 rows per loaded page). Two devices can also interleave whole-list writes. Rejected.
3. **`double precision` midpoints.** One row per move. But the gap halves with each insert at the same spot, and after about 50 inserts there it collapses into equal keys. Rejected for the silent precision loss.
4. **Fractional-index strings (base-62 keys, for example the `fractional-indexing` npm package).** No precision limit and one row per move. But to keep the database authoritative, the key algorithm would have to be reimplemented in PL/pgSQL. Otherwise the client computes keys, which a direct caller could forge. That is more code than needed.
5. **`numeric` keys with an exact midpoint `(after + before) * 0.5`, computed in a `SECURITY DEFINER` function from neighbour ids.** (Chosen.)

## Decision

- **Column:** `finisher_tasks.sort_key numeric not null`, with a deferrable unique constraint on `(user_id, sort_key)`. Lower keys come first. Every task has a key, whatever its status, so Undo can restore a Done task's place.
- **Exact midpoints:** in Postgres `numeric`, `(a + b) * 0.5` is exact, because multiplying by `0.5` adds one decimal digit and never rounds. A new key is always strictly between its neighbours. Each further insert in the same gap costs one more digit.
- **Moves are expressed as neighbours.** The client sends the ids of the tasks immediately before and after the drop position, as displayed: `{ afterId, beforeId }`, either of which may be `null`. The database function:
  - reads the neighbours' keys, filtered by `auth.uid()` and `status = 'open'`;
  - places the new key in the gap between the two adjacent existing keys, of any status, inside those bounds. Keys are unique across Parked and closed tasks too, so this avoids a collision. This was corrected during implementation on 2026-10-20 and is covered by a test;
  - writes one row.
  Hidden tasks keep their keys, which meets the filter rule.
- **Bottom placement:** `max(sort_key) + 1` over all of the caller's tasks.
  - It is taken under a per-user transaction advisory lock, so concurrent writes cannot pick the same key.
  - It is applied by the database, not the client: on create; on unpark; on reopen, unless the immediate-Undo flag is set; and in `finisher_update_task` and `finisher_set_task_due` when the due date changes.
- **Stale moves:** if the neighbours are no longer in order (`after ≥ before`, because another device moved them), the function raises `PH409 order_changed`. The client refetches and shows the server's order.
- **Rebalance:** when a new key's scale exceeds 20 decimal digits, the same transaction renumbers the caller's tasks to `1..n`. This keeps their relative order. It is O(tasks per user) and expected to be very rare.
- **Seed (A16):** the migration numbers every user's tasks in the pre-v4 display order:
  - open tasks with a due date: by `due_date`, `due_time` (nulls last), `created_at`, `id`;
  - then open tasks with no date: newest first;
  - then all other tasks, in any stable order. Their keys only matter for the Done → Undo case, and unpark or reopen moves them to the bottom anyway.
- **The key is never returned** to the browser. The API returns lists in order, and the client works with ids and positions.

## Consequences

- **Small writes:** a move writes one row. A filtered reorder needs no knowledge of hidden tasks.
- **Server-only keys:** no client computes a key, so a direct caller can only move their own open tasks between their own neighbours.
- **Global order across sections:** a key can sit between keys of tasks in other sections. That is harmless, because each section is a filtered view of the one order. It is also what makes the Today tab and the Tasks tab agree.
- **Key growth is bounded:** keys grow slowly, and rebalancing caps their length. Bottom keys grow by 1 per placement; that is unbounded in principle, but `numeric` handles it.
- **Locking:** the advisory lock serialises one user's order writes. There is no contention across users.
- **Write functions:** `finisher_create_task`, `finisher_update_task` and `finisher_task_action` change. `finisher_task_action` changes signature (a new `p_keep_position` argument), so the migration drops and recreates it and re-grants execute. A new function, `finisher_move_task`, is added. Each needs the second-user denial test required by ADR-0002.
- **Pagination:** "Load more" pages by `(sort_key, id)`. A reorder on another device between page loads can shift items across a page boundary; offset paging already accepts this.

## Revisit when

- Users routinely have thousands of open tasks, so rebalancing or `max()` becomes measurable (p95 move > 200 ms).
- Requirements add cross-section drag (decision 19 says no) or per-section orders.
- Bulk import or task reordering from another feature is added.
