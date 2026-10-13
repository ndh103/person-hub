# Events: implementation notes

- Feature slug: `events`
- Status: `ready` for Tester. Not run against a real Supabase project, and not run in a browser (see "Not verified").
- Date: 2026-10-13
- Inputs:
  - [requirements/events.md](../../requirements/events.md) v2.1 (EVT-001 to EVT-009)
  - [Events design](../../output/designs/events/design-notes.md)
  - [Events architecture](../architecture/events.md)
  - [ADR-0004](../architecture/decisions/ADR-0004-events-table-writes-under-rls.md)

## Change 2026-10-13: header matches Finisher

At the user's request, the "Your life log" eyebrow above the title was removed. A mono "Today · 13 Oct 2026" line (the browser's local date) now sits under the "Events" title, the same as the Finisher header. Only `events-view.tsx` changed.

## What was built

| Requirement | Where |
| --- | --- |
| EVT-001 navigation | The existing nav entry; route `/events` in `src/app/router.tsx` with `validateSearch` for `q` and `year` |
| EVT-002 list, order, paging, states | `components/events-view.tsx`, `server/queries.ts`, SQL `events_page` (keyset, 50 per page) |
| EVT-003 create | `components/event-form-dialog.tsx`, `POST /api/journal` |
| EVT-004 view | `components/event-row.tsx` (expandable row; the link opens in a new tab only if it is http(s)) |
| EVT-005 edit | Same dialog, `PATCH /api/journal/:id` (404 if the event is gone) |
| EVT-006 delete | `components/delete-event-dialog.tsx`, `DELETE /api/journal/:id` (idempotent) |
| EVT-007 ownership, privacy | Migration grants, RLS and constraints; `requireUser`; search sent in a POST body |
| EVT-008 layout, accessibility | Labelled fields, errors linked to fields, focus management after save, delete and Load more, 44px targets |
| EVT-009 search and year | `POST /api/journal/query`, SQL `events_search`/`events_counts`/`events_years`, URL `?q=&year=` |

### Files

- **New:**
  - `supabase/migrations/20261013120000_events.sql`
  - `src/worker/events.ts`
  - `src/features/events/` (`api.ts`, `types.ts`, `messages.ts`, `domain/validation.ts`, `server/{errors,queries,mutations}.ts`, and `components/{events-view,event-row,event-form-dialog,delete-event-dialog}.tsx`)
  - `src/lib/dates.ts`
  - `src/components/forms/{form-field,date-picker}.tsx`
- **Changed:**
  - `src/worker/app.ts` mounts `/events` and handles `EventsError`.
  - `src/app/router.tsx` and `src/app/pages/events.tsx` replace the placeholder page.
- **Shared code moved (per the architecture):**
  - `formatDate`, `isLocalDate` and `LocalDate` now live in `src/lib/dates.ts`. Finisher's `domain/dates.ts` re-exports them.
  - `DatePicker` moved to `src/components/forms/` and gained a `yearDropdown` option (month and year selects with fixed month names) for the 1900–2100 range.
  - `FormField` moved to `src/components/forms/` and takes an error message. Finisher keeps a thin wrapper that turns its error codes into messages, so no Finisher call site changed.
- **Tests:**
  - `supabase/tests/events-rls.test.ts` (24)
  - `tests/unit/events-domain.test.ts` (17)
  - `tests/unit/api-events.test.ts` (11)

## Deviations and decisions made here

- **Delete dialog.** It uses Cancel as the first control, which Base UI focuses on open, instead of an explicit `initialFocus`.
- **Time input.** It is a text field with `inputMode="numeric"`, as in the design. "7:45" is padded on blur and again before submit; the API accepts only `HH:mm`.
- **Search box.** It writes to the URL after a 250 ms pause with `replace`, so typing doesn't fill the browser history. The year select and Clear apply immediately and do add a history entry.
- **Focus after save.** When the saved event is in the loaded pages, its row opens and gets focus. Otherwise a toast says so: if a search or filter hides the event, the toast also offers "Clear filters".
- **"Updated" date.** It shows when `updatedAt` differs from `createdAt`.
- **Not built:** the design's 700 ms highlight and the HTML prototype controls.

## Migration and configuration

- **No new environment variables.**
- **Apply the migration** through the deploy pipeline (`supabase db push`, see [platform.md](platform.md#database-migrations)), which runs it before the Worker deploy. **It has not been applied to any live project.**
- **Re-check on the hosted Postgres:** `normalize()` and `IS NFC NORMALIZED` in CHECK constraints, and the immutable `fold` in a generated column (architecture, "Deployment and rollback").
- **Database types:** not generated, because the Supabase CLI isn't installed. Row types are written by hand (`EventRow`).

## Checks (2026-10-13)

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passes |
| `npm run lint` | 0 errors and 6 `react-refresh/only-export-components` warnings: 5 already existed, and 1 is new in `src/components/forms/form-field.tsx` (it exports `focusFirstInvalid`, as the Finisher file already did) |
| `npm test` | 185 passed in 9 files, including the 52 new Events tests |
| `npm run build` | Passes, with the existing "chunk larger than 500 kB" warning |

The database tests run the real migration in PGlite (Postgres 18) as `authenticated` or `anon` with JWT claims. They cover:

- isolation between owners for select, update, delete, search, counts and years;
- column-grant denials for `user_id`, `id`, `created_at` and `updated_at`;
- `anon` being denied;
- every constraint, and its accepted edges;
- the search groups ("phở", "PHO", "gia dinh", "da lat", NFD input, `%`/`_`, the link not being searched);
- the year filter;
- keyset paging across the exact → accent boundary.

## Not verified

- **No browser run.** Signing in needs the live Supabase project, and the `events` table doesn't exist there until the migration is applied. React Testing Library and Playwright aren't installed, so the UI states, keyboard order, focus moves, dark mode and the 320px layout are unchecked in the real app.
- **Not run against hosted Postgres or PostgREST.** That covers column grants through PostgREST, `insert … select` returning, and RPC argument types.

## For the Tester

1. Apply the migration to a test Supabase project. Run `npm run dev` with `.dev.vars` pointing at it, and sign in.
2. Create the requirement's example (Bought a TV, 13 Oct 2026, `shop.example.com/tv001`, notes). The link should be saved with `https://` and opened in a new tab.
3. Add a future event with a time (it shows "Upcoming") and two events on the same date, one with a time: the timed one comes first.
4. Search "phở", "pho" and "gia dinh" (check the two groups and their labels), then "tv001" (a match in the notes only). Combine with a year, reload the page (the search is restored), and try a no-match search.
5. While searching "pho", add an event that doesn't match. The toast should offer Clear filters.
6. Edit an event and clear its time and link. Delete it with Cancel, then confirm it; check where focus goes. Edit an event that was deleted in another tab: you should see "This event no longer exists".
7. Load more with more than 50 events, including across the search group boundary.
8. In the browser's network panel, confirm that search text appears only in the POST body of `/api/journal/query`, never in an `/api` URL, and that responses are `private, no-store`.
9. Check that notes containing HTML are shown as text, and check 320px width, keyboard-only use and a screen reader.
10. Use a second account to confirm that it can't see the first account's events: through the API, and through direct PostgREST calls with its own token.
