# Events: requirements

## Metadata

- Feature slug: `events`
- Status: `ready`
- Version: 2.1 (2026-10-13). Adds future dates, an optional time of day, and search and year filtering (EVT-009) to version 1; v2.1 adds accent-insensitive search with exact matches first. See Change notes.
- Source: the user's request on 2026-10-13: "I want to implement the Events module. This will be a place to log life events. Example: Event: Bought a TV; Date: 13 Oct 2026; Link (optional): <web link of the product online>; Notes: Model plasma 2026 tv001. The event should be ordered by the date, new events on top and old events down in the list. Allow user to create/edit/delete an event." Answers the same day: allow future dates; add search or filtering by text or year; add an optional time of day; record prices in Notes.
- Related: [project brief](../docs/project-brief.md), [app shell design](../output/designs/app-shell/design-notes.md), [Finisher requirements](finisher.md) (shared date display rule), security baseline in [CLAUDE.md](../CLAUDE.md#security-baseline). Events design: [output/designs/events/](../output/designs/events/design-notes.md). Architecture: [docs/architecture/events.md](../docs/architecture/events.md) and [ADR-0004](../docs/architecture/decisions/ADR-0004-events-table-writes-under-rls.md). Test report: not yet created.

## Goal and target user

The signed-in hub owner wants one place to write down things that happened in their life, or are planned, so they can later answer "when did I buy that TV, and which model was it?". An event is a short record: what happened, on which date (and optionally at what time), an optional web link, and optional notes.

Target user: the authenticated account owner, on phone and laptop browsers. All Events data is private to its owner.

## Scope

### In scope

- A list of the user's events, latest date first, including future (planned) events.
- Create, view, edit, and delete an event.
- Fields: title, date, optional time of day, optional link, optional notes.
- Search by text and filter by year (EVT-009).
- Events as the second app in the shell navigation (after Finisher), at `/events`.

### Out of scope

- Tags or categories.
- Time ranges, end dates, durations, or multi-day events. An event has one date and at most one time.
- A dedicated price or cost field. Prices are written in Notes (decision 6).
- Multiple links per event, link previews, or fetching anything from the linked page.
- Photos, receipts, or other attachments and uploads.
- Reminders, anniversaries, countdowns, notifications, and calendar sync, including for future events.
- Sharing, collaboration, export, import, and Home-page summaries.
- Creating events automatically from Finisher (Finish → Event was retired in Finisher v2).
- Undo after delete, trash, or archive.

## Fields and validation

All text is trimmed before validation and storage. Limits are enforced on the server. The server sets ownership and timestamps. Only the fields below can be written.

| Field | Label in the form | Required | Rules |
| --- | --- | --- | --- |
| Title | Event | Yes | 1–120 characters after trimming |
| Date | Date | Yes | A date-only value. From 1 Jan 1900 to 31 Dec 2100 (A2). Past, today, and future dates are allowed. Defaults to today in the Create form |
| Time | Time | No | A local wall-clock time, HH:mm in 24-hour form (00:00–23:59). Blank means no time. It belongs to the event's date and carries no timezone (A10) |
| Link | Link | No | ≤ 2048 characters. Must be an absolute `http://` or `https://` URL with a host. If the user omits the scheme (for example `shop.example.com/tv001`), `https://` is added before validation (A4). Blank means no link |
| Notes | Notes | No | ≤ 2000 characters. Plain text; line breaks are kept. Use it for details such as model numbers and prices |

Server-set data: owner, created time, and last-updated time (UTC instants).

## Requirements

### EVT-001 Navigation (Must)

Events is the second app in the shell's Apps group, after Finisher, at the route `/events`.

- Given a signed-in user, when they select Events in the sidebar or phone drawer, then the event list opens (EVT-002). The nav item is marked current, the page title is "Events · Personal Hub", and focus moves to the page heading (SHELL-003).
- Given a signed-out visitor opens `/events`, then they are sent to sign-in and, after signing in, return to `/events`.

### EVT-002 Event list (Must)

The Events page lists the user's events.

- **Order:** latest moment at the top, earliest at the bottom (business rules, Ordering). Future events therefore appear above today's and past events. Editing an event's date or time moves it to its new position.
- Each entry shows the title, the date in the format "13 Oct 2026", the time ("14:30") when set, and, when present, a link indicator and the first line of the notes (truncated). The full notes and the link are shown on the event's detail view (EVT-004).
- **Upcoming events (Should):** events dated after today are visibly labelled "Upcoming" (in text, not by color alone), so planned events are not mistaken for things that already happened. The label disappears on its own once the date arrives; nothing about the event changes.
- The list may show year headings (for example "2026") to group events; this is a presentation choice for the Designer, not a requirement.
- **Paging:** the first 50 events load, followed by a "Load more" control that loads the next 50 in the same order. No event is duplicated or skipped between pages, including when events share a date and time.
- **Loading:** a skeleton list is shown while loading.
- **Empty:** when the user has no events, the page shows a message such as "No events yet. Record something that happened, like buying a new TV.", with an "Add event" action. (No matches for a search or filter is a different state; see EVT-009.)
- **Error:** if loading fails, an error message with Retry is shown. Partial or another account's data is never shown.
- An "Add event" action is always visible on the page (EVT-003).

### EVT-003 Create an event (Must)

- Given the user chooses "Add event", then a form opens with Event (empty, focused), Date (today's local date), Time (empty), Link (empty), and Notes (empty).
- Given valid input, when the user submits, then the event is saved and appears in the list in its position (EVT-002) without a full page reload. A polite confirmation such as "Event added" is announced.
- Given the example input — Event "Bought a TV", Date 13 Oct 2026, no time, Link `https://shop.example.com/tv001`, Notes "Model plasma 2026 tv001" — when submitted, then the list shows "Bought a TV · 13 Oct 2026" with a link indicator, above any event dated before 13 Oct 2026.
- Given the user enters a future date, for example "Flight to Hanoi", 20 Dec 2026, 07:45, when submitted, then the event is saved and appears near the top of the list labelled "Upcoming".
- If a search or filter is active and the new event does not match it, the event is still saved and the confirmation says so (for example "Event added. It is hidden by the current filter."), with an action to clear the filter.
- **Validation:** a missing title, a missing date, a date outside 1900–2100, a malformed time, an invalid link, or any value over its limit shows an error next to the field. The form keeps the entered values, focus moves to the first invalid field, and nothing is saved. The server applies the same rules and rejects invalid input even if the browser checks are bypassed.
- **Failure:** a server or network failure shows a general error and keeps the values for a retry. The submit control is disabled while the request is pending, so a double tap does not create two events.
- **Cancel:** closing the form discards the input. If the user has typed anything, they are asked to confirm discarding it (A5).

### EVT-004 View an event (Must)

- Given an event in the list, when the user selects it, then they see its title, date ("13 Oct 2026"), the time if set, an "Upcoming" label if the date is after today, the link (if any), the full notes with line breaks kept, and Edit and Delete actions. The created and last-updated dates may be shown as secondary information.
- The link is shown as its address (or a shortened form of it) and opens in a new tab with `rel="noopener noreferrer"`. Its accessible name says that it opens in a new tab. Only `http` and `https` links are ever rendered as clickable.
- Notes are displayed as plain text. Any HTML or markup in notes is shown literally and never interpreted.
- Viewing an event that does not exist or is not the user's own shows "Event not found" with a way back to the list. It does not reveal whether the event exists for someone else.
- Whether the view is a separate page, a dialog, or an expanded list item is a design choice. If it is a separate page, it has its own URL so a reload reopens it.

### EVT-005 Edit an event (Must)

- Given the user chooses Edit on an event, then the same form as EVT-003 opens with the current values.
- The user can change any field, and can clear the time, the link, or the notes. Title and date cannot be cleared.
- Given valid changes, when the user saves, then the event is updated, the list reflects the change (including a new position if the date or time changed), and "Event updated" is announced.
- Validation, failure, pending-state, filter-mismatch, and cancel behavior are the same as EVT-003.
- If the event was deleted elsewhere (for example in another tab) before saving, the save fails with "This event no longer exists" and the list refreshes.

### EVT-006 Delete an event (Must)

- Given the user chooses Delete on an event, then a confirmation dialog names the event ("Delete 'Bought a TV'?") and says the deletion cannot be undone.
- When the user confirms, then the event is permanently deleted, it disappears from the list, and "Event deleted" is announced. Focus moves to a sensible place (the list heading or the next event).
- When the user cancels, nothing changes and focus returns to the Delete control.
- If the deletion fails, an error is shown and the event stays in the list. Deleting an event that is already gone is treated as success (the list refreshes and it is not shown).

### EVT-007 Ownership, permissions, and privacy (Must)

- Only authenticated, non-anonymous users can use Events. API requests without a valid session are rejected as unauthenticated.
- A user can list, search, view, create, edit, and delete only their own events. Ownership is derived from the verified session, never from a client-supplied user ID, and cannot be changed by an edit.
- Another user's events behave as if they do not exist, both through the API and through direct database requests made with the caller's session. Search results, year options, and counts include only the caller's events and do not reveal anything about other accounts.
- Event content (titles, links, notes) and search text are personal. They must not appear in logs, analytics, error reports, or shared caches. All rules in the [CLAUDE.md security baseline](../CLAUDE.md#security-baseline) apply.
- The app never requests, prefetches, or previews the linked page; the link is only opened when the user follows it.

### EVT-008 Responsive layout and accessibility (Must)

- Phone (< 1024px): single column, no horizontal page overflow at 320px. Long titles, links, and notes wrap or truncate without overflowing. "Add event" and the search field are reachable without scrolling to the bottom of a long list. Touch targets are at least 44px.
- Laptop (≥ 1024px): the list may sit beside the selected event's details; this is a design choice.
- All actions work with the keyboard and show visible focus. Dialogs trap focus and return it to the element that opened them. Form fields have visible labels; errors are linked to their fields and announced. Confirmations are announced politely.
- The date field opens a calendar whose weeks start on Monday and displays its value as "13 Oct 2026", consistent with the Finisher date display rule. Future dates are selectable. The time field accepts typed 24-hour input and offers a way to clear it.

### EVT-009 Search and filter by year (Must)

Above the list, the user can narrow the events shown.

- **Text search:** a search field matches events whose title or notes contain the entered text, ignoring case and leading or trailing spaces (A11). For example, "tv001" finds "Bought a TV" because its notes contain "Model plasma 2026 tv001". The link is not searched (decision 7). The search text is at most 100 characters.
- **Exact matches first, then matches without accents (decision 8):** results come in two groups.
  1. **Exact matches:** the title or notes contain the search text with the same accent marks (case is still ignored).
  2. **Matches ignoring accents:** events that are not exact matches but match once Vietnamese accent marks are ignored on both sides, with "đ"/"Đ" treated as "d" (A13).
  - Each event appears once, in the first group it qualifies for. Each group keeps the EVT-002 order. "Load more" continues through the exact group first, then the second group.
  - Given events "Ăn phở với gia đình" and "Pho cooking class", when the user searches "phở", then "Ăn phở với gia đình" is an exact match and "Pho cooking class" is in the second group. When the user searches "pho", then "Pho cooking class" is the exact match and "Ăn phở với gia đình" is in the second group. Searching "gia dinh" finds "Ăn phở với gia đình" in the second group.
  - The second group is introduced by a visible text label, for example "Also matching without accents", so the user can tell the groups apart. If there are no exact matches, only the second group is shown, still labelled. Without search text there are no groups.
- **Year filter:** a year control offers "All years" (the default) and each year in which the user has at least one event, latest first. Choosing a year shows only events dated in that calendar year.
- Search and year combine: both must match, in both groups. Results keep the EVT-002 order within each group, and paging is stable: no event is duplicated or skipped across "Load more", including at the boundary between the groups.
- The list updates as the user types, after a short pause, without a page reload, and the search is run on the server, so events not yet loaded are found too. Pressing Enter does not reload the page.
- The current search text and year are kept in the page URL, so reload and back/forward restore them.
- **No matches:** when a search or filter returns nothing, the page says so (for example "No events match 'tv002' in 2025") with a "Clear search and filters" action. This is distinct from the EVT-002 empty state.
- A result count or a polite announcement (for example "3 events found", or "1 exact match, 2 more without accents") tells screen-reader users the list changed. The search field has a visible label and a clear button.
- Loading and error states follow EVT-002; a failed search shows an error with Retry and keeps the search text.

## Business rules

- **Event date is a date-only value**, not a timestamp. "13 Oct 2026" is stored and shown as that calendar date regardless of the viewer's timezone, and it never shifts by a day when the timezone changes.
- **Event time** is an optional local wall-clock time attached to the date, stored without a timezone and shown as entered ("07:45"), never converted (A10).
- **Today** (the Create default and the boundary for the "Upcoming" label) is the user's local date in the browser's IANA timezone (same as Finisher A1). The server does not compare event dates with today; it only enforces the 1900–2100 range.
- **Date display:** "13 Oct 2026" (day, short month, year), independent of browser language, as in the Finisher business rules. Time display: 24-hour "HH:mm" (A12).
- **Ordering:** event date descending; within the same date, events with a time first, latest time on top, then events without a time; ties are ordered by creation time, most recently created first (A1, A9). The order is stable for paging.
- **Created and updated times** are UTC instants set by the server.
- **No automation:** events are only created, changed, or deleted by a user action. A future event becoming past changes only its label.

## Confirmed decisions

From the user, 2026-10-13:

1. An event has an event name (title), a date, an optional web link, and notes.
2. The list is ordered by date, newest at the top and oldest at the bottom.
3. The user can create, edit, and delete events.
4. Future dates are allowed (for planned events such as a booked trip).
5. Search or filtering by text and by year is included.
6. An event can have an optional time of day. A price is written in Notes; there is no price field.
7. Search does not match the link.
8. Search returns exact matches first, then matches found by ignoring Vietnamese accent marks.

## Assumptions (reversible proposed defaults)

- A1. Events with the same date and time (or both without a time) are ordered most recently created first.
- A2. Dates are limited to 1 Jan 1900 – 31 Dec 2100. *(v1's "no future dates" rule is superseded by decision 4.)*
- A3. *Superseded in v2:* the server-side "today + 1 day" tolerance is no longer needed because future dates are allowed.
- A4. A link entered without a scheme gets `https://` added. Only `http` and `https` are accepted.
- A5. Cancelling a form with unsaved input asks for confirmation.
- A6. Notes are optional (the example has notes, but not every event needs them).
- A7. Text limits (120 / 2048 / 2000 / 100 for search) and the page size of 50 are proposed defaults.
- A8. Deletion is permanent with confirmation, matching Finisher; there is no undo or trash.
- A9. Within one date, timed events come before untimed events, latest time first.
- A10. The time has no timezone: "07:45" stays "07:45" for any viewer and after travel.
- A11. Search is a case-insensitive "contains" match on title and notes, not word-based or fuzzy. Accent handling follows decision 8.
- A12. Times are shown in 24-hour form, independent of browser language.
- A13. "Ignoring accents" means removing Vietnamese tone and vowel marks (for example ă, â, ê, ô, ơ, ư and the five tone marks) and treating "đ" as "d", on both the search text and the event text. Other languages' accents are also ignored if the same method removes them, but only Vietnamese is required. Text is compared after Unicode normalization, so the same letter typed in composed or decomposed form matches as exact.

## Open questions

None. Q1–Q3 were answered on 2026-10-13 (decisions 4–6), and Q4–Q5 the same day (decisions 7–8).

## Change notes

- **2026-10-13, v2.1.** User answers to Q4–Q5. EVT-009 now ranks exact matches first, then a labelled group of matches found by ignoring Vietnamese accents; the link stays unsearched. Added decisions 7–8 and A13; updated A11. **Affects:** the Events design (the second results group label), architecture (accent-insensitive matching and two-group keyset paging), and search tests. No artifacts had been produced yet.
- **2026-10-13, v2.** User answers to Q1–Q3.
  - **Changed:** Fields (Date range now 1900–2100 with future dates allowed; new optional Time field; Notes mentions prices), EVT-002 (ordering by date and time, "Upcoming" label, distinct no-match state), EVT-003 and EVT-005 (time field, future-date example, filter-mismatch message), EVT-004 (time and Upcoming label), EVT-007 (search privacy), EVT-008 (time field, future dates selectable, search field reachable), business rules (time, ordering, no server "today" check).
  - **New:** EVT-009 (search and year filter); decisions 4–6; assumptions A9–A12.
  - **Superseded:** A2 (no future dates) and A3 (server today + 1 day tolerance). Q1–Q3 answered.
  - **Affects:** the Events design (list toolbar, form, no-match state), architecture (time column, ordering index, search query and year list endpoint), and tests (date range, time ordering, search, year filter). No artifacts had been produced from v1 yet.
- **2026-10-13, v1.** Initial Events specification (EVT-001 to EVT-008), replacing the brief's "brainstormed later" placeholder. **Affects:** the Events placeholder page (`src/app/pages/events.tsx`), the project brief's Events question, new database table, RLS, API routes, design, and tests.

## Handoff dependencies

- **Designer:** `output/designs/events/` — the list (with loading, empty, no-match, error, and Load more states), the search field and year control on phone and laptop, the Upcoming label, the event view, the create/edit form (including the optional time field) with validation errors, and the delete dialog. Decide whether the view is a page, dialog, or expanded item, and whether to group by year.
- **Technical Architect:** `docs/architecture/events.md` — the events table (date-only column, nullable time-without-timezone column, owner from `auth.uid()`), RLS with owner select/insert/update/delete policies and no owner reassignment, the API contract under `/api/journal` with Zod validation and keyset pagination on (date desc, time desc nulls last, created desc, id), search and year-filter parameters with safe escaping of `%` and `_` in the search text, accent-insensitive matching per A13 (including "đ" → "d") with exact matches ranked first and stable paging across both groups, a way to list the caller's event years, and server-side link normalization and validation.
- **Developer:** implement once the design and architecture are ready, replacing the placeholder page.
- **Tester:**
  - Cover EVT-007 for an anonymous user, the owner, and a second user, both through the API and directly against the database (select, insert, update including owner reassignment, delete), and check that search and the year list never return another user's data.
  - Cover validation limits and link rules (missing scheme, `javascript:` and `data:` rejected, over-length), time format (24:00, 7:5, blank).
  - Cover ordering with equal dates, timed versus untimed events, and paging across a page boundary, with and without a search.
  - Cover date edges: 1 Jan 1900, 31 Dec 2100, out-of-range dates, and a future date showing "Upcoming".
  - Cover search: case-insensitivity, matches in notes only, no match on the link, `%` and `_` treated literally, combined with a year, no-match state, and URL restore.
  - Cover accents with the EVT-009 examples ("phở", "pho", "gia dinh"): group membership, no duplicates, the second-group label, only-second-group results, and paging across the group boundary.
  - Cover that notes containing HTML are shown literally.
