# Finisher: requirements

## Metadata

- Feature slug: `finisher`
- Status: `ready`
- Version: 6.3 (2026-10-24). The weekend is hidden on the board by default, with a Show weekend toggle (decision 41, A34). v6.2 (same day): Removes the Today tab: Week is the first tab and the Finisher home (decision 40, FIN-031 retired). v6.1 (same day), after the user answered Q6–Q9, added: decisions 36–39, FIN-048 (set a task's time on the board), time ordering within a day (FIN-043, FIN-045), and the weekly note and Pomodoros by day in the review (FIN-047). v6.0 (same day) added the **Week** tab: FIN-042 to FIN-047 (week navigation, week board, planning a task onto a day, sessions on the board, carry over, weekly review), decisions 33–35, and assumptions A21–A29. v5.1 (2026-10-23) added FIN-041 (delegate a task) and decisions 29–31. v5.0 (2026-10-20) added FIN-039 (Pomodoro session on a task) and FIN-040 (Pomodoro summary), decisions 23–26. v4.1 (same day) recorded design-review decisions 21–22; v4.0 added FIN-036 (task side panel on laptop), FIN-037 (quick due-date menu), FIN-038 (drag-and-drop task order), and a Tomorrow shortcut in FIN-034, and changes the task sort rules in FIN-022 and FIN-031. Builds on v3.2 (2026-10-13, tab counts); see Change notes.
- Source: the user's requests on 2026-10-09 (brainstorm: "I want to become a finisher") 2026-10-10 ("Habit Tracker will be replaced by Finisher… short tasks… bigger Projects with slots in my timetable… Finisher is the first menu item, Events next"), 2026-10-12 ("in the add new task dialog, under Due date, I want to quick assign the Due Date to Today, or Next Week"), 2026-10-23 ("with a Task, i want the ability to delegate it to other… considered same as the task has been done, but it should be marked as Delegated"), and 2026-10-20 ("for web version, i don't need to open a task detail in a separate page… a quick menu item to quickly assign a task to: Today, Tomorrow, and Next Week… the Tomorrow button (next to Today button)… drag and drop to rearrange the order of tasks in each section"), and 2026-10-24 ("i want to have a Week planner section where I can plan Tasks for a week"), plus answers to clarifying questions.
- Related: [project brief](../docs/project-brief.md), [app shell design](../output/designs/app-shell/design-notes.md), security baseline in [CLAUDE.md](../CLAUDE.md#security-baseline). Finisher design: [task form with due-date shortcuts, and the Tasks list with side panel, drag order and quick due-date menu](../output/designs/finisher/design-notes.md) (`index.html`, `task-list.html`; other screens not yet designed); the Week tab in [`week-planner.html`](../output/designs/finisher/week-planner.html) (FIN-042 to FIN-048, draft). Architecture: [docs/architecture/finisher.md](../docs/architecture/finisher.md) (v4 task enhancements and v5 Pomodoro; ADR-0005 order keys, ADR-0006 drag library, ADR-0007 Pomodoro sessions, ADR-0008 Week tab). Implementation: [docs/implementation/finisher.md](../docs/implementation/finisher.md) (v6.2 built 2026-10-24). Test report: not yet created.

## Goal and target user

The signed-in hub owner tends to start things and then put them off. Finisher helps them follow through on two kinds of work:

- **Tasks:** short, one-off things to get done, often by a date. Example: "Prepare the paperwork and submit the form on Monday".
- **Projects:** bigger goals that take weeks or months and need regular time. Example: "Teach my daughter English (phonics, numbers)". A project has weekly **slots**, for example Mon/Wed/Fri 30 min "Watch ABK program" and 30 min "Learn together". Each scheduled **session** is checked off, so the user can see whether they are keeping up week by week.

Finisher replaces the former Habit Tracker app. Recurring project sessions take over the role habits had.

Target user: the authenticated account owner, on phone and laptop browsers. All Finisher data is private to its owner.

## Scope

### In scope

- Tasks: create, edit, due date with optional time (with Today, Tomorrow, and Next week shortcuts), optional link to a project, mark done, delegate (FIN-041), park, let go, reopen, delete.
- Task details in a side panel next to the list on laptop (FIN-036); quick rescheduling to Today, Tomorrow, or Next week from a task's menu (FIN-037); the user's own order of open tasks, changed by drag and drop (FIN-038).
- Pomodoro focus sessions of 25 minutes started from a task's details (FIN-039), and counts of completed sessions today and per task (FIN-040).
- Projects: create, edit, a goal and a "Done when", optional target date, weekly slots, finish, park, let go, reopen, delete.
- Sessions: generated from slots for each local date; marked Done or Skipped for today and the previous 7 days.
- Weekly follow-through rate for each project.
- Tabs for **Week** (the Finisher home), Tasks, Projects, and Closed. The former Today view was removed (decision 40).
- A **Week** tab for planning tasks across a Monday-to-Sunday week (FIN-042 to FIN-047). The board shows the week's tasks and project sessions, and you plan a task by putting it on a day, which sets its due date. A task can be given a time, and each day lists its timed tasks and sessions in time order (FIN-048). The tab also has a Carried over group for unfinished tasks and a weekly review with a weekly note and Pomodoros per day.
- Finisher as the first app in the shell navigation, with Events second.

### Out of scope

- Areas or life-area grouping (decided 2026-10-10: Projects and Tasks only).
- Streaks (decided: weekly rate only).
- Task checklists or sub-steps (decided: tasks stay simple).
- Active-item limit, Waiting room, next step, 10-minute timer, staleness indicator, Finish → Event (retired from v1). The Pomodoro (FIN-039) is new scope from 2026-10-20, not a return of the retired 10-minute timer.
- For Pomodoros: break timers (the completion popup only suggests a break, decision 27), pause, lengths other than 25 minutes, browser or push notifications, and history or charts beyond today, per-task totals, and the per-day counts in the weekly review (FIN-047).
- Recurring tasks, other than project slots.
- Reminders, notifications, calendar sync, email, push.
- Monthly or custom recurrence; slots repeat weekly only.
- Attachments, sharing, collaboration, data export, and Home-page summaries.
- On the Week tab: a separate "planned for" date apart from the due date (decision 34), a calendar-style hour grid with durations (a time only orders a task within its day, FIN-048), reordering tasks within a day by hand, and dragging between days on phones (A27).
- Dragging a task into a different section to change its date on the Today and Tasks tabs (decision 19; the Week tab is the exception, FIN-044), dragging projects, sessions, or Parked and closed tasks, and a task side panel on phones (decision 17).

## Concepts

| Term | Meaning |
| --- | --- |
| Task | A single thing to do. Statuses: Open, Parked, Done, Delegated, Let go. |
| Project | A longer goal. Statuses: Active, Parked, Finished, Let go. |
| Slot | A weekly recurring time block in a project: an activity name, days of the week, a duration, and an optional start time. |
| Session | One slot on one local date when the project is Active. States: Done, Skipped, Unmarked, and Missed (Unmarked once the 7-day marking window has passed). |
| Marking window | Today and the 7 previous local dates. |
| Week | Monday to Sunday in the user's timezone (assumption A2). |
| Planned day | The day a task is on in the Week tab. It is the task's due date, not a separate field (decision 34). A task with no due date is **Unplanned**. |
| Carried over | An Open task whose due date is before today, offered for moving on the current week's board (FIN-046). |

## Lifecycles

**Task**

| From \ Action | Mark done | Delegate | Park | Unpark | Let go | Reopen | Delete |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Open | → Done | → Delegated | → Parked | – | → Let go | – | yes |
| Parked | → Done | → Delegated | change date | → Open | → Let go | – | yes |
| Done | – | – | – | – | – | → Open | yes |
| Delegated | – | – | – | – | – | → Open | yes |
| Let go | – | – | – | – | – | → Open | yes |

**Project**

| From \ Action | Finish | Park | Unpark | Let go | Reopen | Delete |
| --- | --- | --- | --- | --- | --- | --- |
| Active | → Finished | → Parked | – | → Let go | – | yes |
| Parked | → Finished | change date | → Active | → Let go | – | yes |
| Finished | – | – | – | – | → Active | yes |
| Let go | – | – | – | – | → Active | yes |

The UI does not offer actions marked "–", and the server rejects them with a validation error. The system never changes a status without a user action.

## Fields and validation

All text is trimmed. Limits are enforced on the server. The server sets status, timestamps, ownership, and session-generation data. Only the fields listed here can be written.

| Entity | Field | Required | Rules |
| --- | --- | --- | --- |
| Task | Title | Yes | 1–120 characters |
| Task | Notes | No | ≤ 1000 characters |
| Task | Due date | No | Local date, between 5 years in the past and 5 years ahead |
| Task | Due time | No | Local time HH:mm. Allowed only when a due date is set |
| Task | Project | No | One of the caller's own projects that is Active or Parked |
| Project | Title | Yes | 1–120 characters |
| Project | Goal / why it matters | No | ≤ 500 characters |
| Project | Done when | Yes | 1–300 characters |
| Project | Target date | No | Local date, today or later when set or changed |
| Slot | Activity name | Yes | 1–80 characters |
| Slot | Days of week | Yes | At least one of Mon–Sun |
| Slot | Duration | Yes | Whole minutes, 5–480 |
| Slot | Start time | No | Local time HH:mm |
| Slot | Count per project | – | 0–20 slots |
| Park | Revisit date | Yes when parking | Local date, from tomorrow up to 365 days ahead |
| Delegate | Delegated to | Yes | 1–100 characters |
| Let go | Reason | Yes | 1–500 characters |
| Finish | Reflection | No | ≤ 1000 characters |
| Weekly note | Note | No | ≤ 2000 characters (A30). One per user per week, keyed by the week's Monday. Saving an empty note removes it |

## Requirements

### FIN-001 Navigation and Finisher tabs (Must)

Finisher is the **first** app in the shell's Apps group, followed by Events. It has its own route. Inside Finisher, tabs lead to **Week** (the default, FIN-042), **Tasks**, **Projects**, and **Closed**, in that order. The Today tab was removed on 2026-10-24 (decision 40).

- Given a signed-in user, when they select Finisher in the sidebar or the phone drawer, then the Week tab opens on the current week, with today selected on phone. The nav item is marked current, the page title is "Finisher · Personal Hub", and focus moves to the page heading (SHELL-003).
- Each tab has its own URL, so a reload or a shared link reopens the same tab. The former Today tab's URL opens the Week tab on the current week, so old bookmarks still work.
- Each tab has loading (skeleton), empty, and error states. The error state offers Retry. An error never shows partial data that belongs to another account.

### FIN-035 Tab counts (Must)

The Tasks and Projects tabs each show a count of their items next to the label, as a small muted pill (app-shell design). The Week tab (A22) and the Closed tab (decision 14) have no count. The Today count went with the Today tab (decision 40).

- **Tasks:** Open tasks. Parked tasks are not counted (A10).
- **Projects:** Active projects. Parked projects are not counted (A10).
- The counts appear on every Finisher page, update after any change without a reload, and are left out (not shown as 0) while loading or if loading fails.
- Each count is read with its tab by assistive technology, for example "Tasks (12 open)" or "Projects (3 active)". The current tab is still marked by weight and an underline, not by the colour of its pill.
- There is no horizontal page overflow at 320px; the tab row scrolls inside itself if needed (FIN-018).

### FIN-031 Today view (Retired 2026-10-24)

Retired by decision 40; the Week tab is now the Finisher home. Where its parts went:

| Today view part | Now |
| --- | --- |
| Sessions today, with check-off | Today's column (laptop) or today's day (phone) on the Week board (FIN-043, FIN-045) |
| Overdue tasks | **Carried over** (FIN-046) for earlier days; tasks due today at a passed time stay in today's column, labelled Overdue |
| Due today | Today's column on the Week board, in time order (decision 39) |
| Done today | Finished tasks shown on their day (Show done, decision 36), and Done this week in the review (FIN-047) |
| Summary line | The week summary line (FIN-043); Pomodoros today stay in the Finisher header (FIN-040) |
| Due-for-revisit count | A notice on the Week tab (FIN-013) |
| Empty state | The Week tab's empty states (FIN-043) |

### FIN-019 Create a task (Must)

- Given the user chooses "Add task" from any Finisher tab, when they submit a valid title (and any optional fields), then an Open task is created and appears in the right lists without a full page reload.
- When "Add task" is used from a project's detail page, the project is preselected.
- Invalid input (missing title, a value over its limit, a due time without a date, or a project that is not the user's own Active or Parked project) shows an error next to the field. The form keeps the entered values, and nothing is created.
- A server failure shows a general error and keeps the values for a retry. The submit control is disabled while a request is pending, which prevents accidental duplicates.

### FIN-034 Due-date shortcuts in the task form (Must)

Below the **Due date** field in the Add task dialog, three shortcut buttons, in this order **Today**, **Tomorrow**, and **Next week**, set the due date in one tap, so the user does not have to open the date picker. (v4 added Tomorrow, decision 15.)

- **Today** sets the due date to today's local date (business rules, assumption A1).
- **Tomorrow** sets the due date to the local date after today. For example, on Monday 12 October 2026 it sets Tuesday 13 October 2026; on Sunday 18 October 2026 it sets Monday 19 October 2026, the same date as Next week, and both buttons are still shown.
- **Next week** sets the due date to the Monday of next week, the first day of the following Monday-to-Sunday week (confirmed decision 11; week start per assumption A2). For example, on Monday 12 October 2026 or on Sunday 18 October 2026 it sets Monday 19 October 2026.
- Each button shows, under its label, the date it will set, in the format "Monday 12 Oct" (weekday, day, short month; decision 13).
- Given the Add task dialog is open, when the user taps Today, Tomorrow, or Next week, then the Due date field shows that date at once, as "12 Oct 2026". Nothing is submitted, and focus stays on the button.
- A shortcut replaces any due date already in the field. It does not change the due time, the title, or any other field. The user can still change or clear the date with the date field.
- "Today" is worked out when the button is tapped, not when the dialog opened, so a dialog left open past midnight uses the new date. The same applies to Tomorrow, Next week, and the dates shown under each button.
- A date set by a shortcut is an ordinary due date. It is saved only when the form is submitted, with the same server validation as FIN-019; the server does not need to know that a shortcut was used.
- The shortcuts also appear in the Edit task dialog (FIN-020) for Open and Parked tasks, because it is the same form (assumption A9).
- Accessibility: the shortcuts are real buttons that come after the date field in tab order. Their accessible names include the resulting date as shown on the button, for example "Set due date to today, Monday 12 Oct" or "Set due date to tomorrow, Tuesday 13 Oct". After a tap, the new value is announced politely ("Due date set to 12 Oct 2026"). On phones each button is at least 44px tall, and there is no horizontal overflow at 320px (the three buttons may wrap or stack on very narrow screens).

### FIN-037 Quick due-date menu (Must)

The per-task menu (⋯) of an **Open** task offers three items that reschedule the task in one step, without opening the edit form: **Today**, **Tomorrow**, and **Next week** (decision 16). They are grouped under a "Due" heading (or a "Set due date" submenu if the design prefers) and placed before the other actions.

- The dates are worked out exactly as in FIN-034: Today is today's local date, Tomorrow is the next local date, and Next week is the Monday of next week. They are calculated when the menu opens, and each item shows its resulting date in the "Monday 12 Oct" format.
- The menu is offered wherever an Open task has a ⋯ menu: the Week tab, the Tasks tab, the open tasks on a project page, the task page, and the side panel (FIN-036).
- It is **not** offered on Parked, Done, or Let go tasks (decision 20). Parked tasks keep Unpark and Change revisit date.
- Given an Open task, when the user chooses one of the items, then the due date is saved at once, without a confirmation step. The task moves to the section that matches its new date (for example from Overdue to Due today), at the bottom of that section (FIN-038). The tab counts update (FIN-035).
- The due time is kept (assumption A14), except when the user chooses Today and the task's due time has already passed today: then the time is cleared, so the task is not overdue as soon as it is rescheduled.
- If the task is already due on that date, the item is shown as current (for example "Today · current") and is disabled. Exception (decision 22): when a task is due today at a time that has already passed, **Today** stays enabled, and choosing it clears the time so the task is no longer overdue.
- A success message names the new date ("Due tomorrow, 21 Oct 2026") and offers **Undo**, which restores the previous due date and time. Undo does not need to restore the previous position in the order.
- The server applies the same validation and ownership rules as editing a task (FIN-019, FIN-017). If saving fails, the task stays where it was, with its old date, and an error message appears.
- Accessibility: the items are real menu items with accessible names that include the date, for example "Set due date to tomorrow, Wednesday 21 Oct". After a change, focus returns to the task's ⋯ button, or to the task title if the task moved to another section. On phones each item is at least 44px tall.

### FIN-020 View and edit a task (Must)

- The user can open a task to see its title, notes, due date and time, project link, status, and created, done, or closed dates.
- Open and Parked tasks can be edited, with FIN-019 validation. The user can remove the due date, the due time, or the project link.
- Done and Let go tasks are read-only, except for Reopen (FIN-030) and Delete (FIN-016).
- On phones (< 1024px) a task opens on its own page, as before. On laptop it opens in a side panel (FIN-036). The task page stays available at its own URL on every screen size, for links and reloads.

### FIN-036 Task side panel on laptop (Must)

On laptop (≥ 1024px), selecting a task in a list opens its details in a panel beside the list, instead of going to a separate page (decision 17). The list stays visible, so the user can look through several tasks quickly.

- Applies to every task list in Finisher: the Week tab (FIN-043), the Tasks tab (including Parked), the open tasks on a project page, and task entries in the Closed tab.
- The panel shows the same information as the task page (FIN-020): title, status, notes, due date and time, project link, created date, done or closed date, and any reason. It also offers the check-off control and the same ⋯ menu as the task page, including the quick due-date items (FIN-037) for Open tasks.
- **Edit** opens the existing Edit task dialog (assumption A11). After saving, the panel shows the new values.
- Given the panel is open, when the user selects another task, then the panel shows that task. The selected task is visibly marked in the list (not by colour alone) and exposed to assistive technology as current.
- The panel closes with its Close (✕) button or Escape. Focus then returns to the task in the list that opened it, or to the list heading if that task is no longer in the list.
- The open panel is part of the URL (assumption A12): reloading reopens it with the same task, and browser Back closes it before leaving the page. Opening another task does not add a separate history entry for each task.
- The task title in the list stays a real link to the task page, so opening it in a new tab (Ctrl/Cmd-click or middle-click) opens the full task page.
- States: a loading state while the task loads; an error state with Retry; and "This task no longer exists" if it was deleted elsewhere or belongs to another account (FIN-017: nothing reveals whether another user's task exists).
- After an action in the panel, the list updates without a reload. When the task is deleted, the panel closes. When it is marked done, parked, let go, or rescheduled, the panel stays open and shows the new state, even if the task left the current list.
- If the window becomes narrower than 1024px while the panel is open, the panel closes and the list stays; nothing is lost (assumption A17).
- Layout: the list and the panel share the content area. The list stays readable (titles not cut to a few characters), there is no horizontal page overflow, and the panel scrolls independently when its content is long.
- Accessibility: the panel is a labelled region named after the task (it does not block the list, so it is not a modal dialog). When it opens, focus moves to the task title in the panel. Every control is reachable by keyboard with visible focus.

### FIN-021 Mark a task done (Must)

- Given an Open or Parked task, when the user marks it done, then its status is Done and the completion time is recorded. It leaves the open lists, stays visible as finished on its due day on the Week board (decision 36), and appears in Closed and in the week's review (FIN-047).
- The user can undo right after completing a task (for example with a toast "Undo"), or later with Reopen (FIN-030).

### FIN-022 Tasks tab (Must)

- The tab lists Open tasks in groups: **Overdue**, **Today**, **Upcoming**, and **No date**, each in the user's task order (FIN-038; changed in v4 from sorting by date and time, decision 18). A collapsed **Parked** group follows, sorted by revisit date. Tasks whose revisit date has arrived are labelled "Due for revisit".
- Each task shows its title, due date or time (relative wording such as "Mon" or "Tomorrow 09:00" is allowed, with the full date available to assistive technology), and the project title if it is linked.
- The user can filter by project: All, a specific project, or No project.
- Each group loads at most 50 tasks at a time and offers "Load more".
- Empty state: "No open tasks", with an Add task action.

### FIN-038 Task order and drag and drop (Must)

The user decides the order of their open tasks. In each task section they can drag a task to a new position, and that order replaces sorting by date (decisions 18 and 19).

**Where it applies**

- Draggable sections: on the Tasks tab, **Overdue**, **Today**, **Upcoming**, and **No date**. (The Week tab moves tasks between days instead, FIN-044.)
- Not draggable: sessions, the Parked group (still sorted by revisit date), the Closed tab, and projects. The open tasks on a project page are shown in the same order but cannot be dragged there (assumption A13).
- A task can be moved only within its own section. Dropping it in another section, or outside any section, cancels the drag and the task returns to its place. Dragging never changes a due date; rescheduling uses FIN-037 or Edit.

**One order for all views**

- Each user has one order for their open tasks. Every section shows its tasks in that order, so a reorder in the Tasks tab is also seen in the order of untimed tasks on the Week board (FIN-043), and on any other device.
- Given the Tasks tab is filtered by project (FIN-022), when the user reorders, then only the shown tasks change places among themselves; hidden tasks keep their positions.
- A task goes to the **bottom** of its section when it is created, reopened, or unparked, and when the user changes its due date (with Edit, a form shortcut, or FIN-037). Editing other fields, including only the due time, keeps its position. The exception is the immediate Undo after marking a task done (FIN-021): the task returns to the place it had.
- When a task changes section because time passes (for example from Today to Overdue at midnight), it keeps its place in the user's order and nothing is saved (business rules: no automation). It therefore appears among the Overdue tasks according to that order, not necessarily at the bottom.
- On release (v4 migration), existing open tasks get an order that reproduces what each section showed before: overdue, today, and upcoming tasks by due date and time, and no-date tasks newest first (assumption A16).
- The order is saved on the server, so it is the same after a reload and on another device. If the order is changed on two devices, the last saved change wins, and the other device shows it after its next refresh.

**Interaction**

- Each task row in a draggable section has a visible drag handle, on phones and laptops (decision 21). Dragging starts from the handle with a mouse, pen, or touch, so swiping on a phone still scrolls the page and tapping the title, check-off, or ⋯ still works as before.
- While dragging, the task follows the pointer and a clear marker shows where it will land. The list scrolls automatically near the top or bottom edge. Escape cancels a drag.
- A section with one task shows no handle (or a disabled one).
- The new order appears at once (an optimistic update). If saving fails, the section returns to its previous order and an error message appears.
- "Load more" (FIN-022): only loaded tasks can be dragged, and tasks loaded later appear in the same saved order below them.
- Animations respect the reduced-motion setting.

**Without dragging (accessibility)**

- Each draggable task's ⋯ menu offers **Move up** and **Move down** (and **Move to top**, **Move to bottom**). They are left out or disabled when the move is not possible, for example Move up on the first task in its section. They follow the same save and failure rules as dragging.
- The drag handle is a keyboard-operable button named after the task, for example "Reorder 'Submit form'". Space or Enter picks the task up, the arrow keys move it within its section, Space or Enter drops it, and Escape cancels. Each step is announced politely, for example "'Submit form' moved to position 2 of 5 in Due today".
- After a move, focus stays on the moved task's handle (or its ⋯ button when the menu was used).
- On phones the handle is at least 44px tall, and there is no horizontal overflow at 320px.

**Permissions**

- A user can reorder only their own open tasks (FIN-017). The server rejects a reorder that refers to a task the user does not own or a task that is not Open, and nothing changes. Keeping a task within its section is enforced by the interface; the server does not need to know about sections.

### FIN-039 Pomodoro session on a task (Must)

A Pomodoro is a 25-minute focus session tied to one task (decision 23). It helps the user start on a task and stay with it.

**Starting**

- The task's details show a **Pomodoro** block: in the side panel on laptop (FIN-036) and on the task page. For an **Open** task it offers **Start Pomodoro · 25 min** (A18). Parked, Done, and Let go tasks show their counts (FIN-040) but no Start.
- Given no session is running, when the user chooses Start, then a session starts at once. The start time is set by the server, and the focus popup opens (below).
- **One at a time.** Only one session runs at a time for the user, across all tasks and devices. While one runs, the focus popup covers the app, so no other session can be started (the API's `replace` option for switching remains, unused by the UI since 2026-10-21).

**Running**

- While a session runs, a modal **focus popup** covers every signed-in page (Home, Events, Finisher), including after a reload, after navigating, and when the session was started on another device (decision 28). It shows "Focus", the task title, "Stay with this one task. Everything else can wait.", the time left as mm:ss counting down, and a progress bar. The countdown is worked out from the server's start time, so it is the same everywhere. Escape and clicks outside do not close it; while it is open the browser tab title starts with "⏱ Focus".
- The only ways out, each confirmed with **Keep going** focused first:
  - **Stop** asks "Stop this Pomodoro? It won't be counted." Confirming abandons the session (decision 24). There is no pause.
  - **Mark task done** (when the task still exists) asks "Mark the task done and end the Pomodoro?" and says the session won't count, since only full sessions do. Confirming stops the session, then marks the task Done (FIN-021).
- Behind the popup, the task's Pomodoro block shows "Running: mm:ss left" with no buttons.

**Completing**

- When 25 minutes have passed without Stop, the session is **completed** and counts (FIN-040). This holds even if the app was closed at that moment: only Stop abandons a session (A20). Nothing else changes, and the task's status is untouched.
- If the app is open in the browser at that moment, on any signed-in page, then the focus popup closes and:
  - a modal popup titled "Pomodoro complete" says "You focused on 'title' for 25 minutes. That's N Pomodoros today." It suggests a 5-minute break, or a longer 15 to 30 minute break after every fourth session today (decision 27). The user must close it (**Take a break**, which gets the initial focus, or Escape) before doing anything else; it also offers **Mark task done** (FIN-021). While it is open, the browser tab title starts with "✓ Pomodoro complete";
  - a short chime plays (decision 25). Browsers may block sound after a reload until the user clicks something; the message still shows.
  - The counts update without a reload.
- There are no browser or push notifications (decision 25; brief).

**Permissions and failure**

- Only the owner can start or stop sessions for their own tasks (FIN-017). Another user's task or session behaves as if it does not exist.
- If starting or stopping fails, an error message appears and the block shows the server's state. If Stop arrives after the 25 minutes have passed, the session counts as completed, and the message says so.

**Accessibility**

- The countdown has the timer role. It is not announced every second; the focus and completion popups are modal dialogs whose titles are announced, and Stop is announced politely.
- Start, Stop, and Mark task done are real buttons at least 44px tall. Dialogs follow FIN-018, except that the focus popup does not close on Escape (decision 28). The progress bar is not the only cue: the time left is always shown as text.

### FIN-040 Pomodoro summary (Must)

Completed sessions are counted (decision 26):

- **Week review:** completed Pomodoros per day of the week (FIN-047). (The former Today tab's "N Pomodoros today · M min" line was retired with that tab, decision 40.)
- **Finisher header**, on every Finisher page:
  - a small count pill next to the "Today · 20 Oct 2026" line, read as "3 Pomodoros completed today";
  - while a session runs, a compact countdown with the task title, which opens that task's details (the panel on laptop, the task page on phone).
- **Task details:** "Pomodoros: 2 today · 9 total" for that task.
- **Which day a session counts for:** the user's local date on which it **ended** (started time + 25 minutes; business rules, A1). Abandoned sessions are never counted.
- **Deleted tasks:** deleting a task keeps its completed sessions in the day's count; their link to the task is removed (A19).
- The counts update after any start, stop, or completion without a reload. They are left out while loading, as the tab counts are (FIN-035).

### FIN-023 Create a project (Must)

- Given the user chooses "New project", when they submit a valid title and Done when, then an Active project is created. The same form can add slots (FIN-025), or the user can add them later.
- Validation, failure, and duplicate-prevention behavior are the same as in FIN-019.
- Sessions for new slots start on the creation date (FIN-026).

### FIN-024 Project detail (Must)

The project page shows: title, goal, Done when, target date, status, its slots, a 7-day session strip (FIN-027), weekly follow-through (FIN-028), and the project's open tasks with an "Add task" action. It also offers Finish, Park, Let go, Edit, and Delete, as the project's status allows.

- Active and Parked projects can be edited (title, goal, Done when, target date), with the validation in Fields and validation.
- Finished and Let go projects are read-only, except for Reopen and Delete. Their history (rates and closed tasks) stays visible.

### FIN-025 Manage slots (Must)

- On an Active or Parked project, the user can add, edit, or remove slots with the validation in Fields and validation. A 21st slot is rejected.
- A slot is shown as, for example, "Mon · Wed · Fri — Watch ABK program — 30 min — 19:00".
- **Changes apply from today forward.** Adding a slot schedules sessions from today. Editing a slot's days takes effect from today: sessions already marked on earlier dates keep their records, and past weekly rates do not change. Removing a slot stops future sessions, but its past session records still count in past weekly rates.
- Editing a slot does not delete a session that was already marked today. If today is no longer one of the slot's days, the marked session from today is kept, and the rate counts it as scheduled for today.
- Removing a slot asks for confirmation that explains that its past history is kept.

### FIN-026 Session schedule (Must)

- A session exists for each slot on each local date when all of these hold: the date is one of the slot's days of the week, the slot was in effect on that date, and the project was Active on that date.
- No sessions are scheduled while a project is Parked or closed. Reopening or unparking schedules sessions again from that day.
- Sessions are evaluated in the user's timezone (business rules). There is at most one record per slot per date.

### FIN-027 Mark sessions (Must)

- The user can set a session to Done, Skipped, or back to Unmarked for any date in the marking window (today and the previous 7 days). This can be done from Today (today only) and from the project's 7-day strip (any date in the window).
- Repeating the same mark is idempotent: it never creates a second record or a second count.
- Future sessions and dates before the window cannot be marked. The UI disables them, and the server rejects them.
- Once a date leaves the marking window, Unmarked sessions on it become **Missed** and can no longer be changed. Done and Skipped records from before the window are also locked.
- Marking is not allowed on Finished, Let go, or Parked projects, except to correct sessions within the window on dates when the project was still Active.

### FIN-028 Weekly follow-through (Must)

- For each project, the **weekly rate** is the number of Done sessions divided by the number of sessions scheduled that week (FIN-026), shown as "5 of 6 sessions this week". Skipped and Missed counts are shown alongside it, and Unmarked sessions later in the current week are shown as remaining.
- The project page shows the current week and the previous 4 weeks. The Projects tab shows the current week's rate on each project.
- A week with no scheduled sessions shows "No sessions scheduled" instead of 0%.
- Streaks are not shown or calculated.
- Information is never conveyed by color alone: each count appears as text.

### FIN-033 Projects tab (Must)

- The tab lists Active projects with their title, the current week's rate, today's sessions (if any), and the number of open tasks. A collapsed Parked group follows, with revisit dates and "Due for revisit" labels.
- Empty state: "No projects yet". It explains that a project is for something bigger that needs regular time, and offers a New project action.

### FIN-029 Finish a project (Must)

- Given an Active or Parked project, when the user chooses Finish, then a dialog shows the project's Done when and asks for an optional reflection. Confirming sets the status to Finished and records the closed time. A short, accessible celebration message follows, which respects reduced-motion settings.
- If the project has open tasks, the dialog shows how many. Those tasks stay open and keep their link (assumption A4).

### FIN-012 Let go (Must)

- Given an open task (Open or Parked) or an open project (Active or Parked), when the user chooses Let go and gives a reason, then the status becomes Let go and the closed time is recorded.
- The wording presents letting go as a valid, deliberate decision ("You decided this no longer deserves your energy"), not as a failure. Closed lists show Let go items separately from Done and Finished items.
- A missing reason shows a field error.

### FIN-041 Delegate a task (Must)

A delegated task has been handed to someone else. For the user it counts as finished, like Done, but it stays recognisable as Delegated when they review closed work (decisions 29–31).

- Given an Open or Parked task, when the user chooses **Delegate…** from its ⋯ menu and enters who it was handed to, then the status becomes Delegated, the closed time is recorded, and any revisit date is cleared. A success message confirms it.
- "Delegated to" is required (1–100 characters, trimmed). A missing value shows the field error "Say who you handed this to."
- Delegate is offered wherever an Open or Parked task has a ⋯ menu: the Week and Tasks tabs, a project page, the task page and the side panel (FIN-036). The side panel also has a **Delegate** button beside Mark done, and the task page has one under the title, both opening the same dialog (decision 32). Projects cannot be delegated.
- A delegated task leaves the Tasks tab. There is no Delegated section in the Tasks tab (decision 29), and it is not counted on the Tasks tab (FIN-035).
- It appears as finished, labelled Delegated, on its due day on the Week board (FIN-043), in Done this week in the review (FIN-047), in a project's closed tasks (FIN-024), and in the Closed tab under its own **Delegated** outcome (FIN-032).
- Its details show the status Delegated, the date it was delegated, and "Delegated to". It has no check-off control and is read-only, except for Reopen (FIN-030) and Delete (FIN-016).
- Only the owner can delegate their own tasks (FIN-017). The name is personal data: it is not logged.

### FIN-042 Week tab and week navigation (Must)

The **Week** tab is where the user plans tasks across one Monday-to-Sunday week (A2, decision 33). It is the first Finisher tab and the Finisher home (FIN-001, decision 40).

- Given a signed-in user, when they open the Week tab, then it shows the **current week** in the **Plan** view (FIN-043). The heading shows the date range, for example "26 Oct – 1 Nov 2026". A range that crosses a year shows both years, for example "28 Dec 2026 – 3 Jan 2027". The current, next and previous weeks also get a label: "This week", "Next week", or "Last week".
- **Previous week** and **Next week** buttons change the week. A **This week** button appears whenever another week is shown. Each button's accessible name includes the range it opens, for example "Next week, 2 Nov – 8 Nov 2026".
- A two-option switch, **Plan** and **Review**, changes the view (FIN-047). For a future week, Review is disabled and a note explains why ("You can review a week once it has started").
- The week shown and the view are part of the URL (A21). A reload or a shared link reopens them, and browser Back returns to the week shown before. A missing or invalid week opens the current week. Weeks more than 5 years from today cannot be shown (the due-date range in Fields and validation).
- The tab has no count (A22).
- "Today" and the current week are worked out in the user's timezone (A1). If the page stays open past midnight, the today marker and the Carried over group (FIN-046) update on the next data refresh or when the tab regains focus.
- States, as in FIN-001: a skeleton of the board while loading; an error state with Retry; and no partial data from another account.

### FIN-043 Week board (Must)

The Plan view is a board with an **Unplanned** list and one column per day, Monday to Sunday.

**Day columns**

- **Weekend (decision 41):** Saturday and Sunday are hidden by default, so the board shows Monday to Friday.
  - A **Show weekend** toggle beside Show done shows them. It is remembered in this browser (A34).
  - While they are hidden, the toggle shows how many tasks and sessions are on them, for example "Show weekend (2)".
  - The toggle alone decides, including on a Saturday or Sunday. On phones, the day strip then starts on Monday.
  - Hiding changes only what is shown: weekend items still count in the week summary, still appear in the review, and Move to day… still offers Saturday and Sunday.
- Each day's header shows the short weekday and date ("Mon 26 Oct") and how much is still to do that day, for example "3 to do". That count is Open tasks plus unmarked sessions in the marking window or later. Today's column says "Today" in text and is highlighted, not by colour alone. Days before today are shown as past.
- **Order within a day (decision 39):**
  1. **Timed items** (Open tasks with a due time, and sessions with a start time; FIN-045), together, in time order, for example a 07:30 session, then a 10:00 task, then a 15:00 task. When a task and a session share a time, the session comes first; tasks with the same time follow the user's task order (FIN-038).
  2. **Untimed sessions.**
  3. **Untimed Open tasks**, in the user's task order.
  4. **Finished tasks** (below).
- Changing a task's time (FIN-048, Edit, or the task form) moves it to its new place at once. On this tab the time decides the position; on the Tasks tab the user's order still does (decision 18).
- **Tasks on a day:** Open tasks whose due date is that day. Each shows its title, due time if set, and project if linked. A task due today whose time has passed is labelled Overdue.
- **Finished tasks on a day:** Done and Delegated tasks whose due date is that day are listed below its open tasks. They are muted, show their check-off as done, and say Done or Delegated in text. A **Show done** toggle, on by default (decision 36), hides them. Parked and Let go tasks are not shown on the board.
- **Current week:** Open tasks due before today appear only in the Carried over group (FIN-046), not in the earlier days' columns, so no task is shown twice. **Past weeks:** Open tasks are shown on their day and labelled Overdue.
- Each day except past ones has an **Add** action. It opens the Add task dialog (FIN-019) with the due date set to that day; the user can still change the date. Past days have no Add action (A25).
- A day with nothing on it shows "Nothing planned". On laptop it is still a drop target (FIN-044).

**Unplanned**

- The **Unplanned** list holds Open tasks with no due date, in the user's task order, with a count. It loads 50 at a time with "Load more" (FIN-022). Its Add action creates a task with no due date.
- Empty: "Every open task has a day."

**Task actions**

- Check-off marks a task done (FIN-021), with Undo. A done task stays visible on its day while Show done is on.
- The title opens the task's details: the side panel on laptop (FIN-036), the task page on phone (FIN-020).
- An Open task's ⋯ menu offers the quick due-date items (FIN-037), **Move to day…** (FIN-044), **Set time…** (FIN-048, only when the task has a day), Edit, Delegate…, Park, Let go, and Delete. **Move up/down** is not offered on the Week tab, because the board has no ordering within a day (A24).

**Week summary**

- A line above the board reads, for example, "9 tasks planned · 3 done · Sessions 4 of 9 done".
  - "Planned" counts Open, Done, and Delegated tasks due in the week.
  - "Done" counts the Done and Delegated ones among them.
  - "Sessions" uses the FIN-028 definition, added up across projects. With no sessions scheduled, that part reads "No sessions scheduled".
- If the week has no tasks, no sessions, and nothing Unplanned, the board shows "Nothing planned for this week" with an Add task action.

**Layout**

- On laptop (≥ 1024px), Unplanned is a column to the left of Monday. All eight columns are visible without horizontal page overflow. If the space is too narrow for task titles to stay readable, the board scrolls sideways inside itself and the page does not (the designer sets the breakpoint). When the side panel (FIN-036) is open, the board keeps its columns and stays readable, for example by collapsing Unplanned.
- On phone (< 1024px), a **day strip** shows the seven days, each with its weekday letter, its date, and its to-do count. It selects which day is listed below. It defaults to today in the current week and to Monday in other weeks. The selected day is a pressed button, with "Today" in text where it applies. The Unplanned list follows the day's list as its own section. There is no horizontal page overflow at 320px.

### FIN-044 Plan a task onto a day (Must)

Putting a task on a day sets its **due date** to that day (decision 34). This is the only place where dragging changes a due date. On the Tasks tab, dragging still only reorders (decision 19).

**By drag (laptop)**

- An Open task on the board is dragged by its card; there is no drag handle (decision 42). When it is dropped on a day, its due date becomes that day. When it is dropped on Unplanned, its due date **and** due time are cleared (A26).
- While dragging, the day under the pointer is highlighted and names its date. Days that cannot take the task are shown as unavailable: the task's own day, past days of the current week, and every day of a past week. Dropping there, or outside the board, cancels the drag and nothing changes. Escape cancels. The board scrolls automatically near its edges.
- Reduced-motion settings are respected.

**By menu (laptop and phone)**

- **Move to day…** in an Open task's ⋯ menu opens a dialog (a bottom sheet on phone, A27). It lists the seven days of the shown week with their dates and "Today" where it applies. The task's current day is marked "current" and disabled, and past days are disabled. It also offers **No day (Unplanned)**, and previous- and next-week controls let the user pick a day in another week.
- Choosing a day saves at once, without another confirmation.

**What a move does**

- The due time is kept when the task moves to another day, except that moving to today when that time has already passed clears it (as A14). Moving to Unplanned clears it.
- The task goes to the bottom of its new day (FIN-038). The board, the day counts, the week summary, and the tab counts (FIN-035) update at once, as an optimistic update.
- A message names the new day, for example "Moved to Wednesday 28 Oct" or "Moved to Unplanned", and offers **Undo**, which restores the previous due date and time.
- If saving fails, the task returns to where it was with its old date, and an error message appears.

**Permissions**

- Only Open tasks can be moved on the board. The server applies the same validation and ownership rules as editing a task (FIN-019, FIN-017). Another user's task behaves as if it does not exist.

**Accessibility**

- Dragging is pointer only. Keyboard and screen-reader users move a task with **Move to day…** in its ⋯ menu (decision 42).
- Each drag step is announced politely, for example "'Submit form' over Wednesday 28 Oct". After a move, focus goes to the task's title after a drag, or to its ⋯ button when the menu was used.
- Menu items and dialog options are at least 44px tall on phones. The dialog traps focus, closes on Escape, and returns focus to the ⋯ button.

### FIN-045 Sessions on the week board (Must)

- Each day lists the sessions that FIN-026 schedules on that date. Each shows the activity, the project title, the duration, and the start time if set. Sessions with a start time are placed among the day's timed tasks in time order; untimed sessions follow the timed items (FIN-043, decision 39).
- A session looks clearly different from a task, not by colour alone: it has its own icon and the visible text of its duration. Assistive technology reads it as a session, for example "Session: Watch ABK program, Teach my daughter English, 30 min".
- **Marking:**
  - Within the marking window (FIN-027), the check-off control marks a session Done, and a secondary action marks it Skipped. Tapping a Done or Skipped session again returns it to Unmarked. A mark shows at once (an optimistic update); if saving fails it is reverted and an error message appears.
  - Future sessions are shown as "Upcoming" and cannot be marked.
  - Sessions before the window show their final state (Done, Skipped, or Missed) and are locked.
- Sessions cannot be dragged or moved; the schedule is changed by editing the slot (FIN-025). The project title links to the project page.
- A Parked or closed project schedules no sessions (FIN-026). Sessions it had on earlier days while it was Active are still shown on those days.

### FIN-046 Carry over unfinished tasks (Must)

- When the current week is shown and some Open tasks are due **before today** (earlier this week or in any earlier week), a **Carried over** group appears above the board, for example "4 tasks carried over". It shows each task's original due date ("Due Mon 26 Oct", or "Due 12 Oct 2026" for an earlier week), in the user's task order. It is not shown for other weeks.
- Each task offers these actions, besides check-off and its ⋯ menu:
  - **Today** moves it to today.
  - **Move to day…** works as in FIN-044.
  - **Next week** moves it to the Monday of next week (decision 11).
  - **Unplan** clears its date.
- **Move all to today** and **Move all to next week** move every carried-over task. One message reports the count ("4 tasks moved to today") and offers **Undo**, which restores each task's previous date and time. If some tasks cannot be moved, the message says how many moved and how many did not. The ones that did not move stay in the group.
- Moved tasks follow FIN-044 (time kept or cleared, bottom of their new day). A task due today at a time that has passed stays in today's column, labelled Overdue; it is not carried over.
- Nothing is carried over automatically (business rules: no automation). The group is a prompt, and tasks stay overdue until the user moves them.
- The group loads 50 tasks at a time with "Load more". The bulk actions apply to all carried-over tasks, loaded or not, up to a server limit (A29).

### FIN-047 Weekly review (Must)

The **Review** view looks back at the shown week (the current week or a past one) and leads into planning the next one. The only thing it stores is the weekly note (decision 37).

- **Summary:** counts only, for example "7 done · 1 delegated · 2 let go · 3 slipped · Sessions 8 of 10 done". There is no overall success percentage (A6).
- **Done this week:** tasks marked Done or Delegated during the week (their closed time falls in the week in the user's timezone), grouped by day, with Delegated ones labelled. Each title opens its details.
- **Slipped:** Open tasks due in the week that are now overdue. For the current week, that means due before today, or due today at a time that has passed. For a past week, it means every Open task due in it.
  - Each has **Move to day…** and **Next week** actions.
  - **Move all to next week** moves all of them, with Undo (as FIN-046).
  - Empty: "Nothing slipped this week."
- **Let go this week:** a collapsed list of tasks let go during the week, with their reasons.
- **Projects:** each project that had sessions scheduled that week, with its FIN-028 weekly rate ("5 of 6 sessions"), Skipped, Missed, and remaining counts.
- **Pomodoros by day (decision 38):** one row per day, Monday to Sunday, with that day's completed Pomodoros and minutes, for example "Tue 27 Oct · 5 Pomodoros · 125 min". A day with none shows "0". Days after today show "–". A total line follows ("14 Pomodoros this week · 5 h 50 min").
  - A session counts on the local date on which it ended, as in FIN-040. Abandoned sessions never count, and sessions of deleted tasks still count (A19).
  - Each count is text. Any bar drawn beside it is decorative.
- **Weekly note (decision 37):** a labelled multi-line field, "Notes on this week", with a character count (2000 at most, A30), for example what went well and what to change.
  - It can be written or changed for the current week and any past week. A future week has no Review (FIN-042).
  - **Save** is enabled once the text has changed. While saving, the button is disabled. Afterwards a "Saved" message is announced politely. If saving fails, the text stays in the field and an error offers a retry. Saving an empty field removes the note.
  - Leaving the view with unsaved changes asks for confirmation ("Discard your changes to this week's note?").
  - The note is personal content (FIN-017): only its owner can read or change it, and it never appears in logs or analytics.
- **Plan next week** opens the Plan view of the following week.
- Empty, when nothing was scheduled, closed, or slipped, and no Pomodoros were completed: "Nothing happened in Finisher this week", with a link to the Plan view. The weekly note is still offered.

### FIN-048 Set a task's time on the board (Must)

A task on a day can be given a time, so the day lists it in time order (decision 39). The time is the task's existing **due time** (Fields and validation); there is no separate field.

- **Set time…** in the ⋯ menu of an Open task that has a day opens a dialog (a bottom sheet on phone) titled with the task and its day. It offers:
  - **hour buttons** from 06:00 to 21:00;
  - an **Other time** field for any time in minutes (HH:mm);
  - **No time**, which clears the time.
  Unplanned tasks do not offer Set time…, because a time needs a date, and neither do carried-over tasks, whose day has passed. Either kind first needs a day, today or later (FIN-044, FIN-046).
- On today, hours that have already passed are disabled and marked "past", so a new time does not make the task overdue at once. On other future days every hour is available. The task's current time is marked "current" and disabled.
- Choosing a time saves at once, without another confirmation. The task moves to its new place in the day, and a message names the time ("Set for 10:00 on Thursday 29 Oct") with **Undo**, which restores the previous time. If saving fails, the task returns to its old time and place and an error appears.
- Times are shown in the app's 24-hour "10:00" format, the same as due times elsewhere (A31).
- Setting a time never changes the task's day or its place in the user's task order (FIN-038), so the Tasks tab is unaffected apart from the time it displays.
- Permissions and validation are those of editing a task (FIN-019, FIN-017).
- Accessibility: the hour buttons are real buttons with names such as "10:00, Thursday 29 Oct". The dialog traps focus, closes on Escape, and returns focus to the task's ⋯ button. After a change, focus goes to the task's ⋯ button in its new place. Each button is at least 44px tall on phones.
- Same states and permissions as the board (FIN-042, FIN-017). Each count is shown as text.

### FIN-013 Park and revisit (Must)

- An Open task or an Active project can be parked with a revisit date. Parking an item that is already parked changes its revisit date.
- A parked project schedules no sessions (FIN-026). A parked task does not appear in Today.
- When today is on or after the revisit date, the item is labelled "Due for revisit" in its Parked group. The Week tab, when showing the current week, shows a one-line notice such as "2 parked items are due for revisit", which links to them in the Tasks and Projects tabs (A33). It is hidden when there are none. Nothing changes status automatically.
- Unpark returns a task to Open and a project to Active.

### FIN-030 Reopen (Should)

- A Done, Delegated, or Let go task can be reopened to Open. A Finished or Let go project can be reopened to Active, after confirmation. Reopening clears the closed time and the reason, reflection, or delegate name on the item. Past session records and rates are kept.

### FIN-032 Closed tab (Must)

- The tab lists closed tasks and projects, most recently closed first. It has filters for type (Tasks, Projects) and outcome (Done or Finished, Delegated, Let go). "Done or finished" means work the user did themselves; the Delegated filter shows tasks only (FIN-041).
- Each entry shows its title, type, outcome, and closed date. Projects also show their duration from start to close in calendar days and their overall session count (Done of scheduled). Entries show a reflection or reason when one exists, and delegated tasks show "Delegated to".
- Summary counts are shown for the current filter. There is no percentage "success rate" (assumption A6).
- 20 entries load at a time, with "Load more".
- Empty state: "Your finished work will appear here."

### FIN-016 Delete (Must)

- The user can permanently delete any of their own tasks or projects after a confirmation dialog that names the item and says the deletion cannot be undone.
- Deleting a project deletes its slots and session records. Its linked tasks are kept, with the link removed (assumption A5), and the dialog states this.
- If the user cancels, nothing changes. If the deletion fails, an error appears and the item stays visible.

### FIN-017 Ownership, permissions, and privacy (Must)

- Only authenticated users can use Finisher. A signed-out visitor is sent to sign-in. API requests without a valid session are rejected as unauthenticated.
- A user can read, create, change, or delete only their own tasks, projects, slots, and session records. Ownership comes from the verified session, never from a client-supplied user ID.
- Another user's records behave as if they do not exist, whether reached through the API or directly through the database with the caller's session. Nothing leaks whether they exist.
- A task can link only to a project owned by the same user. A slot belongs only to its own project. A session record can refer only to the caller's own slot, and to a date for which FIN-026 schedules a session.
- Finisher content (titles, notes, goals, reasons, reflections) is personal. It must not appear in logs, analytics, error reports, or shared caches. All rules in the CLAUDE.md security baseline apply.

### FIN-018 Responsive layout and accessibility (Must)

- Phone (< 1024px): single column. The tabs are a horizontally fitted segment control, or a select if they do not fit at 320px. There is no horizontal page overflow at 320px. Check-off targets are at least 44px. Secondary actions (Skip, quick due dates, Move up/down, Park, Let go, Delete) sit in a per-item menu. Selecting a task opens the task page, which holds the Pomodoro block (FIN-039). The header's running countdown (FIN-040) wraps under the date line at 320px rather than overflowing.
- Week tab: a day strip with a single-day list on phone, and Unplanned plus seven day columns on laptop (FIN-043). Moving a task between days uses Move to day… on phone and drag or Move to day… on laptop (FIN-044).
- Laptop (≥ 1024px): the Week tab shows the board (FIN-043). Project detail may show the slots and weekly rates beside the task list. Selecting a task opens the side panel (FIN-036).
- Check-off controls are real buttons or checkboxes, with labels that include the item, such as "Mark 'Watch ABK program' done". They announce their pressed or checked state.
- Every action can be done with the keyboard, with visible focus. Dialogs trap focus and return it to the element that opened them. Form errors are linked to their fields and announced. Status changes are announced politely.

## Business rules

- **Timezone:** session dates, task due dates, "today", overdue checks, the marking window, weeks, and revisit dates use the user's timezone (assumption A1). Created, done, and closed times are stored as UTC instants. A due date, revisit date, target date, or session date is a date-only value, not a timestamp. A due time is a local wall-clock time together with its due date.
- **Overdue:** a task with a date but no time is overdue once that local date has ended. A task with a date and time is overdue once that local date and time has passed.
- **Recurrence:** slots repeat weekly only, on the selected days. There are no exception dates (skipping a single date is done by marking it Skipped).
- **Date display:** every date shown in the app uses the format "12 Oct 2026" (day, short month, year), including screen-reader text and the value shown in date fields such as Due date, Target date, and Revisit on (confirmed decision 12). The value must not depend on the browser's language. The only exceptions are the captions on the FIN-034 shortcut buttons and the FIN-037 menu items, which use "Monday 12 Oct" (decision 13). Relative words "Today", "Tomorrow", and "Yesterday" may replace a date where a requirement allows relative wording. Picking a date opens a calendar whose weeks start on Monday (A2); optional date fields offer a way to clear the date.
- **No automation:** nothing changes status, marks a session, changes the task order, or sends a notification without a user action.
- **Task order:** open tasks are shown in the user's order (FIN-038), not by date. Dates and times are still shown on every task; Overdue still means the due moment has passed.

## Confirmed decisions

From the user, 2026-10-09:

1. Let go is a valid closure and is shown separately from finished work.

From the user, 2026-10-10:

2. Habit Tracker is removed from the hub. Finisher replaces it.
3. Finisher is the first sidebar app. Events comes next and is brainstormed later.
4. Finisher has two item types: short Tasks and longer Projects with weekly timetable slots.
5. There are no Areas. Tasks may optionally belong to a project.
6. Project sessions are checked off as Done or Skipped. Follow-through is shown as a weekly rate only, with no streaks.
7. Sessions can be marked up to 7 days back. Unmarked sessions older than that count as Missed.
8. Tasks have no checklist.
9. Finisher opens on the Today view. *Superseded by decision 40: Finisher opens on the Week tab.*
10. Let go and Park are kept from v1. The active limit, the timer, Finish → Event, the Waiting room, next step, and staleness are dropped.

From the user, 2026-10-12:

11. The "Next week" due-date shortcut sets the Monday of next week, not today + 7 days.
12. Dates are displayed as "12 Oct 2026", including the value in date fields (Due date, Target date, Revisit on).
13. The Today and Next week shortcut buttons caption their date as "Monday 12 Oct".

From the user, 2026-10-13:

14. Each Finisher tab shows its number of items, except the Closed tab.

From the user, 2026-10-20:

15. The task form has a **Tomorrow** shortcut next to Today, in both the Add and Edit task dialogs.
16. A task's menu has quick items to set its due date to Today, Tomorrow, or Next week.
17. On laptop, task details open in a side panel beside the list, not on a separate page. Phones keep the task page.
18. In every task section, the order set by drag and drop replaces sorting by date and time. New tasks, and tasks moved into a section, go to the bottom.
19. Dragging only reorders within a section. It never changes a task's due date.
20. The quick due-date items are offered on Open tasks only, not on Parked tasks.

From the user, 2026-10-20 (design review):

21. Reordering starts from a visible drag handle on each row, on phones too (not a long-press).
22. For a task due today at a time that has passed, the quick **Today** item stays enabled and clears the time.

From the user, 2026-10-20 (Pomodoro):

23. A Pomodoro session is a fixed 25 minutes, started from a task's details.
24. There is no pause. Stopping early abandons the session, and it is not counted.
25. When a session ends, the open app shows a modal popup and plays a short chime. There are no browser notifications.
26. Completed sessions are summarised on the Today tab (retired by decision 40; now per day in the weekly review, decision 38), in the Finisher header, and per task in its details (today and total).
27. The completion popup suggests a break (5 minutes; 15 to 30 minutes after every fourth session today). It is a suggestion only: there is no break timer (2026-10-21).
28. A running session blocks the app with a focus popup on every signed-in page. Only Stop or Mark task done (both confirmed, neither counted) end it early; there is no minimise (2026-10-21).

From the user, 2026-10-23 (delegation):

29. A task can be delegated. It counts as done, but it is marked Delegated, and the Tasks tab has no Delegated section.
30. Delegating records who the task was handed to (required).
31. The Closed tab has its own Delegated outcome filter, separate from Done or finished.
32. A task's details have a Delegate button beside Mark done, for a quick decision.

From the user, 2026-10-24 (week planner):

33. Finisher gets a **Week** tab for planning tasks across a week, placed after Today.
34. Putting a task on a day in the Week tab sets its **due date**. There is no separate "planned for" date. This is an exception to decision 19 that applies only to the Week tab.
35. The first version includes the week board with drag to a day, project sessions on the board, carrying over unfinished tasks, and a weekly review.

From the user, 2026-10-24 (answers to Q6–Q9):

36. Finished (Done and Delegated) tasks show on the board by default (confirms A23).
37. The weekly review has a short note the user writes for each week.
38. The review shows Pomodoros completed per day, because the daily number matters most to the user.
39. A task on the board can be set to a time ("10 AM for task 1, 3 PM for task 2"), and each day lists its tasks in time order. This is a time for ordering, not a calendar grid.

From the user, 2026-10-24 (later):

40. The **Today** tab is removed. **Week** is the first tab and the Finisher home: Week, Tasks, Projects, Closed.
41. The board hides Saturday and Sunday by default; a toggle shows them.

From the user, 2026-10-26:

42. Week board cards have no drag handle: the user drags the card itself. Each card is one row: check-off on the left, title in the middle, ⋯ on the right. This replaces decision 21 on the Week board only; the Tasks tab keeps its handles.

## Assumptions (reversible proposed defaults)

- A1. The user's timezone is the browser's IANA timezone, until the hub defines an account timezone.
- A2. Weeks run Monday to Sunday.
- A3. The marking window is today plus the 7 previous dates, which is 8 local dates in total.
- A4. Finishing or letting go of a project leaves its open tasks open and linked.
- A5. Deleting a project keeps its tasks and removes their project link.
- A6. Closed-tab stats are counts only, with no percentage success rate.
- A7. All text limits, the 20-slot cap, the 5–480 minute duration range, and the page sizes are proposed defaults.
- A9. The due-date shortcuts appear in both the Add task and the Edit task dialogs. The request named only Add task.
- A10. What each tab count includes (FIN-035): Today counts what is still to do (unmarked sessions plus due or overdue open tasks); Tasks counts Open tasks; Projects counts Active projects. Parked items are left out, because they are collapsed and not being worked on. The request said only "number of item".
- A11. Edit in the side panel (FIN-036) opens the existing Edit task dialog, rather than editing fields in the panel itself.
- A12. The open side panel is kept in the URL (for example a `task` search parameter on the current tab), so reload reopens it and Back closes it. The exact URL shape is the Architect's choice.
- A13. Reordering by drag and drop is available on the Tasks tab only (the Today tab was removed, decision 40). A project page shows its open tasks in the same order but without drag handles. The request said "in each section".
- A14. The quick due-date items (FIN-037) keep the due time, except that Today clears a due time that has already passed today. The request did not mention times.
- A15. Undo after a quick reschedule restores the date and time but not the previous position in the order.
- A16. Existing open tasks start in the order each section used before v4, so nothing looks shuffled on release.
- A17. The side panel threshold is the same 1024px as the rest of the layout (FIN-018). If the window becomes narrower, the panel closes instead of switching to the task page.
- A18. Pomodoros can be started only for Open tasks. The request did not say; a Parked task is set aside on purpose, and a closed one is finished.
- A19. Deleting a task keeps its completed Pomodoros in the day's count, without the task link (like A5 for projects).
- A20. A session that reaches 25 minutes while the app is closed still counts. Only Stop abandons a session; otherwise the count would depend on keeping a tab open.
- A21. The Week tab keeps the shown week (its Monday) and the Plan or Review view in the URL. The exact URL shape is the Architect's choice.
- A22. The Week tab has no count. Its board already shows a to-do count for each day, and a single number on the tab would not say what it means. Decision 14 was made before this tab existed.
- A23. *Confirmed by decision 36.* Done and Delegated tasks stay visible, muted, on their due day, with a Show done toggle that is on by default.
- A24. The Week tab has no manual reordering within a day. Timed items follow their times (decision 39), untimed tasks use the shared order (FIN-038), and manual reordering stays on the Tasks tab.
- A25. Tasks cannot be added to, dropped on, or moved to past days. Moving work into the past would make it overdue at once.
- A26. Moving a task to Unplanned clears its due time as well, because a time without a date is invalid (Fields and validation).
- A27. On phones, tasks move between days only with Move to day… (a bottom sheet). There is no cross-day dragging, because the day strip's targets are too small to drop on reliably.
- A28. *Superseded by decision 37.* The review stores a weekly note, but no ratings or scores.
- A29. A bulk move ("Move all to today", "Move all to next week") is limited on the server, for example to 200 tasks per request, to keep payloads bounded. The exact limit is the Architect's choice.
- A30. The weekly note is limited to 2000 characters of plain text, with no formatting.
- A31. Times stay in the 24-hour "10:00" format used elsewhere in the app, although the user wrote "10 AM". A 12-hour display would be a hub-wide setting.
- A32. The Set time… hour buttons run from 06:00 to 21:00; any other time uses the Other time field.
- A34. Show weekend is remembered per browser (a display preference, not personal data), and it shows the number of hidden weekend items. It is never forced on: a version that forced it on during the weekend made the toggle unusable then (user report, 2026-10-24).
- A33. With the Today tab gone, the "due for revisit" count (FIN-013) becomes a notice on the current week's Week tab, linking to the Parked groups.

## Open questions

- Q1. Account timezone and travel behavior: what happens to "today" and sessions when the user changes timezone? This affects A1.
- Q2. Should the week start on Monday (A2) or be configurable?
- Q3. Should the shell's Home page ever show a Today summary? Dashboards are not confirmed scope.
- Q4. Should a slot ever have an end date, or a "starting from" date in the future?
- Q5. Should rescheduling an overdue timed task to Today keep its time when that time is still later today? A14 keeps it; only a passed time is cleared. Does not block implementation.
- Q6–Q9 were answered on 2026-10-24 (decisions 36–39).
- Q10 (time order on the Today tab) no longer applies: the Today tab was removed (decision 40).

## Change notes

- **2026-10-26, v6.4.** Decision 42: Week board cards lose the drag handle and are dragged by the card; cards are one row (check-off, title, ⋯) at every width. Keyboard drag on the board is removed; Move to day… is the keyboard path (FIN-044). **Affects:** `week-cards.tsx`, `week-board.tsx`, `week-plan-context.ts`; no API or schema change.
- **2026-10-24, v6.3.** Decision 41 and A34: the weekend is hidden by default with a Show weekend toggle (FIN-043). **Affects:** `week-view.tsx` and `week-board.tsx`; no API or schema change. The Week page also now uses the full content width with less padding, as the design specified.
- **2026-10-24, v6.2.** Removed the **Today** tab (decision 40). Week is the first tab and the Finisher home.
  - FIN-031 is retired, with a table of where each part went.
  - Updated: FIN-001 (tab order, default, old URL opens Week), FIN-035 (no Today count), FIN-021, FIN-036, FIN-037, FIN-038 (drag reorder on the Tasks tab only), FIN-040 (no Today line), FIN-041, FIN-013 (revisit notice on the Week tab, A33), FIN-018, FIN-042, FIN-043, FIN-045, and FIN-048.
  - Decisions 9 and 26 are superseded; A13, A22 and A24 are reworded; Q10 is closed.
  - **Affects:**
    - the design (`week-planner.html` tabs; `task-list.html` and the app-shell still show a Today tab and need the same change when next revised);
    - the app: `src/app/router.tsx` (Finisher index route and a redirect from the old Today URL), the Finisher tabs, `views/today-view.tsx` (to be removed), and the Today count in `GET /api/finisher/basics`;
    - tests that cover the Today view and the Today count.
  - **Sequencing:** remove the Today tab in the same release that ships the Week tab, so Finisher always has a home view.
- **2026-10-24, v6.1.** The user answered Q6–Q9, recorded as decisions 36–39. Changes:
  - A23 is confirmed and A28 is superseded; A24 is reworded.
  - FIN-043 and FIN-045 list each day in time order (timed tasks and sessions together, then untimed).
  - FIN-047 adds **Pomodoros by day** and the **weekly note**.
  - New FIN-048 (Set time…, using the existing due time).
  - New field: Weekly note. New assumptions A30–A32, and new question Q10 (time order on the Today tab).
  - **Affects:**
    - the design (`week-planner.html`: ordering, Set time dialog, review sections);
    - architecture:
      - a new weekly-notes table, with RLS owner policies and a unique key on (user, week Monday);
      - a per-day Pomodoro count for a week in the user's timezone;
      - the week read's sort order;
    - tests:
      - ordering ties;
      - passed hours disabled on today;
      - note save, clear, and limit;
      - note ownership for owner, other user, and anonymous, through the API and the database;
      - Pomodoro day boundaries.
- **2026-10-24, v6.0.** Added the Week tab: FIN-042 (navigation), FIN-043 (board), FIN-044 (plan onto a day), FIN-045 (sessions on the board), FIN-046 (carry over), and FIN-047 (weekly review), with decisions 33–35, assumptions A21–A29, and questions Q6–Q9. FIN-001 lists the new tab after Today. FIN-018 and the scope gain Week tab notes. Decision 19 still applies to the Today and Tasks tabs. **No new task field:** the planned day is the due date. **Affects:**
  - the Finisher design (a new `week-planner.html`);
  - architecture:
    - a week read covering tasks by due-date range, Unplanned, carried-over tasks, tasks closed in the week, and sessions per day;
    - a bounded bulk due-date change with Undo;
    - review aggregates;
    - a decision on whether the existing drag library (ADR-0006) handles drops between columns;
    - URL state for the week and view;
  - `src/app/router.tsx`, the Finisher tabs, new Week views and components, `server/queries.ts`, and `server/mutations.ts`;
  - tests: week boundaries and timezones, moving to Unplanned clearing the time, refusing past days, bulk move with partial failure and Undo, and ownership for single and bulk moves (owner, other user, anonymous; API and database).
- **2026-10-23, v5.1.** Added FIN-041 (delegate a task) and decisions 29–31. The task lifecycle gains the Delegated status; FIN-030, FIN-031 and FIN-032 are updated. **Affects:**
  - the database (status and close-note constraints, the `delegate` action in `finisher_task_action`);
  - `POST /api/finisher/tasks/:id/actions` (`{ action: "delegate", delegatedTo }`) and `GET /api/finisher/closed` (`outcome=delegated`, `counts.tasksDelegated`);
  - the task menu, task page, side panel, Today's Done list and the Closed tab;
  - tests (validation, the API, and database lifecycle, ownership and constraints).
- **2026-10-20, v5.0.** Added FIN-039 (Pomodoro session on a task) and FIN-040 (Pomodoro summary), decisions 23–26, and assumptions A18–A20. FIN-018 notes the timer in the header on phones. The retired 10-minute timer (FIN-008) is not revived. **Affects:**
  - the Finisher design (the Pomodoro block in the panel and on the task page, the header pill, the Today line);
  - architecture (a new `finisher_pomodoros` table, start and stop functions, ADR-0007);
  - `GET /api/finisher/basics` and `GET /api/finisher/tasks/:id` (Pomodoro fields), with new start and stop routes;
  - the task panel, task page, Finisher header and Today view;
  - tests (ownership, one running session, completion and day boundaries).
- **2026-10-20, v4.1.** After the design review: decision 21 (drag handle, also on phones) added to FIN-038's interaction rules, and decision 22 (Today stays enabled for a task due today at a passed time) added to FIN-037. **Affects:** the FIN-037 menu logic and its tests.
- **2026-10-20, v4.0.** Three task enhancements (decisions 15–20, assumptions A11–A17):
  - **FIN-034 changed:** adds a **Tomorrow** shortcut between Today and Next week, in both Add and Edit.
  - **FIN-036 new:** on laptop, a task opens in a side panel next to the list; phones keep the task page. FIN-020 and FIN-018 are updated to match.
  - **FIN-037 new:** Today / Tomorrow / Next week in the ⋯ menu of Open tasks, saved at once, with Undo.
  - **FIN-038 new:** one user-defined order for open tasks, changed by drag and drop within a section, with Move up/down menu items as the non-drag alternative. **Behavior change:** FIN-022 (Overdue, Today, Upcoming, No date) and FIN-031 (Overdue, Due today) no longer sort by date and time.
  - **Affects:** Finisher design (side panel, drag handle and drop marker, quick menu items, three-button shortcut row); architecture (an order column on tasks with a migration that seeds the current order, a reorder endpoint, ordering in list queries and pagination, URL state for the panel); `task-row.tsx`, `task-form-dialog.tsx`, `task-group-list.tsx`, `views/today-view.tsx`, `views/tasks-view.tsx`, `views/task-view.tsx`, `src/app/router.tsx`, `server/queries.ts`, `server/mutations.ts`; tests for ordering, reorder authorization (owner, other user, anonymous, non-Open task), shortcuts, and the panel. RLS policies are reviewed so that the new column cannot be used to write to another user's task.
- **2026-10-13, v3.2.** Added FIN-035: counts on the Today, Tasks and Projects tabs (decision 14, assumption A10), matching the app-shell design. **Affects:** `finisher-tabs.tsx`, the Finisher header (`tabs-layout.tsx`), `GET /api/finisher/basics` (now returns `counts`), and tests. No schema or RLS change.
- **2026-10-12, v3.** Added FIN-034: Today and Next week shortcut buttons below the Due date field in the task form. Added assumption A9 and confirmed decision 11 ("Next week" = Monday of next week). No other requirement changes; FIN-019 validation applies unchanged. Also added the date display rule (business rules, decisions 12 and 13). **v3.1:** date fields now display "12 Oct 2026" instead of the browser's format, and the shortcut captions use "Monday 12 Oct". Affects the task form, the project form (Target date), and the Park dialog (Revisit on).
  - **Affects:** the Finisher design (task form dialog), `src/features/finisher/components/task-form-dialog.tsx`, and the task-form tests. No API, schema, or RLS change is expected.
- **2026-10-10, v2.** Finisher was redefined around Tasks, Projects, slots, and sessions, and it replaces Habit Tracker.
  - **Kept and reworded:** FIN-001 (navigation, now with tabs and Today), FIN-012 (Let go, now for tasks and projects), FIN-013 (Park, now for tasks and projects), FIN-016 (Delete), FIN-017 (permissions, extended to slots and sessions), FIN-018 (responsive layout and accessibility).
  - **Retired:** FIN-002 (create item), FIN-003 (edit item), FIN-004 (start and soft limit), FIN-005 (limit setting), FIN-006 (next step), FIN-007 (manual touch), FIN-008 (starter timer), FIN-009 (staleness), FIN-010 (finish item), FIN-011 (Finish → Event), FIN-014 (reopen item), FIN-015 (finished shelf).
  - **New:** FIN-019 to FIN-033.
  - **Affects:** the app-shell design (nav order Finisher → Events, Habit Tracker removed), CLAUDE.md, the project brief, and the role skills.
- 2026-10-09, v1. Initial brainstorm version.

## Handoff dependencies

- **Designer:** `output/designs/finisher/`, covering the Today, Tasks, Projects, and Closed tabs, project detail with the slot editor and the 7-day strip, the task and project forms, the Finish, Let go, Park, and Delete dialogs, and every state in each.
- **Technical Architect:** `docs/architecture/finisher.md`, covering:
  - Tables and RLS for tasks, projects, slots, and session marks.
  - How slot versions and project status history are kept so that FIN-025 and FIN-026 past rates stay stable.
  - Calculations for local dates, the marking window, and weekly rates.
  - Server enforcement of lifecycle transitions and the marking window.
  - Idempotent session marking.
- **Developer:** implement once the design and architecture are ready. Open questions Q1–Q5 do not block implementation, because the assumptions cover them.
- **v4 (FIN-034 Tomorrow, FIN-036, FIN-037, FIN-038):**
  - **Designer:** extend `output/designs/finisher/` with the Tomorrow button, the laptop list + side panel (loading, error, not-found, selected-row state), the quick due-date menu items (including the disabled "current" item), and drag handles with a drop marker plus the keyboard and Move up/down alternatives at 320px and 1024px+.
  - **Technical Architect:** add `docs/architecture/finisher.md` (or an ADR) for the order model (column type, how a move is saved, rebalancing if needed), seeding existing tasks (A16), the reorder endpoint's validation and ownership checks, the stable order for "Load more", and the panel's URL state.
  - **Tester:** FIN-034 Tomorrow on a Sunday and at midnight; FIN-037 per status (offered only on Open), time kept or cleared (A14), Undo, failure revert; FIN-038 order shared between the Today and Tasks tabs, bottom placement after create/reopen/unpark/date change, unchanged position after a time-only edit or a midnight rollover, filtered reorder, keyboard reorder announcements, and reorder denied for another user's task and for anonymous callers (API and direct database); FIN-036 open, switch, Escape, focus return, Back and reload, deletion while open, and resizing below 1024px.
- **v6 (FIN-042 to FIN-047, Week tab):**
  - **Designer:** `output/designs/finisher/week-planner.html`, covering:
    - the laptop board (Unplanned and seven days), the phone day strip, and the Move to day… dialog or sheet;
    - Carried over, the Review view, and drag feedback with unavailable days;
    - loading, empty, and error states.
  - **Technical Architect:**
    - the week query shape and its bounds;
    - a bulk due-date endpoint (validation, its limit A29, and partial failure);
    - whether `finisher_update_task` or a narrower due-date function serves single moves;
    - cross-column drag with the ADR-0006 library;
    - the closed-in-week query in the user's timezone.
  - **Tester:**
    - the week starting on Monday, ranges that cross a month or year, and the week rolling over at midnight;
    - Carried over shown in the current week only;
    - a time kept or cleared after a move (A26, as A14), and refusal of past-day drops (A25);
    - Undo for single and bulk moves, and bulk partial failure;
    - session marking on the board at the edges of the marking window;
    - review counts by closed time in the user's timezone;
    - FIN-017 for the bulk move.
  - **v6.1 additions:**
    - **Technical Architect:** the `finisher_weekly_notes` storage (or equivalent), with RLS, a 2000-character check, and an upsert or delete on an empty note; Pomodoro counts grouped by local end date for a week.
    - **Tester:** FIN-048 ordering (a session and a task at the same time; equal task times), the time kept when moving days, the weekly note across users, and Pomodoro counts at midnight.
- **Tester:**
  - Cover FIN-017 for an anonymous user, the owner, and a second user, both through the API and directly against the database.
  - Cover the lifecycle tables and the validation limits.
  - Cover marking-window edges (day 0, day 7, day 8, future dates).
  - Cover slot edits in the middle of a week, and park and unpark in the middle of a week.
  - Cover overdue checks at the day boundary, and timezone-sensitive dates.
