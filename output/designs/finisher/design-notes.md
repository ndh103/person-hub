# Finisher: design notes

- Feature slug: `finisher`
- Status: `draft`. Covers the task form (`index.html`), the Tasks list with the laptop side panel, drag order and quick due-date menu (`task-list.html`), and the Week tab (`week-planner.html`, 2026-10-24; see [Week planner](#week-planner-fin-042-to-fin-047)). Projects, Closed, project detail, and the Finish, Let go, Park, and Delete dialogs are not designed here yet.
- Date: 2026-10-12 (revised the same day: date-field display "12 Oct 2026", shortcut captions "Monday 12 Oct", stacked Due date / Due time); restyled 2026-10-13 to the Claude design system (see the [app-shell notes](../app-shell/design-notes.md#change-2026-10-13-claude-design-system-and-reference-orange)); extended 2026-10-20 for requirements v4.0 (Tomorrow shortcut, FIN-036, FIN-037, FIN-038).
- Scope of this version:
  - `index.html`: the Add and Edit task dialog, with the **Today**, **Tomorrow**, and **Next week** due-date shortcuts (FIN-034).
  - `task-list.html`: the Tasks tab with the laptop side panel (FIN-036), the quick due-date items in the ⋯ menu (FIN-037), and drag handles, drop marker and keyboard/Move alternatives (FIN-038). The same row component applies to the Today tab (Overdue, Due today); see [Tasks list](#tasks-list-fin-036-fin-037-fin-038).
- Requirements: [requirements/finisher.md](../../../requirements/finisher.md) v4.1: FIN-034 (with Tomorrow, decision 15), FIN-036, FIN-037, FIN-038, plus FIN-019 (create), FIN-020 (edit), FIN-022 (Tasks tab), and FIN-018 (layout and accessibility). Confirmed decisions 11 and 15–22. Assumptions A9 and A11–A17.
- Inputs: [foundation](../_foundation/design-system.md), [app shell](../app-shell/design-notes.md), and the current implementation in `src/features/finisher/components/task-form-dialog.tsx`.
- Architecture: the form shortcuts need no API change. FIN-037 uses the existing task update. FIN-038 needs a stored order and a reorder endpoint, which `docs/architecture/finisher.md` does not cover yet (see [Handoff to TA and Developer](#handoff-to-ta-and-developer)).

## Preview

Open `index.html` in a browser from this folder. It needs a network connection for Google Fonts (Source Serif 4, Inter and JetBrains Mono, per the 2026-10-13 foundation update) and the pinned Tailwind browser runtime `@tailwindcss/browser@4.1.11`, the same as the app-shell reference. That runtime is for the prototype only. The page also loads `../_foundation/theme.css` and `../app-shell/styles.css`, which provides the shell, drawer, focus ring, and icon styles.

- **Add task** (top right) opens the dialog. `index.html#add` opens it straight away.
- `task-list.html` is the Tasks list; see [its preview notes](#preview-1).
- **Edit** on the sample task opens the Edit task version.
- **Prototype controls** (the dashed box) let you:
  - **Pretend today is** Monday, Wednesday, or Sunday. On a Sunday, Tomorrow and Next week are the same date; both buttons stay.
  - Open the dialog with a date already typed, with validation errors, or with a simulated server error.

All data is synthetic.

## The design (FIN-034)

```
Due date (optional)
[ 📅 12 Oct 2026                         ]   ← opens a calendar (weeks start Monday)
[ Today          ] [ Tomorrow        ] [ Next week      ]
[ Monday 12 Oct  ] [ Tuesday 13 Oct  ] [ Monday 19 Oct  ]
Due time (optional)
[ --:--                              🕒 ]
Needs a due date.
```

- **Placement.** The three shortcuts (Today, Tomorrow, Next week, in that order; Tomorrow added in v4, decision 15) sit directly below the Due date input, inside the same field block. This matches what the user asked for ("under Due date"). Due date and Due time are now stacked at every width: with the "Monday 12 Oct" captions ("Wednesday 14 Oct" is the longest), a half-width date column was too narrow for the buttons.
- **Two-line buttons.** Each button shows its label (`text-sm font-medium`) and, underneath, the date it will set (`text-xs text-muted-foreground`, for example "Monday 19 Oct" (decision 13); the date field itself shows "19 Oct 2026" (decision 12)). This removes any doubt about which Monday "Next week" means, before the user taps.
- **They are action buttons, not toggles.** There is no pressed or selected state and no `aria-pressed`. A tap writes the date into the field, and the date field is the single place where the current value is shown. A selected look would go stale as soon as the user edits the date by hand.
- **What a tap does:**
  - It replaces any date in the field.
  - It leaves the time, title, notes, and project alone.
  - It does not submit the form.
  - Focus stays on the button.
- **Feedback after a tap:**
  - The date field briefly flashes the `--accent` tint (700ms, turned off with reduced motion).
  - A polite live region announces "Due date set to 19 Oct 2026."
  - If a "due time without a date" error is showing, the tap clears it, because a date now exists.
- **The date field** is a button that shows the value as "12 Oct 2026" (or a muted "Pick a date") with a calendar icon. It opens a calendar popover; weeks start on Monday, and dates outside a field's allowed range are disabled. The native date input was dropped because its display format follows the browser's language (decision 12).
- **Clearing the date:** optional date fields (Due date, Target date) show a "Clear date" button under the calendar when a date is set. No "No date" chip was added, because it is not in FIN-034.
- **Dates are worked out when the button is tapped**, not when the dialog opens. The button captions refresh each time the dialog opens. In production they should also refresh if the date changes while the dialog is open (see Developer notes).

### Visual tokens

The shortcuts reuse the outline-button look:

| Part | Tokens |
| --- | --- |
| Border | `--input` (3.55:1 on card, which passes as a non-text control boundary) |
| Background | `--card` |
| Radius | `--radius` (8px), the same as buttons |
| Hover | `--accent` / `--accent-foreground` |
| Focus | Shared `--ring` outline |

The shortcuts are not filled orange. That keeps the dialog's single primary action, **Add task**, visually dominant, and it avoids white-on-orange small text, which only reaches 3.32:1. No foundation tokens were changed or added. The `.due-shortcut` and `.field-flash` classes in `styles.css` use only foundation variables.

### Responsive behaviour

| Width | Layout |
| --- | --- |
| < 520px | The three shortcuts stack, one per row, with the label on the left and the date on the right, at least 44px tall. Three columns in a phone dialog would be about 95px each, too narrow for "Wednesday 14 Oct" with padding. (v3 split at 360px for two buttons.) |
| 520–639px | The three shortcuts sit side by side as two-line buttons (about 140px each), at least 44px tall. |
| ≥ 640px | Three columns in the 32rem dialog; the buttons are 40px tall (pointer input). Due time stays below Due date. |
| ≥ 1024px | The sidebar is persistent. The dialog is centred, with a maximum width of 32rem. |

## States covered

| State | How to see it | Requirement |
| --- | --- | --- |
| Add, empty | Add task | FIN-019 |
| Shortcut used: field filled, flash, announcement | Tap Today, Tomorrow, or Next week | FIN-034 |
| Shortcut replaces a typed date | Prototype "Add · date already typed", then tap a shortcut | FIN-034 |
| On a Sunday, Tomorrow and Next week set the same Monday | Pretend today is Sunday | FIN-034, decisions 11 and 15 |
| Validation: missing title, time without a date | Prototype "Add · validation errors" (a shortcut then clears the time error) | FIN-019 |
| Pending submit (spinner, button disabled) | Submit a valid form | FIN-019 |
| Server error, values kept | Prototype "Add · server error", then submit | FIN-019 |
| Success toast | Submit a valid form | FIN-019 |
| Edit, with the shortcuts present | Edit on the sample task | FIN-020, A9 |

## shadcn/ui mapping

| Reference element | Component |
| --- | --- |
| Dialog | `Dialog` / `DialogContent` (already used by `TaskFormDialog`) |
| Shortcut buttons | `Button variant="outline"` with `type="button"`, plus classes for the two-line layout (`h-auto min-h-11 sm:min-h-10 flex-col items-start`). Wrap all three in a `div role="group" aria-label="Due date shortcuts"`. `ToggleGroup` was rejected because these are actions, not a selection. |
| Date fields | `Popover` + `Calendar` (`mode="single"`, `weekStartsOn={1}`), opened by an outline `Button` trigger that shows "12 Oct 2026". Applies to Due date, Target date, and Revisit on. Day cells are 40px (`--cell-size`), so seven columns fit a 320px screen. |
| Time field | The existing `Input type="time"` inside `FormField` |
| Live announcement | A visually hidden `role="status"` element in the dialog, or the existing toast only if the toast is announced politely. A toast is too noisy for this, so an inline status element is recommended. |

## Developer notes

- **Computing the dates.** Tomorrow is `today + 1` day. Compute all three dates from the `today: LocalDate` prop that `TaskFormDialog` already receives. "Next week" is the Monday after the start of the current Monday-to-Sunday week: `today + (7 - mondayIndex(today))` days, where `mondayIndex` is Mon = 0 to Sun = 6. On a Sunday that gives tomorrow. Put this helper in `domain/dates` and unit-test it (Monday, Sunday, month end, year end such as 28 Dec 2026 → 4 Jan 2027, and a DST week).
- **The midnight rule.** FIN-034 says a dialog left open past midnight must use the new date. If `today` is captured once per page render, read the current local date when the button is clicked instead.
- **Accessible names.** Each button's accessible name should include the date as shown, for example `aria-label="Set due date to next week, Monday 19 Oct"`. The date-field trigger is named "Due date: 19 Oct 2026" (or "Due date: not set"), because a `<label>` alone would hide its value. This name contains the visible label text, which satisfies WCAG 2.5.3 Label in Name.
- **Clearing errors.** When a shortcut sets the date, clear any `dueDate` or `dueTime` field error that the new date resolves.

## Tasks list (FIN-036, FIN-037, FIN-038)

### Preview

Open `task-list.html` (same font and Tailwind runtime dependencies as `index.html`). Fixture time is **Tuesday 20 Oct 2026, 14:30**, so "Call the dentist" (due today 09:00) is already overdue.

- **Laptop (≥ 1024px):** click a task title to open the side panel. `task-list.html#task=t2` opens it on load (this is the A12 URL state; reload keeps it).
- **Phone (< 1024px):** a title shows a note that it opens the task page, as before.
- `task-list.html#menu=t3` opens a row's ⋯ menu after load (review convenience, like `index.html#add`).
- **Prototype controls:** make the next save fail (reorder or due date), and choose how the next panel load behaves (normal, slow, error with Retry, or deleted elsewhere).
- **Project filter:** reorder while filtered to see that hidden tasks keep their places.

### Row anatomy

```
┌──────────────────────────────────────────────────────────┐
│ ⠿  ( ◯ )  Prepare the paperwork and submit the form   ⋯ │
│ │    │     Due today 17:00 · Teach my daughter English   │ │
│ │    └ check-off, 28px circle (44px touch area)          │ └ row menu, 36px (44px touch area)
│ └ drag handle, 28 × 36px, 44px tall touch area (only when the section has 2+ tasks)
└──────────────────────────────────────────────────────────┘
```

- **Compact rows (2026-10-21, user request):** the title is `text-sm` (14px) and row padding is 8px top and bottom, so a one-line task row is about 56px tall instead of 68 to 76px. The check-off is a 28px circle with a 14px icon; the ⋯ menu and the drag handle are 36px tall. Each keeps a 44px touch target through a transparent `::after` (`.hit-44` here; `after:absolute after:-inset-*` in the app), so the change is visual only. Sessions on the Today tab use the same title size, padding and 36px controls. Task titles in the side panel are `text-xl`, and on the task page `text-xl` on phones and `text-2xl` from 640px (previously `text-3xl`/`text-4xl`).

- **Handle placement:** the handle sits at the far left, flush with the card edge (4px inset), before the check-off. The left edge is where people look for a grip in reorderable lists, and it keeps the ⋯ menu in the same place as today. On the right it would sit next to ⋯ and the two would be easy to mistake for each other.
- **Width budget at 320px:** handle 28 + check 28 + ⋯ 36 + gaps 24 + padding 12 = 128px, which leaves about 160px for the title. Titles wrap to two or three lines and nothing overflows (checked at the original sizes; the compact sizes only free width). The check-off keeps a 44px touch area.
- **Sections with one task** (No date in the fixture) show no handle, with a 28px spacer so titles stay aligned with other sections. Their menu has no Order group.
- **Parked rows** have no handle and no check-off (the check-off space is kept as a spacer), and are sorted by revisit date.

### Drag and drop (FIN-038)

| State | Treatment |
| --- | --- |
| Rest | Grip icon (Lucide `grip-vertical`) in `--muted-foreground`; hover fills `--muted`; `cursor: grab`. |
| Dragging (pointer) | The original slot stays as a placeholder (`--muted` background, content at 35% opacity). A **ghost** copy follows the pointer: `--popover` background, 1px `--border`, 12px radius, overlay shadow. `cursor: grabbing` across the page and text selection is off. |
| Drop marker | A 2px line in `--ring` (3.70:1 on card, passes non-text contrast) with an 8px open circle at its start, drawn between rows where the task will land. |
| Outside its section | The marker is hidden and the ghost fades to 60%. Releasing cancels, and "Move cancelled" is announced. There is a 24px tolerance around the section, so a small overshoot still counts. |
| Near the viewport edge | The page scrolls automatically within 64px of the top or bottom. |
| Keyboard lift | The row gets a 2px inset `--ring` outline on `--popover`, and the handle is `aria-pressed="true"` with an `--accent` fill. |
| Saving | Optimistic: the new order shows at once. There is no success toast, only the polite announcement. |
| Save failed | Only that section returns to its previous order. An error toast says "Couldn’t save the new order. It’s back as it was." |

- **Touch:** `touch-action: none` is set on the handle only, so swiping anywhere else on the row still scrolls the page. Tapping the title, check-off and ⋯ works as before.
- **Keyboard:** the handle is a button named "Reorder “title”", described by hidden instructions (`#reorder-help`). Space or Enter picks the task up and announces its position ("Position 2 of 3 in Upcoming"). The arrows move it, Space or Enter drops it, and Escape cancels. Moving focus away while it is lifted also cancels.
- **Single-pointer alternative (WCAG 2.5.7):** the ⋯ menu's **Order** group offers Move to top, Move up, Move down, and Move to bottom. Moves that are not possible are left out, for example no Move up on the first task. Focus returns to the row's ⋯ after a move.

### Quick due-date menu (FIN-037)

The ⋯ menu for an Open task:

```
DUE
  Today            Tuesday 20 Oct
  Tomorrow       Wednesday 21 Oct
  Next week         Monday 26 Oct
─────────────
  Edit
─────────────
ORDER
  Move to top · Move up · Move down · Move to bottom   (as applicable, one per line)
─────────────
  Park
  Let go
─────────────
  Delete                                   (destructive)
```

- **Flat group, not a submenu:** this is the recommendation from the BA hand-off. Submenus are awkward with touch and need one more tap. The "Due" heading is a small mono eyebrow in `--muted-foreground`.
- **Captions:** each item shows its date on the right as "Wednesday 21 Oct" (mono `text-xs`, muted), the same format as the form shortcuts (decision 13).
- **Current date:** the item is shown as "Tuesday 20 Oct · current" at 55% opacity with `aria-disabled="true"`, and keyboard navigation skips it. Exception (decision 22): a task due today at a passed time keeps **Today** enabled, and choosing it clears the time. Fixture: "Call the dentist" (due today 09:00, now overdue) moves to the bottom of Today with no time.
- **After choosing an item:**
  - The task moves to the bottom of its new section.
  - Focus goes to the task's title if it changed section, otherwise to its ⋯ button.
  - A toast says "Due tomorrow, 21 Oct 2026" and offers **Undo**.
  - If saving fails, only that task's date and position are restored, and an error toast appears.
- **Status rules:** Parked tasks show Edit, Change revisit date, Unpark, Let go, and Delete (no Due group). Done tasks (in the panel) show Reopen and Delete.
- **Length on phones:** a middle task has up to 11 items, about 560px at 44px each. The menu limits its height to the space beside its trigger and scrolls inside itself; it never covers the trigger.

### Side panel (FIN-036)

| Width | Layout |
| --- | --- |
| < 1024px | No panel. The title opens the task page. If the window narrows while the panel is open, the panel closes and focus returns to the row (A17). If it widens again with `#task=` in the URL, the panel reopens. |
| 1024–1279px | The page widens from `max-w-5xl` to 80rem with 32px padding. The grid is list `minmax(0,1fr)` + panel **18rem**. At 1024 the list column is about 355px, so titles wrap to two lines at about 22 characters (checked). |
| 1280–1535px | Panel **22rem**; list about 550px. |
| ≥ 1536px | Panel **26rem**. |

- **Surface:** `--card` with a 1px `--border` and a 16px radius, the same as list cards (L1, no shadow), so it reads as a sibling of the list, not an overlay. It is sticky (`top: 20px`) with its own scroll (`max-height: 100dvh − 40px`, `overscroll-behavior: contain`).
- **Content, top to bottom:**
  - Header: a "Task" eyebrow, the task's **⋯ menu**, and **Close** ✕.
  - Title: serif `text-2xl`, focused when the panel opens.
  - Status pill and due line.
  - Actions: **Mark done** (outline button with a circle icon; pressed shows "Done" on `--secondary`) and **Edit** (outline).
  - A divider, then a `dl` with Notes, Due, Project (rust link), Created, and Done.
  - "Open full page" link.
- **Why the ⋯ is in the header:** in the 18rem panel, Mark done + Edit + ⋯ did not fit on one line (checked at 1100px). Moving ⋯ next to ✕ keeps the action row to two buttons at every width.
- **Selected row:** an `--accent` tint plus a 3px inset `--ring` bar at the leading edge, a semibold title, and `aria-current="true"` on the title link. It does not rely on colour alone (FIN-036). Contrast on the tint: text 15:1; muted meta about 5.4:1 light and 6.0:1 dark; overdue crimson about 5.0:1 light and 4.9:1 dark (estimates; see checks).
- **States:**
  - **Loading:** skeleton bars; the title reads "Loading task…" to assistive technology, and the ⋯ is hidden.
  - **Error:** an alert with **Retry**.
  - **Not found:** "This task no longer exists" with "It may have been deleted on another device." No owner information is shown (FIN-017).
- **History:** the first open pushes `#task=id` (production: a search parameter, A12), so browser Back closes the panel. Switching tasks replaces the entry. Closing with ✕ or Escape goes back if the panel pushed the entry; otherwise it removes the parameter.
- **Closing:** Escape (when focus is inside the panel and no menu is open) or ✕ closes it. Focus returns to the row's title, or to the first section heading if the row is gone.
- **Actions in the panel:** marking done keeps the panel open showing "Done", even though the row leaves the list (FIN-036). Deleting closes the panel.
- **Modifier clicks:** Ctrl/Cmd/Shift/middle-click on a title are not intercepted, so the browser opens the link in a new tab. In production the link `href` is `/finisher/tasks/$id` (the full page).

### shadcn/ui mapping (Tasks list)

| Reference element | Component or library |
| --- | --- |
| Row ⋯ menu, panel ⋯ | `DropdownMenu`: `DropdownMenuLabel` for "Due" and "Order", `DropdownMenuItem` with `disabled` for the current date, a `DropdownMenuShortcut`-style span (or a custom span) for the date caption, `DropdownMenuSeparator`, and `variant="destructive"` for Delete. Already used by `TaskActionsMenu`. Radix positions by available height (`--radix-dropdown-menu-content-available-height`), which matches the prototype's behaviour. |
| Side panel | Not `Sheet` (that is modal). Use a plain `<aside aria-labelledby>` in a CSS grid next to the list, rendered from the route's `task` search parameter. Reuse the `TaskView` content in a compact variant. |
| Drag and drop | `@dnd-kit/core` + `@dnd-kit/sortable` (the user's preference, 2026-10-20) (`useSortable` with a drag-handle `listeners` binding, `KeyboardSensor` with `sortableKeyboardCoordinates`, `restrictToVerticalAxis` + `restrictToParentElement` modifiers, `DragOverlay` for the ghost, and `announcements` for the live text). Before installing it, the Developer still checks the current version, bundle size and maintenance status and pins it in the lockfile (CLAUDE.md: review new dependencies). |
| Toast with Undo | The existing `toast.add({ actionProps })` already used by `TaskCheck`. |
| Live announcements | A visually hidden `role="status"` region, or dnd-kit's built-in live region. |

### Handoff to TA and Developer

- **Backend capability needed (FIN-038):** a stored per-user order for open tasks and a reorder endpoint. The UI sends "move task X to position N among these visible ids" (or "between neighbours A and B"). That is a TA decision; fractional keys suit the "only the shown tasks change places" rule because one update moves one task.
- **Failure handling:** saves can overlap (a date change still pending while the user reorders). On failure, undo only that change, or refetch from the server (TanStack Query `invalidateQueries`). Do not restore a whole snapshot taken before the request: the prototype first did this and lost later moves.
- **Menu resize:** do not close the menu on height-only `resize` events. Phone browsers fire them when the address bar hides.
- **Today tab:** use the same row and handle in the Overdue and Due today sections. Sessions and Done today have no handles.

## Pomodoro (FIN-039, FIN-040)

Added 2026-10-20 for requirements v5.0 (decisions 23–26). It is in `task-list.html`: open a task, for example `task-list.html#task=t2`. The prototype control **Fast Pomodoro** (on by default) makes a session last 25 seconds, so completion can be reviewed.

### Pomodoro block (side panel and task page)

It sits under the Mark done / Edit actions and above the facts, separated by a rule. Its heading is "Pomodoro" (`text-sm font-medium`).

| State | Shows |
| --- | --- |
| Idle, Open task | **Start Pomodoro · 25 min**: the panel's one primary (orange) button, with a timer icon. |
| Running for this task | <ul><li>A mono `text-4xl` countdown, `role="timer"`, labelled "Time left on this Pomodoro".</li><li>An 8px progress bar (`--primary` on `--muted`, decorative; the time is the text).</li><li>An outline **Stop** button. Focus moves to Stop after starting.</li></ul> |
| Running for another task | "A Pomodoro is running for 'X': 18:42 left." plus an outline **Switch to this task** (Open tasks only). |
| Parked, Done, Let go | No Start; counts only. |
| Always | "Pomodoros: 2 today · 9 total" (mono meta). |

- **Superseded in the app (2026-10-21, requirements decision 28):** while a session runs, a blocking focus popup on every signed-in page holds the countdown, Stop and Mark task done; the block only shows "Running: mm:ss left", and Switch is gone from the UI.

- **Confirmations** (`AlertDialog`):
  - Stop: "Stop this Pomodoro? It won't be counted."
  - Switch: "Stop the Pomodoro for 'X' and start one for 'Y'? The stopped session won't count."
  - Cancel is labelled **Keep going** and gets the initial focus, so Enter doesn't abandon a session by accident.
- **Completion:**
  - a toast "Pomodoro complete: 'title'" with **Mark task done**; superseded in the app (2026-10-21) by a modal popup with a break suggestion (requirements decision 27);
  - a polite announcement;
  - a two-note chime (880 and 1319 Hz sine, about 0.8 s, gain 0.2) built with Web Audio, with no audio file;
  - the counts update.
  - The `AudioContext` is created or resumed on the Start click (autoplay rules).

### Header (every Finisher tab)

Under "Today · 20 Oct 2026":
- a muted mono pill with a timer icon and the count, read as "3 Pomodoros completed today";
- while a session runs, a chip with a pulsing `--primary` dot (static under reduced motion), the mono countdown, and the truncated task title. The chip is a link: the panel on laptop, the task page on phone.

The row wraps at 320px. The chip is 44px tall on phones and 32px from `sm`.

### Today tab

The summary line gains "· 3 Pomodoros today · 75 min", or "· No Pomodoros yet today". The prototype shows the Tasks tab, so this line is specified here only.

### Mapping and notes for the Developer

- **Components:** `Button` (default for Start, outline for Stop and Switch), `AlertDialog`, the existing toast with `actionProps`, `Badge`-like pill markup for the header count.
- **Countdown:** compute the time left from server timestamps on every tick, rather than counting ticks, so throttled background tabs and reloads stay correct. Update the text once a second; do not use `aria-live` on the timer.
- No foundation tokens were added. `.pomo-dot` and `.pomo-bar` in `styles.css` use foundation variables only.

### Checks

A scripted headless Edge run of `task-list.html` at 1280px (scratch, not committed) passed:
- idle → Start (focus on Stop; timer role present; header chip appears);
- another task shows Switch; the confirmation names both tasks; confirming starts the new task;
- after 25 s the header count goes from 2 to 3, the task count from 1 to 2, the block returns to Start, and the toast has "Mark task done".

**Not checked:**
- the chime (headless has no audio);
- 320px and dark mode screenshots of the new states;
- a screen reader.

## ui-ux-pro-max research

**2026-10-20 (Tasks list).** Python is not installed, so the skill's CSV data was searched with grep for "drag", "reorder", "side panel", and "master-detail". One relevant row: *Accessibility / Dragging Movements*: WCAG 2.2 AA needs a single-pointer alternative, for example "Move up and Move down buttons beside drag handle". This was adopted as the Order group in the ⋯ menu, rather than visible arrow buttons on every row, which would not fit at 320px. Nothing was found for side panels or list-detail layouts, so those choices are the designer's own judgement.

**2026-10-12 (task form).** One search was run: `search.py "date picker quick select shortcut chips form" --domain ux`.

| Result | Use |
| --- | --- |
| Use locale-aware, unambiguous dates | Adopted: "Monday 19 Oct" captions and "19 Oct 2026" in date fields, with no numeric-only dates. |
| Confirm submit status | Already covered by the pending and toast states. |
| Inputs need real labels | Already covered. |

The search returned nothing specific to date shortcuts, so the placement and the button-versus-toggle choice are the designer's own judgment.

## Checks performed

- The page's two inline scripts parse without errors. There are no duplicate IDs, and every referenced icon exists in the sprite (Node script).
- The "Next week" logic was checked with Node: 12 Oct 2026, 14 Oct 2026, and 18 Oct 2026 each give 19 Oct 2026, and 28 Dec 2026 gives 4 Jan 2027.
- Width estimates for 320px were made by hand.

**Not done:** no browser preview at phone or laptop width. Playwright is not installed in this repo, and no browser tool was available. Before handoff, open the page at 320px, 390px, and 1280px, in light and dark mode, to check overflow, the dialog's scrolling, and keyboard order (title → notes → date → Today → Tomorrow → Next week → time → project → Cancel → Add task).

Re-check 2026-10-13 (Claude design system restyle), headless Edge screenshots (scratch, not committed):

- The Add task dialog at 1280 and in a 375px iframe, light theme. It has a serif title, 12px fields on ivory, the orange focus ring on Title, an outline Cancel and an orange Add task, and no horizontal overflow at 375. This partly resolves the "Not done" item above. Dark mode, keyboard order and the error states were not re-run.

Checks on 2026-10-20 (v4: Tomorrow, side panel, drag, quick menu), headless Edge (scratch files, not committed):

- **Static:** both pages' inline scripts parse; no duplicate IDs; every icon used exists in the sprite (Node script).
- **Screenshots** (light unless noted):
  - `task-list.html` at 1280 with the panel open, and at 1024 with the panel open (loading skeleton captured).
  - 320px and 375px in iframes: no horizontal overflow, and the tab row scrolls inside itself.
  - 375px dark.
  - The task form at 390px: the three shortcuts stack with their dates right-aligned.
- **Scripted interactions** in a same-origin iframe at 1280, all of which passed:
  - **Quick menu:** it lists Due (3), Edit, Order (as applicable), Park, Let go and Delete, and focuses the first item. Today on an overdue task moves it to the bottom of Today, focuses its title, and shows a toast with Undo. "Today" on a task already due today is disabled. Escape returns focus to ⋯.
  - **Keyboard reorder:** lift, ArrowUp and drop reorder Upcoming. Focus stays on the handle, and the pick-up and move announcements are correct.
  - **Order menu:** Move to top works.
  - **Failed saves:** a failed due-date save restores only that task, and later reorders are kept. A failed reorder restores only its section, with an error toast.
  - **Panel:** opening it sets `#task=t3`, marks the row selected, and focuses the panel title. Switching tasks replaces the hash. Escape closes it, focus returns to the row title, and the hash is cleared.
- **Defects found and fixed in the prototype:**
  - A failed save restored a full order snapshot and lost later moves.
  - The menu jumped to the top of the window when it fit neither below nor above its trigger.
  - Any `resize` closed the menu.
  - The panel's ⋯ wrapped onto its own line at 18rem.
- **Not verified:**
  - The open menu's appearance (headless captures run before post-load timers or after a scroll glitch; its DOM state and position were verified instead).
  - Pointer and touch dragging (scripted pointer events were not run; the logic was reviewed by hand).
  - Selected-row contrast (the values above are estimates, not script output).
  - The panel in dark mode, a real screen reader, and reduced motion.

## Static-prototype limitations

- `task-list.html` uses a hand-written menu and drag implementation for demonstration only. Production should use shadcn `DropdownMenu` and a maintained drag library (see the mapping), which also handle touch sensors, pointer capture and screen-reader announcements more completely.
- The prototype keeps the panel state in `#task=…`. Production uses a router search parameter on the current tab (A12).
- Edit, Park, Let go, and Change revisit date only show a toast in `task-list.html`; their dialogs are in `index.html` (Edit) or not yet designed. Delete skips its confirmation dialog here.

- The dialog uses native `<dialog>` with `showModal()`. The browser makes the background inert and handles Escape, and focus returns to the opener on close. Tab can still reach the browser's own controls, which is unlike Radix focus trapping. The production shadcn `Dialog` handles this.
- The prototype's date field opens the browser's native picker (`showPicker()`) behind the "12 Oct 2026" button, as a stand-in for the production calendar popover. The calendar's look is shown only in the production component.

## Open questions

- None block FIN-034. Assumption A9 (shortcuts in Edit too) is shown in the Edit state. If the user wants them in Add only, hide the shortcut group when editing.
- **For the TA:** the order storage model and endpoint (above).

Resolved 2026-10-20 by the user: the drag handle stays, on phones too (decision 21); Today stays enabled for a task due today at a passed time (decision 22); dnd-kit is the user's preferred drag library.

## Delegate (FIN-041)

Added 2026-10-23 as a note, with no mockup. Requirements v5.1, decisions 29–31.

- **Menu:** Open and Parked tasks show **Delegate…** just before Let go.
- **Details button:** the side panel shows an outline **Delegate** button (forward icon, 44px tall) right after Mark done; the task page shows it under the title, aligned with the title text. Both open the dialog below.
- **Dialog:** the title is “Delegate ‘title’?”, with the description “It’s off your list, as if it were done. It moves to Closed as Delegated, and you can reopen it later.” It has one required text field, **Delegated to** (100 characters), and the buttons Cancel and **Delegate**. The layout is the same as the Let go dialog, which is not yet designed either.
- **Rows:** a delegated task shows an outline “Delegated” badge before its date line and has no check-off circle (Today’s Done list, project closed tasks).
- **Closed tab:** the outcome filters are Any outcome · Done or finished · **Delegated** · Let go. A delegated entry shows the outline badge “Delegated” and “Delegated to: name”.
- **Details:** the status badge reads Delegated, with “Delegated” as the date label and a “Delegated to” fact. There is no Mark done button.

## Week planner (FIN-042 to FIN-047)

Added 2026-10-24 for requirements v6.0 (decisions 33–35, assumptions A21–A29). File: `week-planner.html`, plus a "Week planner" block at the end of `styles.css`. Status: `draft`; it has not been reviewed by the user yet.

### Preview

Open `week-planner.html` from this folder. It has the same font and Tailwind runtime dependencies as the other pages. The fixture time is **Wednesday 28 Oct 2026, 14:30**, so the marking window is 21–28 Oct.

- The URL keeps the state as `#week=2026-10-26&view=plan` (A21). For example, `#week=2026-10-19&view=review` opens last week's review.
- The prototype controls can make the next save fail (a single move reverts; a bulk move reports one failure). They can also show the loading and error states, jump to a week three weeks ahead, or open last week's review.
- Narrow the window below 1024px for the phone layout.

### Layout

```
Laptop (≥ 1024px)
[‹] 26 Oct – 1 Nov 2026 [›]  This week          ☑ Show done   [Plan|Review]
11 tasks planned · 4 done · Sessions 2 of 9 done
┌ 4 tasks carried over ─────────────── [Move all to today] [Move all to next week] ┐
│ ○ Send the insurance claim form  Due 16 Oct 2026       Today  Next week  ⋯      │
└─────────────────────────────────────────────────────────────────────────────────┘
┌Unpl.┐┌Mon 26 Past┐┌Tue 27┐┌Wed 28 Today┐┌Thu 29┐┌Fri 30┐┌Sat 31┐┌Sun 1┐
│ ▯▯▯ ││ ⟲ session ││ …    ││ ⟲ session  ││ …    ││      ││      ││     │
│     ││ ✓ done    ││      ││ ⠿○ task  ⋯ ││      ││      ││      ││     │
│     ││           ││      ││ + Add      ││ + Add││ + Add││ + Add││+ Add│
└─────┘└───────────┘└──────┘└────────────┘└──────┘└──────┘└──────┘└─────┘

Phone (< 1024px)
[‹] 26 Oct – 1 Nov 2026 [›]
Carried over (stacked rows, actions wrap under the title)
Mon Tue [Today] Thu Fri Sat Sun   ← day strip, pressed = shown day, count under the date
Wednesday 28 Oct  Today   4 to do
 ○ ⟲ Watch ABK program   30 min · 19:00 · Teach my daughter English   ⋯
 ○ Return the hiking boots   09:00 · Overdue                           ⋯
 + Add
Unplanned 3
```

- **Board width:** Unplanned is 13rem, or a 3rem rail when collapsed. Day columns are at least 7.25rem. At 1280px with a classic 17px scrollbar and Unplanned collapsed, all seven days fit. Unplanned starts expanded at 1400px and wider, where all eight columns fit. Narrower laptops (1024–1279px) scroll sideways inside `.week-scroll`, never the page. The Week tab drops `max-w-5xl` on laptop and uses 1.5rem side padding.
- **Cards:** one row at every width: check-off, title and meta, ⋯ (decision 42, 2026-10-26; this replaces the laptop controls row and its handle). The ⋯ is 28px on laptop (`lg:size-7`) and keeps its 44px `.hit-44` touch area.
- **Sessions vs tasks** are told apart without relying on colour: sessions have a dashed left rule, a repeat icon, and the duration in text, and they have no drag handle. Assistive technology reads "Session:" before the activity.
- **Done and Delegated tasks** stay on their day, muted and struck through, with "Done" or "Delegated to …" in text (A23). The **Show done** toggle hides them.
- **Today** has an accent-tinted column with a ring border and a "Today" pill. **Past days** say "Past" in place of the count and have no Add button (A25).

### Interaction

- **Drag (laptop only, FIN-044):**
  - Pressing on the card and moving 4px starts the drag (the card shows a grab cursor); a click still opens the title, check-off or ⋯. A ghost follows the pointer.
  - The column under the pointer gets a 2px ring and a "Plan for Thursday 29 Oct" label.
  - Unavailable columns (the task's own day, past days, every day of a past week) are hatched and dimmed. Dropping there cancels.
  - The board scrolls automatically near its left and right edges. Escape cancels.
- **Keyboard:** no keyboard drag on the board (decision 42); keyboard users use Move to day… in the ⋯ menu. After a drop, focus goes to the task's title.
- **Move to day…:** in every Open task's ⋯ menu, under Today / Tomorrow / Next week (FIN-037). On laptop it opens a centred dialog, and below 1024px a bottom sheet with week arrows. It lists:
  - seven day options, with past days and the current day disabled and captioned "past" or "current";
  - **No day (Unplanned)** ("clears date and time").
- **Carried over:** each row has Today and Next week buttons. Its ⋯ menu adds **Unplan**. The bulk buttons report the count in a toast with Undo, and a partial failure shows an alert-styled toast.
- **Review:** summary chips, then Slipped (with actions), Done this week grouped by day, Projects (FIN-028 rates), and a collapsed Let go list. **Plan next week** opens the following week's Plan view. The Review button is disabled for future weeks, with the reason shown next to it.
- **Week navigation:** the arrows' accessible names include the target range. "This week" appears when another week is shown and moves focus to the range heading.

### States covered

Default (current week), next week, a past week (overdue tasks on their days and no Carried over), a week three ahead (sessions only, no tasks), the review of a past week, loading (an eight-column skeleton), error with Retry, failed single and bulk saves, the empty Unplanned list ("Every open task has a day."), and "Nothing planned" days. The "Nothing planned for this week" and "Nothing happened in Finisher this week" messages are in the code. The fixtures never trigger them, because every week has sessions.

### shadcn/ui mapping

| Prototype | Production |
| --- | --- |
| Week arrows, This week | `Button` (outline / ghost, icon) |
| Plan / Review switch | `ToggleGroup` (single) |
| Show done | `Switch` or `Checkbox` with label |
| Day strip | `ToggleGroup` of buttons, or plain buttons with `aria-pressed` |
| Cards, columns | `Card` styling via Tailwind; columns are `section`s with headings |
| ⋯ menu | `DropdownMenu` (same items as FIN-037 plus Move to day…) |
| Move to day | `Dialog` on laptop, `Drawer` (bottom sheet) on phone |
| Toasts | `Sonner` with an Undo action |
| Drag | The same library as FIN-038 (ADR-0006, dnd-kit preferred by the user), with droppable columns. The TA confirms that sortable plus multiple droppable containers fits. |

### For the TA and Developer

- **One week read** should return:
  - Open tasks due in the week, and Done or Delegated tasks due in the week (Show done);
  - Unplanned tasks (paged, 50 at a time);
  - carried-over tasks (current week only, paged);
  - sessions per day with their states;
  - for the review: tasks closed in the week, by local date.
- **Single moves** reuse the due-date update (FIN-037 path): set date or null, keep or clear the time per A26 and A14, and put the task at the bottom of the order.
- **Bulk moves** need a bounded endpoint (A29) that returns per-task success, so the UI can report partial failure. Undo is a second bulk call with each task's previous date and time.
- **The tab row** has five tabs now. Make the `ul` `relative` (as in this file) so the `sr-only` count text cannot widen the page at 320px; check this in the production `finisher-tabs.tsx`.

### Checks performed (2026-10-24)

Headless Edge 1280px screenshots (light and dark), 1440px, last week's review at 1280px, and 320px and 375px in iframes (light, and dark with the Move to day sheet open). The files are in the session scratchpad and are not committed.

A scripted run in same-origin iframes made 48 checks; 46 passed. The 2 failures are artefacts of the test harness, not defects:
- The sheet measured 353px wide during its 0.98 scale-in animation; its computed width is 360px.
- A focus check failed across frames; a separate run confirmed that focus returns to the moved task's ⋯.

Verified:
- no horizontal page overflow at 320px and 375px;
- all seven day pills are visible; only the selected day is listed; picking a day keeps focus on its pill;
- no drag handle on phone;
- all days fit at 1280px;
- no duplicate IDs, and every icon used exists in the sprite;
- carried-over tasks are not repeated on past days;
- the summary text; the URL state;
- the ⋯ menu items (Tomorrow is disabled when it is the current date; there are no Move up/down items);
- the dialog's disabled days; a move through the dialog, with its toast;
- keyboard lift, highlight, unavailable days, drop, and focus kept on the handle;
- the time kept after a move, and cleared when moving to Unplanned;
- Escape cancels a lift;
- pointer drag to Thursday, and a cancelled drop on a past day;
- Move all to today, and Undo;
- a failed save reverting;
- session marking, and future sessions locked;
- next week, This week, last week's review, Plan next week, and the error state.

**Defects found and fixed during the checks:**
- At 320px, the fifth tab's `sr-only` text widened the page. The tab `ul` is now `relative`.
- At 375px, carried-over titles collapsed to a few characters. The title now has a 12rem flex basis, so the actions wrap.
- At 1280px, Sunday was cut off and the controls overflowed the card. Columns, padding, and the ⋯ size were reduced.

**Not verified:** touch dragging on a real device, a screen reader, reduced motion, and the 1024–1279px sideways scroll by eye.

### Limitations and open questions

- The prototype's drag code, menu, and URL handling are for demonstration only. Edit, Delegate, Park, and Let go show a toast; the Add buttons say which date they would preset; titles say whether they open the side panel or the task page. Delete skips its confirmation.
- The side panel (FIN-036) is not drawn on the Week tab. The proposed behaviour is to collapse Unplanned while the panel is open, so the seven days stay readable. This needs a mockup if the user wants to see it.
- The user answered Q6–Q9 on 2026-10-24 (decisions 36–39); see the next section. The open question is now Q10: should the Today tab also sort by time?

### v6.1: time order, Set time, Pomodoros by day, weekly note (2026-10-24)

- **Order within a day (decision 39):** timed tasks and timed sessions are interleaved by time, with a session first on a tie. Untimed sessions come next, then untimed tasks in the user's order, then finished tasks. On today, Wednesday reads: 09:00 task, 17:00 task, 19:00 session, untimed session.
- **Set time… (FIN-048):** a menu item after Move to day…, captioned with the current time or "no time". It appears only on tasks dated today or later.
  - It opens a dialog (a bottom sheet on phone) with 16 hour buttons, 06:00–21:00, four per row (`.time-chip`). Passed hours on today and the current time are dashed, disabled, and captioned "past" or "current".
  - It also has an **Other time** field with Set (it refuses an empty time, a time already passed today, or the unchanged time) and **No time**.
  - Choosing saves at once, with an Undo toast. Focus returns to the task's ⋯ in its new place.
  - Production: the hour buttons map to `ToggleGroup` or plain `Button`s. The Other time field should show the app's 24-hour format; the prototype's native `<input type="time">` follows the browser locale and may show "05:00 PM".
- **Pomodoros by day (decision 38):** a review card with one row per day ("Tue 20 Oct · 4 Pomodoros · 100 min"), "–" for future days, today in bold, and a total line. It is text only, with no bars.
- **Weekly note (decision 37):** a review card titled "Notes on this week". The label is visible, with a hint, a 2000-character count, and **Save note**, which is enabled only when the text has changed.
  - It shows Saving…, then "Saved" or "Note removed" (an empty note). A failure shows an error toast and keeps the text.
  - Leaving the week or view with unsaved text asks for confirmation. The prototype uses the native `confirm()`; production uses `AlertDialog` with "Keep editing" focused first.
  - The note card is also shown in the empty-review state.

**Checks (headless Edge, same-origin iframes):** a second script made 27 checks, and all passed:
- the time order on Wednesday and Thursday, a tie at 07:30, and 06:00 placed before a 07:30 session;
- no Set time on Unplanned or carried-over tasks;
- today's disabled hours, the refused past Other time, and focus;
- the toast, No time, Undo, and a failed save reverting;
- the Pomodoro rows and total;
- the note: loading, editing, the count, blocked leaving, saving, and persistence across weeks;
- the current week's dashes;
- no page overflow at 320px in the review.

The first script was rerun with no new failures (the same two harness artefacts as before). Screenshots: the Set time sheet at 375px, and last week's review at 1100px.

### v6.3: weekend hidden by default (2026-10-24)

The app hides Saturday and Sunday unless **Show weekend** is on (decision 41, A34). The toggle sits beside Show done in the summary row and shows the number of hidden items. It always follows the user's choice, including at weekends. Carried-over cards keep check-off and title on one row on laptop. With five days, the columns use a 9rem minimum. The mockup (`week-planner.html`) still shows all seven days and was not updated.

### v6.2: Today tab removed (2026-10-24)

- The tab row is now **Week · Tasks · Projects · Closed** (decision 40), in `week-planner.html` and `task-list.html`. The app-shell reference and `index.html` were not changed. Week has no count (A22).
- **Revisit notice (FIN-013, A33):** a one-line notice above Carried over, shown for the current week only, for example "1 parked item is due for revisit · Review parked". The link goes to the Tasks list. It is hidden when nothing is due.
- Everything else the Today view did is already on the Week tab; see the FIN-031 table in the requirements.
- **Checks:** both scripts were rerun. The second passed all 27 checks, and the first showed only the two known harness artefacts. A 1280px screenshot confirms the new tab row and the notice.
