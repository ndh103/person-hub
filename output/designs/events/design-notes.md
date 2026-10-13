# Events: design notes

- Feature slug: `events`
- Status: `ready` (sufficient for implementation handoff; the visual direction follows the foundation, which is not yet user-approved)
- Date: 2026-10-13
- Requirements: [requirements/events.md](../../../requirements/events.md) v2.1, EVT-001 to EVT-009 (decisions 1–8, assumptions A1–A13).
- Inputs: [foundation](../_foundation/design-system.md) and [theme.css](../_foundation/theme.css), [app shell](../app-shell/design-notes.md), [Finisher task form](../finisher/design-notes.md) (date field and dialog patterns).
- Architecture: [docs/architecture/events.md](../../../docs/architecture/events.md) (API, search groups, paging cursor).

## Preview

Open `index.html` in a browser from this folder. It needs a network connection for Google Fonts and the pinned Tailwind browser runtime `@tailwindcss/browser@4.1.11`, the same as the other references (prototype only). It also loads `../_foundation/theme.css` and `../app-shell/styles.css`.

- `index.html#add` opens the Add event dialog.
- `index.html?q=phở` or `?q=pho&year=2026` restores a search from the URL (EVT-009).
- **Prototype controls** (dashed box at the bottom) switch between the list states and run the example searches. They also open the form with validation errors or a simulated server error, and can make the next delete fail.
- Today is fixed at **13 Oct 2026**. The page size is **5** in the prototype so "Load more" shows; production uses 50.

All data is synthetic.

## Change 2026-10-13

At the user's request, the "Your life log" eyebrow was removed. A mono "Today · 13 Oct 2026" line now sits under the title, matching the Finisher header.

## Page structure

```
Events                                         [ + Add event ]
Today · 13 Oct 2026
Search events                        Year
[🔍 Title or notes            ✕ ]   [ All years ▾ ]
12 events                                  Clear search and filters
2026
┌──────────────────────────────────────────────────────────┐
│ Flight to Hanoi                                        ⌄ │
│ 20 Dec 2026 · 07:45  (Upcoming)                          │
│ Booking ref in the email.                                │
├──────────────────────────────────────────────────────────┤
│ Bought a TV                                            ⌃ │  ← expanded
│ 13 Oct 2026  🔗                                          │
│ Model plasma 2026 tv001                                  │
│ Price: 12.990.000 ₫                                      │
│ shop.example.com/tv001 ↗                                 │
│ Added 13 Oct 2026                                        │
│ [✎ Edit] [🗑 Delete]                                     │
└──────────────────────────────────────────────────────────┘
2025 …
                     [ Load more ]
```

### Design decisions

| Decision | Choice | Why |
| --- | --- | --- |
| How an event is viewed (EVT-004) | **An expandable list row** (disclosure). The row button toggles a panel with the full notes, the link, the dates, and Edit/Delete. Several rows can be open at once. | Events are short records. Expanding in place keeps the user's scroll position and search context, needs no extra route or "not found" page, and works the same on phone and laptop. A separate page or a laptop two-pane layout was rejected as heavier with no gain for this content. |
| Year headings (EVT-002) | **Yes, when no search text is entered.** A serif `h2` per year ("2026") above each card group. A year filter leaves one heading. | Long logs are scanned by year. Each row still shows the full date "13 Oct 2026", as the date rule requires. |
| Search results (EVT-009, decision 8) | With search text, year headings are replaced by **"Exact matches"** and **"Also matching without accents"** headings. The second group has a one-line explanation. If there are no exact matches, only the second group shows, still labelled. | The groups are the meaningful structure while searching; mixing year headings into them would create two competing hierarchies. |
| Upcoming label (EVT-002 Should) | The foundation **tag** pattern: a pill with a 1px orange border, mono `text-xs`, rust text, reading "Upcoming". | It's text, not colour only, and reuses an existing pattern. Future events sit at the top anyway because of the ordering. |
| Link indicator | A 14px link icon in the meta line, with screen-reader text "Has a link". The link itself only appears in the expanded panel. | It keeps rows quiet and avoids an accidental tap on a link while scrolling on a phone. |
| Time entry | A **text input** with `inputmode="numeric"`, placeholder "HH:mm", the hint "24-hour, e.g. 07:45", and a clear button. "7:45" is padded to "07:45" on blur. | The native `type="time"` input shows 12-hour AM/PM in some browser languages, which breaks A12 (24-hour, language-independent display). |
| Date entry | The Finisher date-field pattern: a button showing "13 Oct 2026" that opens a calendar (weeks start Monday). Range 1 Jan 1900 – 31 Dec 2100, future dates selectable. | Consistency with Finisher (decision 12 there). |
| Link entry | `type="text"` with `inputmode="url"`, not `type="url"`. | `type="url"` makes browsers reject "shop.example.com/tv001", but A4 says to accept it and add `https://`. |
| Delete | An alert dialog. The **Cancel** button gets focus first, and **Delete event** is a filled destructive button. | A safe default for a permanent action (A8). |
| Cancel with unsaved input (A5) | A small "Discard this event?" alert dialog appears over the form, with **Keep editing** and **Discard**. It only shows if a field changed since the form opened. | It avoids nagging when nothing was typed. |

## States covered

| State | How to see it | Requirement |
| --- | --- | --- |
| List with year headings, Upcoming labels, timed before untimed on the same date | Default view | EVT-002 |
| Loading skeleton (`aria-busy`, "Loading events…" announced) | Prototype → Loading | EVT-002 |
| Empty (no events) with Add event | Prototype → Empty | EVT-002 |
| Load error with Retry | Prototype → Load error | EVT-002, EVT-009 |
| Load more (focus moves to the first new row) | Default view, bottom | EVT-002 |
| Expanded row: full notes (line breaks kept), link opening in a new tab, Edit, Delete | Tap a row | EVT-004 |
| Notes containing HTML shown literally | Expand "Graduated" (2019) | EVT-004 |
| Search, both groups | Prototype → "phở" | EVT-009 |
| Search, only the accent group | Prototype → "gia dinh" | EVT-009 |
| Search matching notes only | Prototype → "tv001" | EVT-009 |
| No matches, with Clear search and filters | Prototype → "tv002 in 2025" | EVT-009 |
| Add (defaults: today's date, empty time) | Add event | EVT-003 |
| Validation errors: missing title, bad time "7:5", `javascript:` link | Prototype → Add · validation errors | EVT-003 |
| Server error, values kept | Prototype → Add · server error, then submit | EVT-003 |
| Pending submit (spinner, button disabled) | Submit a valid form | EVT-003 |
| Saved: toast, row opened and focused in its date position | Submit a valid form | EVT-003, EVT-005 |
| Saved but hidden by the filter: toast with **Clear filters** | Search "pho", then add "Bought a TV" | EVT-003, EVT-005 |
| Edit, with time and link cleared | Expand a row → Edit | EVT-005 |
| Discard confirmation | Type in the form, then Cancel or Escape | EVT-003 (A5) |
| Delete confirm, success, and focus move | Expand → Delete → Delete event | EVT-006 |
| Delete failure, event kept | Tick "Next delete fails", then delete | EVT-006 |

Not shown, because it is a server response: "This event no longer exists" on save (EVT-005). Use the same `role="alert"` box as the server error, with that text, and refresh the list.

## Responsive behaviour

| Width | Layout |
| --- | --- |
| < 400px | Search and Year stacked full width. In the form, Date and Time are stacked. The Upcoming tag wraps under the date when needed. The dialog buttons stack, with the primary on top. |
| 400–639px | In the form, Date and Time sit side by side (`1fr / 8.5rem`). |
| ≥ 640px | Search and Year share one row (`1fr / 11rem`). Dialog buttons sit side by side, right-aligned. |
| ≥ 1024px | Persistent sidebar. Content is capped at `max-w-3xl`, a comfortable reading width for a single list. |

- The header "Add event" and the search field sit at the top of the page, above the list, so they are reachable without scrolling to the bottom (EVT-008).
- Long titles, links, and notes wrap with `overflow-wrap: anywhere` (`.ev-break`, `.ev-notes`). The collapsed notes preview is one truncated line.
- All touch targets are at least 44px (`min-h-11`, `size-11`). Inputs are 16px on phones to prevent iOS zoom.

## Tokens

Only foundation tokens are used, and no foundation tokens are changed. `styles.css` adds the dialog box (`.ev-dialog`, same as Finisher's `.task-dialog`), the chevron rotation, the skeleton pulse, and the wrapping helpers, all using foundation variables. The destructive buttons use `bg-destructive text-destructive-foreground` (6.02:1). Their hover uses `opacity-90`, which is acceptable here because the white-on-crimson contrast stays well above 4.5:1. That is unlike the orange primary, where the foundation forbids lightening.

## shadcn/ui mapping

| Reference element | Component |
| --- | --- |
| Search field | `Input type="search"` with a leading icon, a `Label`, and a ghost icon `Button` "Clear search". Wrap in `<form role="search">`. |
| Year control | `Select` (or a native `select` styled as the existing inputs). Options: "All years" plus the years from the API. |
| Result summary | A `p role="status"` (polite). It announces "3 events found · 1 exact, 2 more without accents". |
| Year and group headings | Plain `h2` (`font-heading text-xl font-medium`) |
| Event row | `Collapsible` (`CollapsibleTrigger` as a full-width button, `CollapsibleContent` panel) inside a card list (`ul` with `divide-y`). An `Accordion type="multiple"` also works. |
| Upcoming tag | `Badge variant="outline"`, with tag classes from the foundation |
| Link | `<a target="_blank" rel="noopener noreferrer">` with an `ExternalLink` icon and sr-only "(opens in a new tab)". Render it only if the URL's protocol is `http:` or `https:`. |
| Add/Edit form | `Dialog` + `FormField` (the existing Finisher field wrapper). Date: the existing `date-picker.tsx` pattern (`Popover` + `Calendar`, `weekStartsOn={1}`, `startMonth` 1900-01, `endMonth` 2100-12, with a year/month dropdown caption so 1900 is reachable). Time: `Input` with `inputMode="numeric"`. Link: `Input type="text" inputMode="url"`. Notes: `Textarea` with a character counter. |
| Discard and Delete confirmation | `AlertDialog`. `AlertDialogCancel` gets the initial focus for Delete. |
| Toasts | The existing toast, with an optional action button ("Clear filters"). |
| Skeleton | `Skeleton` |
| Load more | `Button variant="outline"` |

## Developer notes

- **Date formatting.** Use the app's `formatDate` ("13 Oct 2026", fixed month names). Do not use `Intl` with `en-GB`, which prints "Sept". The prototype hit exactly this bug. The formatter currently lives in `src/features/finisher/domain/dates.ts`; the architecture plan moves the shared date helpers to `src/lib/dates.ts` so Events does not import Finisher.
- **Upcoming** is computed in the browser: `event.date > todayLocal` (the browser's local date).
- **Search typing.** Debounce about 250ms, and keep previous results visible while the next page loads (TanStack Query `placeholderData: keepPreviousData`) so the list does not flash a skeleton on each keystroke. Sync `q` and `year` to the URL with TanStack Router search params (`replace: true` while typing).
- **Grouping.** Each API item carries its match group (`exact` | `accent`). Render the group headings from that and do not re-run accent matching in the browser.
- **After saving,** open the saved row and focus its trigger. If the item is not in the loaded pages (another date range or filtered out), show the toast instead. For a filtered-out item, add the **Clear filters** action.
- **Delete focus:** move focus to the next row's trigger, else the previous one, else the page `h1`.
- **Never** render notes or titles as HTML. Plain text with `white-space: pre-wrap` keeps line breaks.

## ui-ux-pro-max research

No search was run for this feature: Python is not installed in this environment (as recorded in the foundation notes). The patterns reuse the foundation and the Finisher form, and the choices above are the designer's own judgment.

## Checks performed (2026-10-13)

- A Node script checked that both inline scripts parse, that there are no duplicate IDs, and that every icon and `getElementById` reference exists.
- Headless Edge screenshots (scratch files, not committed), light theme:
  - **1280px:** list with year heading, Upcoming tags, timed "Ăn phở…" above untimed "Bought a TV" on 13 Oct 2026, and Load more.
  - **320px and 375px (iframes):** no horizontal overflow. Search and Year stacked. The "phở" search shows both labelled groups.
  - **Add dialog at 320px and 420px:** Date and Time stack at 320 and sit side by side at 420.
- The screenshots found the "Sept" formatting bug, now fixed.
- The accent folding used for the prototype matches the SQL folding in the architecture plan for the fixture cases ("phở", "pho", "gia dinh", "Đà Lạt").

**Not done:** dark-mode screenshots, keyboard-only walkthrough, and screen-reader testing. Check these during implementation.

## Static-prototype limitations

- Dialogs use native `<dialog>` with `showModal()`: the background is inert and Escape works, but Tab can reach browser controls. Production `Dialog`/`AlertDialog` (Radix/Base UI) handle focus containment.
- The date button opens the browser's native picker as a stand-in for the calendar popover.
- URL syncing with `history.replaceState` may be refused on `file://` in some browsers; the restore-from-URL path still works when the URL has `?q=`.

## Open questions

None block implementation.
