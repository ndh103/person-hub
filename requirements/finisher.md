# Finisher: requirements

## Metadata

- Feature slug: `finisher`
- Status: `ready`
- Version: 5.0 (2026-10-20). Adds FIN-039 (Pomodoro session on a task) and FIN-040 (Pomodoro summary), decisions 23–26. v4.1 (same day) recorded design-review decisions 21–22; v4.0 added FIN-036 (task side panel on laptop), FIN-037 (quick due-date menu), FIN-038 (drag-and-drop task order), and a Tomorrow shortcut in FIN-034, and changes the task sort rules in FIN-022 and FIN-031. Builds on v3.2 (2026-10-13, tab counts); see Change notes.
- Source: the user's requests on 2026-10-09 (brainstorm: "I want to become a finisher") 2026-10-10 ("Habit Tracker will be replaced by Finisher… short tasks… bigger Projects with slots in my timetable… Finisher is the first menu item, Events next"), 2026-10-12 ("in the add new task dialog, under Due date, I want to quick assign the Due Date to Today, or Next Week"), and 2026-10-20 ("for web version, i don't need to open a task detail in a separate page… a quick menu item to quickly assign a task to: Today, Tomorrow, and Next Week… the Tomorrow button (next to Today button)… drag and drop to rearrange the order of tasks in each section"), plus answers to clarifying questions.
- Related: [project brief](../docs/project-brief.md), [app shell design](../output/designs/app-shell/design-notes.md), security baseline in [CLAUDE.md](../CLAUDE.md#security-baseline). Finisher design: [task form with due-date shortcuts, and the Tasks list with side panel, drag order and quick due-date menu](../output/designs/finisher/design-notes.md) (`index.html`, `task-list.html`; other screens not yet designed). Architecture: [docs/architecture/finisher.md](../docs/architecture/finisher.md) (v4 task enhancements and v5 Pomodoro; ADR-0005 order keys, ADR-0006 drag library, ADR-0007 Pomodoro sessions). Test report: not yet created.

## Goal and target user

The signed-in hub owner tends to start things and then put them off. Finisher helps them follow through on two kinds of work:

- **Tasks:** short, one-off things to get done, often by a date. Example: "Prepare the paperwork and submit the form on Monday".
- **Projects:** bigger goals that take weeks or months and need regular time. Example: "Teach my daughter English (phonics, numbers)". A project has weekly **slots**, for example Mon/Wed/Fri 30 min "Watch ABK program" and 30 min "Learn together". Each scheduled **session** is checked off, so the user can see whether they are keeping up week by week.

Finisher replaces the former Habit Tracker app. Recurring project sessions take over the role habits had.

Target user: the authenticated account owner, on phone and laptop browsers. All Finisher data is private to its owner.

## Scope

### In scope

- Tasks: create, edit, due date with optional time (with Today, Tomorrow, and Next week shortcuts), optional link to a project, mark done, park, let go, reopen, delete.
- Task details in a side panel next to the list on laptop (FIN-036); quick rescheduling to Today, Tomorrow, or Next week from a task's menu (FIN-037); the user's own order of open tasks, changed by drag and drop (FIN-038).
- Pomodoro focus sessions of 25 minutes started from a task's details (FIN-039), and counts of completed sessions today and per task (FIN-040).
- Projects: create, edit, a goal and a "Done when", optional target date, weekly slots, finish, park, let go, reopen, delete.
- Sessions: generated from slots for each local date; marked Done or Skipped for today and the previous 7 days.
- Weekly follow-through rate for each project.
- A **Today** view as the Finisher home, with tabs for Tasks, Projects, and Closed.
- Finisher as the first app in the shell navigation, with Events second.

### Out of scope

- Areas or life-area grouping (decided 2026-10-10: Projects and Tasks only).
- Streaks (decided: weekly rate only).
- Task checklists or sub-steps (decided: tasks stay simple).
- Active-item limit, Waiting room, next step, 10-minute timer, staleness indicator, Finish → Event (retired from v1). The Pomodoro (FIN-039) is new scope from 2026-10-20, not a return of the retired 10-minute timer.
- For Pomodoros: breaks and long breaks, pause, lengths other than 25 minutes, browser or push notifications, and history or charts beyond today and per-task totals.
- Recurring tasks, other than project slots.
- Reminders, notifications, calendar sync, email, push.
- Monthly or custom recurrence; slots repeat weekly only.
- Attachments, sharing, collaboration, data export, and Home-page summaries.
- Dragging a task into a different section to change its date (decision 19), dragging projects, sessions, or Parked and closed tasks, and a task side panel on phones (decision 17).

## Concepts

| Term | Meaning |
| --- | --- |
| Task | A single thing to do. Statuses: Open, Parked, Done, Let go. |
| Project | A longer goal. Statuses: Active, Parked, Finished, Let go. |
| Slot | A weekly recurring time block in a project: an activity name, days of the week, a duration, and an optional start time. |
| Session | One slot on one local date when the project is Active. States: Done, Skipped, Unmarked, and Missed (Unmarked once the 7-day marking window has passed). |
| Marking window | Today and the 7 previous local dates. |
| Week | Monday to Sunday in the user's timezone (assumption A2). |

## Lifecycles

**Task**

| From \ Action | Mark done | Park | Unpark | Let go | Reopen | Delete |
| --- | --- | --- | --- | --- | --- | --- |
| Open | → Done | → Parked | – | → Let go | – | yes |
| Parked | → Done | change date | → Open | → Let go | – | yes |
| Done | – | – | – | – | → Open | yes |
| Let go | – | – | – | – | → Open | yes |

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
| Let go | Reason | Yes | 1–500 characters |
| Finish | Reflection | No | ≤ 1000 characters |

## Requirements

### FIN-001 Navigation and Finisher tabs (Must)

Finisher is the **first** app in the shell's Apps group, followed by Events. It has its own route. Inside Finisher, tabs lead to **Today** (the default), **Tasks**, **Projects**, and **Closed**.

- Given a signed-in user, when they select Finisher in the sidebar or the phone drawer, then the Today tab opens. The nav item is marked current, the page title is "Finisher · Personal Hub", and focus moves to the page heading (SHELL-003).
- Each tab has its own URL, so a reload or a shared link reopens the same tab.
- Each tab has loading (skeleton), empty, and error states. The error state offers Retry. An error never shows partial data that belongs to another account.

### FIN-035 Tab counts (Must)

The Today, Tasks and Projects tabs each show a count of their items next to the label, as a small muted pill (app-shell design). The Closed tab has no count (decision 14).

- **Today:** what is still to do today: unmarked sessions today from Active projects, plus Open tasks that are due today or overdue (A10). Done and Skipped sessions, Done tasks, and Parked tasks are not counted.
- **Tasks:** Open tasks. Parked tasks are not counted (A10).
- **Projects:** Active projects. Parked projects are not counted (A10).
- The counts appear on every Finisher page, update after any change without a reload, and are left out (not shown as 0) while loading or if loading fails.
- Each count is read with its tab by assistive technology, for example "Tasks (12 open)", "Today (5 to do)", "Projects (3 active)". The current tab is still marked by weight and an underline, not by the colour of its pill.
- There is no horizontal page overflow at 320px; the tab row scrolls inside itself if needed (FIN-018).

### FIN-031 Today view (Must)

The Today tab shows, in this order:

1. **Sessions today** from Active projects: timed slots first (sorted by start time), then untimed slots. Each session shows the activity, the project title, the duration, and the start time if set.
2. **Overdue tasks**: open tasks whose due moment has passed, in the user's task order (FIN-038).
3. **Due today**: open tasks due today, in the user's task order (FIN-038). A due time is still shown on each task but no longer decides its position (decision 18).
4. **Done today**: sessions marked Done today and tasks completed today, collapsed by default, so items do not vanish when checked off.

- Given an unmarked session today, when the user taps its check-off control, then it becomes Done immediately (an optimistic update that is reverted with an error message if saving fails). A secondary action marks it Skipped. Tapping a Done or Skipped session again returns it to Unmarked.
- Given an open task in Today, when the user checks it off, then it becomes Done (FIN-021).
- A summary line shows "N of M sessions done today" and the count of overdue tasks.
- Parked tasks and open tasks without a due date do not appear in Today.
- Empty state, when there are no sessions and no tasks due or overdue: a message such as "Nothing scheduled today", with actions to add a task or a project.

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
- The menu is offered wherever an Open task has a ⋯ menu: the Today tab, the Tasks tab, the open tasks on a project page, the task page, and the side panel (FIN-036).
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

- Applies to every task list in Finisher: the Today tab, the Tasks tab (including Parked), the open tasks on a project page, and task entries in the Closed tab.
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

- Given an Open or Parked task, when the user marks it done, then its status is Done and the completion time is recorded. It leaves the open lists and appears in Done today (Today tab) and in Closed.
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

- Draggable sections: on the Today tab, **Overdue** and **Due today**; on the Tasks tab, **Overdue**, **Today**, **Upcoming**, and **No date**.
- Not draggable: sessions, Done today, the Parked group (still sorted by revisit date), the Closed tab, and projects. The open tasks on a project page are shown in the same order but cannot be dragged there (assumption A13).
- A task can be moved only within its own section. Dropping it in another section, or outside any section, cancels the drag and the task returns to its place. Dragging never changes a due date; rescheduling uses FIN-037 or Edit.

**One order for all views**

- Each user has one order for their open tasks. Every section shows its tasks in that order, so a reorder in the Tasks tab's Today group is also seen in the Today tab's Due today section, and the reverse.
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
- Given no session is running, when the user chooses Start, then a session starts at once. The start time is set by the server, and the block shows the running state. A polite announcement says "Pomodoro started for 'title'. 25 minutes."
- **One at a time.** Only one session runs at a time for the user, across all tasks and devices. Given a session is running for task X, the details of another task Y offer **Switch to this task** instead of Start. It asks "Stop the Pomodoro for 'X' and start one for 'Y'? The stopped session won't count." Confirming stops X (not counted) and starts Y in one step.

**Running**

- The block shows the time left as mm:ss, counting down, with a progress bar and the task title. The countdown is worked out from the server's start time, so it is the same after a reload, after navigating away, and on another device.
- **Stop** asks "Stop this Pomodoro? It won't be counted." Confirming abandons the session (decision 24). There is no pause.

**Completing**

- When 25 minutes have passed without Stop, the session is **completed** and counts (FIN-040). This holds even if the app was closed at that moment: only Stop abandons a session (A20). Nothing else changes, and the task's status is untouched.
- If the app is open in the browser at that moment, on any Finisher page, then:
  - a message says "Pomodoro complete: 'title'", with a **Mark task done** action (FIN-021) when the task is still Open or Parked;
  - a short chime plays (decision 25). Browsers may block sound after a reload until the user clicks something; the message still shows.
  - The counts update without a reload.
- There are no browser or push notifications (decision 25; brief).

**Permissions and failure**

- Only the owner can start or stop sessions for their own tasks (FIN-017). Another user's task or session behaves as if it does not exist.
- If starting or stopping fails, an error message appears and the block shows the server's state. If Stop arrives after the 25 minutes have passed, the session counts as completed, and the message says so.

**Accessibility**

- The countdown has the timer role. It is not announced every second; the start, stop, and completion are announced politely.
- Start, Stop, and Switch are real buttons at least 44px tall. Dialogs follow FIN-018. The progress bar is not the only cue: the time left is always shown as text.

### FIN-040 Pomodoro summary (Must)

Completed sessions are counted (decision 26):

- **Today tab:** the summary line adds "N Pomodoros today · M min", for example "3 Pomodoros today · 75 min", or "No Pomodoros yet today".
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

### FIN-013 Park and revisit (Must)

- An Open task or an Active project can be parked with a revisit date. Parking an item that is already parked changes its revisit date.
- A parked project schedules no sessions (FIN-026). A parked task does not appear in Today.
- When today is on or after the revisit date, the item is labelled "Due for revisit" in its Parked group. The Today tab shows a count of items due for revisit, which links to them. Nothing changes status automatically.
- Unpark returns a task to Open and a project to Active.

### FIN-030 Reopen (Should)

- A Done or Let go task can be reopened to Open. A Finished or Let go project can be reopened to Active, after confirmation. Reopening clears the closed time and the reason or reflection on the item. Past session records and rates are kept.

### FIN-032 Closed tab (Must)

- The tab lists closed tasks and projects, most recently closed first. It has filters for type (Tasks, Projects) and outcome (Done or Finished, Let go).
- Each entry shows its title, type, outcome, and closed date. Projects also show their duration from start to close in calendar days and their overall session count (Done of scheduled). Entries show a reflection or reason when one exists.
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
- Laptop (≥ 1024px): the Today view may show sessions and tasks side by side. Project detail may show the slots and weekly rates beside the task list. Selecting a task opens the side panel (FIN-036).
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
9. Finisher opens on the Today view.
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
25. When a session ends, the open app shows a message and plays a short chime. There are no browser notifications.
26. Completed sessions are summarised on the Today tab, in the Finisher header, and per task in its details (today and total).

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
- A13. Drag and drop is available on the Today and Tasks tabs only. A project page shows its open tasks in the same order but without drag handles. The request said "in each section".
- A14. The quick due-date items (FIN-037) keep the due time, except that Today clears a due time that has already passed today. The request did not mention times.
- A15. Undo after a quick reschedule restores the date and time but not the previous position in the order.
- A16. Existing open tasks start in the order each section used before v4, so nothing looks shuffled on release.
- A17. The side panel threshold is the same 1024px as the rest of the layout (FIN-018). If the window becomes narrower, the panel closes instead of switching to the task page.
- A18. Pomodoros can be started only for Open tasks. The request did not say; a Parked task is set aside on purpose, and a closed one is finished.
- A19. Deleting a task keeps its completed Pomodoros in the day's count, without the task link (like A5 for projects).
- A20. A session that reaches 25 minutes while the app is closed still counts. Only Stop abandons a session; otherwise the count would depend on keeping a tab open.

## Open questions

- Q1. Account timezone and travel behavior: what happens to "today" and sessions when the user changes timezone? This affects A1.
- Q2. Should the week start on Monday (A2) or be configurable?
- Q3. Should the shell's Home page ever show a Today summary? Dashboards are not confirmed scope.
- Q4. Should a slot ever have an end date, or a "starting from" date in the future?
- Q5. Should rescheduling an overdue timed task to Today keep its time when that time is still later today? A14 keeps it; only a passed time is cleared. Does not block implementation.

## Change notes

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
- **Tester:**
  - Cover FIN-017 for an anonymous user, the owner, and a second user, both through the API and directly against the database.
  - Cover the lifecycle tables and the validation limits.
  - Cover marking-window edges (day 0, day 7, day 8, future dates).
  - Cover slot edits in the middle of a week, and park and unpark in the middle of a week.
  - Cover overdue checks at the day boundary, and timezone-sensitive dates.
