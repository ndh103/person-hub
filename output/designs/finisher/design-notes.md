# Finisher: design notes

- Feature slug: `finisher`
- Status: `draft`. Covers the task form (`index.html`) and the Tasks list with the laptop side panel, drag order and quick due-date menu (`task-list.html`). Projects, Closed, project detail, and the Finish, Let go, Park, and Delete dialogs are not designed here yet.
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
