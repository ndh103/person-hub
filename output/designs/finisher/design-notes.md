# Finisher: design notes

- Feature slug: `finisher`
- Status: `draft` for the task form only. Other Finisher screens (Today, Tasks, Projects, Closed, project detail, and the Finish, Let go, Park, and Delete dialogs) are not designed here yet.
- Date: 2026-10-12 (revised the same day: date-field display "12 Oct 2026", shortcut captions "Monday 12 Oct", stacked Due date / Due time)
- Scope of this version: the Add and Edit task dialog, with the **Today** and **Next week** due-date shortcuts.
- Requirements: [requirements/finisher.md](../../../requirements/finisher.md) v3, mainly FIN-034, plus FIN-019 (create), FIN-020 (edit), and FIN-018 (layout and accessibility). Confirmed decision 11 ("Next week" means the Monday of next week). Assumption A9 (the shortcuts also appear in Edit).
- Inputs: [foundation](../_foundation/design-system.md), [app shell](../app-shell/design-notes.md), and the current implementation in `src/features/finisher/components/task-form-dialog.tsx`.
- Architecture: no API or schema change. A shortcut only fills the existing `dueDate` field before submit.

## Preview

Open `index.html` in a browser from this folder. It needs a network connection for Google Fonts (Space Grotesk and JetBrains Mono, per the 2026-10-12 foundation update) and the pinned Tailwind browser runtime `@tailwindcss/browser@4.1.11`, the same as the app-shell reference. That runtime is for the prototype only. The page also loads `../_foundation/theme.css` and `../app-shell/styles.css`, which provides the shell, drawer, focus ring, and icon styles.

- **Add task** (top right) opens the dialog. `index.html#add` opens it straight away.
- **Edit** on the sample task opens the Edit task version.
- **Prototype controls** (the dashed box) let you:
  - **Pretend today is** Monday, Wednesday, or Sunday. On a Sunday, "Next week" is tomorrow.
  - Open the dialog with a date already typed, with validation errors, or with a simulated server error.

All data is synthetic.

## The design (FIN-034)

```
Due date (optional)
[ 📅 12 Oct 2026                         ]   ← opens a calendar (weeks start Monday)
[ Today            ] [ Next week          ]
[ Monday 12 Oct    ] [ Monday 19 Oct      ]
Due time (optional)
[ --:--                              🕒 ]
Needs a due date.
```

- **Placement.** The two shortcuts sit directly below the Due date input, inside the same field block. This matches what the user asked for ("under Due date"). Due date and Due time are now stacked at every width: with the "Monday 12 Oct" captions ("Wednesday 14 Oct" is the longest), a half-width date column was too narrow for two buttons.
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
| Background | `--background` |
| Hover | `--accent` / `--accent-foreground` |
| Focus | Shared `--ring` outline |

The shortcuts are not filled orange. That keeps the dialog's single primary action, **Add task**, visually dominant, and it avoids white-on-orange small text, which only reaches 3.11:1. No foundation tokens were changed or added. The `.due-shortcut` and `.field-flash` classes in `styles.css` use only foundation variables.

### Responsive behaviour

| Width | Layout |
| --- | --- |
| < 360px | The two shortcuts stack, one per row, with the label on the left and the date on the right, at least 44px tall. Two side-by-side buttons would be about 124px wide, too narrow for "Next week / Wednesday 14 Oct" with padding. |
| 360–639px | The shortcuts sit side by side as two-line buttons, at least 44px tall. |
| ≥ 640px | Same as above in a wider dialog; the buttons are 40px tall (pointer input). Due time stays below Due date. |
| ≥ 1024px | The sidebar is persistent. The dialog is centred, with a maximum width of 32rem. |

## States covered

| State | How to see it | Requirement |
| --- | --- | --- |
| Add, empty | Add task | FIN-019 |
| Shortcut used: field filled, flash, announcement | Tap Today or Next week | FIN-034 |
| Shortcut replaces a typed date | Prototype "Add · date already typed", then tap a shortcut | FIN-034 |
| Next week on a Sunday sets tomorrow | Pretend today is Sunday | FIN-034, decision 11 |
| Validation: missing title, time without a date | Prototype "Add · validation errors" (a shortcut then clears the time error) | FIN-019 |
| Pending submit (spinner, button disabled) | Submit a valid form | FIN-019 |
| Server error, values kept | Prototype "Add · server error", then submit | FIN-019 |
| Success toast | Submit a valid form | FIN-019 |
| Edit, with the shortcuts present | Edit on the sample task | FIN-020, A9 |

## shadcn/ui mapping

| Reference element | Component |
| --- | --- |
| Dialog | `Dialog` / `DialogContent` (already used by `TaskFormDialog`) |
| Shortcut buttons | `Button variant="outline"` with `type="button"`, plus classes for the two-line layout (`h-auto min-h-11 sm:min-h-10 flex-col items-start`). Wrap both in a `div role="group" aria-label="Due date shortcuts"`. `ToggleGroup` was rejected because these are actions, not a selection. |
| Date fields | `Popover` + `Calendar` (`mode="single"`, `weekStartsOn={1}`), opened by an outline `Button` trigger that shows "12 Oct 2026". Applies to Due date, Target date, and Revisit on. Day cells are 40px (`--cell-size`), so seven columns fit a 320px screen. |
| Time field | The existing `Input type="time"` inside `FormField` |
| Live announcement | A visually hidden `role="status"` element in the dialog, or the existing toast only if the toast is announced politely. A toast is too noisy for this, so an inline status element is recommended. |

## Developer notes

- **Computing the dates.** Compute both dates from the `today: LocalDate` prop that `TaskFormDialog` already receives. "Next week" is the Monday after the start of the current Monday-to-Sunday week: `today + (7 - mondayIndex(today))` days, where `mondayIndex` is Mon = 0 to Sun = 6. On a Sunday that gives tomorrow. Put this helper in `domain/dates` and unit-test it (Monday, Sunday, month end, year end such as 28 Dec 2026 → 4 Jan 2027, and a DST week).
- **The midnight rule.** FIN-034 says a dialog left open past midnight must use the new date. If `today` is captured once per page render, read the current local date when the button is clicked instead.
- **Accessible names.** Each button's accessible name should include the date as shown, for example `aria-label="Set due date to next week, Monday 19 Oct"`. The date-field trigger is named "Due date: 19 Oct 2026" (or "Due date: not set"), because a `<label>` alone would hide its value. This name contains the visible label text, which satisfies WCAG 2.5.3 Label in Name.
- **Clearing errors.** When a shortcut sets the date, clear any `dueDate` or `dueTime` field error that the new date resolves.

## ui-ux-pro-max research

One search was run: `search.py "date picker quick select shortcut chips form" --domain ux`.

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

**Not done:** no browser preview at phone or laptop width. Playwright is not installed in this repo, and no browser tool was available. Before handoff, open the page at 320px, 390px, and 1280px, in light and dark mode, to check overflow, the dialog's scrolling, and keyboard order (title → notes → date → Today → Next week → time → project → Cancel → Add task).

## Static-prototype limitations

- The dialog uses native `<dialog>` with `showModal()`. The browser makes the background inert and handles Escape, and focus returns to the opener on close. Tab can still reach the browser's own controls, which is unlike Radix focus trapping. The production shadcn `Dialog` handles this.
- The prototype's date field opens the browser's native picker (`showPicker()`) behind the "12 Oct 2026" button, as a stand-in for the production calendar popover. The calendar's look is shown only in the production component.

## Open questions

- None block FIN-034. Assumption A9 (shortcuts in Edit too) is shown in the Edit state. If the user wants them in Add only, hide the shortcut group when editing.
