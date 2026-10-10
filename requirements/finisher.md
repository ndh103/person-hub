# Finisher: requirements

## Metadata

- Feature slug: `finisher`
- Status: `ready`
- Version: 2 (2026-10-10). This replaces version 1 (2026-10-09); see Change notes.
- Source: the user's requests on 2026-10-09 (brainstorm: "I want to become a finisher") and 2026-10-10 ("Habit Tracker will be replaced by Finisher… short tasks… bigger Projects with slots in my timetable… Finisher is the first menu item, Events next"), plus answers to clarifying questions.
- Related: [project brief](../docs/project-brief.md), [app shell design](../output/designs/app-shell/design-notes.md), security baseline in [CLAUDE.md](../CLAUDE.md#security-baseline). Finisher design (`output/designs/finisher/`), architecture (`docs/architecture/finisher.md`), and test report: not yet created.

## Goal and target user

The signed-in hub owner tends to start things and then put them off. Finisher helps them follow through on two kinds of work:

- **Tasks:** short, one-off things to get done, often by a date. Example: "Prepare the paperwork and submit the form on Monday".
- **Projects:** bigger goals that take weeks or months and need regular time. Example: "Teach my daughter English (phonics, numbers)". A project has weekly **slots**, for example Mon/Wed/Fri 30 min "Watch ABK program" and 30 min "Learn together". Each scheduled **session** is checked off, so the user can see whether they are keeping up week by week.

Finisher replaces the former Habit Tracker app. Recurring project sessions take over the role habits had.

Target user: the authenticated account owner, on phone and laptop browsers. All Finisher data is private to its owner.

## Scope

### In scope

- Tasks: create, edit, due date with optional time, optional link to a project, mark done, park, let go, reopen, delete.
- Projects: create, edit, a goal and a "Done when", optional target date, weekly slots, finish, park, let go, reopen, delete.
- Sessions: generated from slots for each local date; marked Done or Skipped for today and the previous 7 days.
- Weekly follow-through rate for each project.
- A **Today** view as the Finisher home, with tabs for Tasks, Projects, and Closed.
- Finisher as the first app in the shell navigation, with Events second.

### Out of scope

- Areas or life-area grouping (decided 2026-10-10: Projects and Tasks only).
- Streaks (decided: weekly rate only).
- Task checklists or sub-steps (decided: tasks stay simple).
- Active-item limit, Waiting room, next step, 10-minute timer, staleness indicator, Finish → Event (retired from v1).
- Recurring tasks, other than project slots.
- Reminders, notifications, calendar sync, email, push.
- Monthly or custom recurrence; slots repeat weekly only.
- Attachments, sharing, collaboration, data export, and Home-page summaries.

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

### FIN-031 Today view (Must)

The Today tab shows, in this order:

1. **Sessions today** from Active projects: timed slots first (sorted by start time), then untimed slots. Each session shows the activity, the project title, the duration, and the start time if set.
2. **Overdue tasks**: open tasks whose due moment has passed, oldest first.
3. **Due today**: open tasks due today, with timed tasks sorted by time first, then untimed tasks.
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

### FIN-020 View and edit a task (Must)

- The user can open a task to see its title, notes, due date and time, project link, status, and created, done, or closed dates.
- Open and Parked tasks can be edited, with FIN-019 validation. The user can remove the due date, the due time, or the project link.
- Done and Let go tasks are read-only, except for Reopen (FIN-030) and Delete (FIN-016).

### FIN-021 Mark a task done (Must)

- Given an Open or Parked task, when the user marks it done, then its status is Done and the completion time is recorded. It leaves the open lists and appears in Done today (Today tab) and in Closed.
- The user can undo right after completing a task (for example with a toast "Undo"), or later with Reopen (FIN-030).

### FIN-022 Tasks tab (Must)

- The tab lists Open tasks in groups: **Overdue**, **Today**, **Upcoming** (sorted by due date and time), and **No date** (newest first). A collapsed **Parked** group follows, sorted by revisit date. Tasks whose revisit date has arrived are labelled "Due for revisit".
- Each task shows its title, due date or time (relative wording such as "Mon" or "Tomorrow 09:00" is allowed, with the full date available to assistive technology), and the project title if it is linked.
- The user can filter by project: All, a specific project, or No project.
- Each group loads at most 50 tasks at a time and offers "Load more".
- Empty state: "No open tasks", with an Add task action.

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

- Phone (< 1024px): single column. The tabs are a horizontally fitted segment control, or a select if they do not fit at 320px. There is no horizontal page overflow at 320px. Check-off targets are at least 44px. Secondary actions (Skip, Park, Let go, Delete) sit in a per-item menu.
- Laptop (≥ 1024px): the Today view may show sessions and tasks side by side. Project detail may show the slots and weekly rates beside the task list.
- Check-off controls are real buttons or checkboxes, with labels that include the item, such as "Mark 'Watch ABK program' done". They announce their pressed or checked state.
- Every action can be done with the keyboard, with visible focus. Dialogs trap focus and return it to the element that opened them. Form errors are linked to their fields and announced. Status changes are announced politely.

## Business rules

- **Timezone:** session dates, task due dates, "today", overdue checks, the marking window, weeks, and revisit dates use the user's timezone (assumption A1). Created, done, and closed times are stored as UTC instants. A due date, revisit date, target date, or session date is a date-only value, not a timestamp. A due time is a local wall-clock time together with its due date.
- **Overdue:** a task with a date but no time is overdue once that local date has ended. A task with a date and time is overdue once that local date and time has passed.
- **Recurrence:** slots repeat weekly only, on the selected days. There are no exception dates (skipping a single date is done by marking it Skipped).
- **No automation:** nothing changes status, marks a session, or sends a notification without a user action.

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

## Assumptions (reversible proposed defaults)

- A1. The user's timezone is the browser's IANA timezone, until the hub defines an account timezone.
- A2. Weeks run Monday to Sunday.
- A3. The marking window is today plus the 7 previous dates, which is 8 local dates in total.
- A4. Finishing or letting go of a project leaves its open tasks open and linked.
- A5. Deleting a project keeps its tasks and removes their project link.
- A6. Closed-tab stats are counts only, with no percentage success rate.
- A7. All text limits, the 20-slot cap, the 5–480 minute duration range, and the page sizes are proposed defaults.

## Open questions

- Q1. Account timezone and travel behavior: what happens to "today" and sessions when the user changes timezone? This affects A1.
- Q2. Should the week start on Monday (A2) or be configurable?
- Q3. Should the shell's Home page ever show a Today summary? Dashboards are not confirmed scope.
- Q4. Should a slot ever have an end date, or a "starting from" date in the future?

## Change notes

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
- **Developer:** implement once the design and architecture are ready. Open questions Q1–Q4 do not block the MVP, because the assumptions cover them.
- **Tester:**
  - Cover FIN-017 for an anonymous user, the owner, and a second user, both through the API and directly against the database.
  - Cover the lifecycle tables and the validation limits.
  - Cover marking-window edges (day 0, day 7, day 8, future dates).
  - Cover slot edits in the middle of a week, and park and unpark in the middle of a week.
  - Cover overdue checks at the day boundary, and timezone-sensitive dates.
