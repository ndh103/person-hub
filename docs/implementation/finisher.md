# Finisher and app shell: implementation notes

- Feature slugs: `finisher`, `app-shell`
- Status: `ready` for Tester. Not run against a real Supabase project (see "Not verified").
- Date: 2026-10-11
- Inputs:
  - [requirements/finisher.md](../../requirements/finisher.md) v2 (FIN-001 to FIN-033)
  - [App shell design](../../output/designs/app-shell/design-notes.md) and its `index.html`
  - [Foundation theme](../../output/designs/_foundation/theme.css)
  - [ADR-0001](../architecture/decisions/ADR-0001-supabase-auth-ssr.md)
  - [Auth implementation](auth.md)
- Decisions made here: [ADR-0002: Finisher writes go through database functions](../architecture/decisions/ADR-0002-finisher-rpc-writes.md) (proposed)

> **Superseded in part (2026-10-11).** The app moved from Next.js to a React SPA plus a Hono API on Cloudflare Workers ([ADR-0003](../architecture/decisions/ADR-0003-spa-and-worker-api.md)). Pages now load through `GET /api/finisher/*` with TanStack Query instead of Server Components, the timezone travels in the `X-Time-Zone` header instead of the `ph-tz` cookie, and the Load-more paths changed. The current mechanics, checks and setup are in [platform.md](platform.md). The checks recorded below were run against the Next.js version.

## Change 2026-10-13: FIN-035 tab counts and the header date line

Inputs: [requirements/finisher.md](../../requirements/finisher.md) v3.2 (FIN-035, decision 14, assumption A10) and the [app-shell design](../../output/designs/app-shell/design-notes.md) (underline tabs with muted count pills; "Today · date" line under the title).

- **Changes:**
  - `GET /api/finisher/basics` now also returns `counts: { today, tasks, projects }` (`getFinisherBasics` in `server/queries.ts`). Today counts unmarked sessions today (the same schedule logic as the Today view) plus open tasks due today or overdue; Tasks counts open tasks; Projects counts active projects. Two `count: "exact", head: true` queries, so no task rows are transferred.
  - `finisher-tabs.tsx` shows each count in a mono pill (`bg-muted`, `bg-secondary` on the active tab), with screen-reader text such as "(12 open)". Closed has none. Counts are hidden until loaded.
  - The Finisher header (`tabs-layout.tsx`) shows the mono "Today · 13 Oct 2026" line from the design on every tab, replacing the description sentence. The Today view no longer repeats that line.
  - Counts refresh with the other Finisher views after every write (all reads share the `["finisher"]` key).
- **Checks (2026-10-13):** `npm run typecheck` passes; `npm run lint` 0 errors (only the existing fast-refresh warnings); `npm test` 186 passed, including `tests/unit/finisher-tab-counts.test.ts` (done, skipped and other-weekday sessions excluded; parked projects excluded); `npm run build` passes with the existing chunk-size warning.
- **Not done:** no browser run (signing in needs the live project). Tester: check the pills at 320px, in dark mode, and that they change after marking a session or completing a task.

## Change 2026-10-12: FIN-034 due-date shortcuts

Inputs: [requirements/finisher.md](../../requirements/finisher.md) v3 (FIN-034, decision 11, assumption A9) and the [task form design](../../output/designs/finisher/design-notes.md).

- **Changes:**
  - `task-form-dialog.tsx` adds **Today** and **Next week** buttons under the Due date input, in both the Add and Edit dialogs (A9). Each button shows the date it will set, for example "19 Oct 2026".
  - Its accessible name includes the full date ("Set due date to next week, Monday 19 October 2026").
  - A tap sets only `dueDate`, does not submit, and clears a `dueDate` error and a `dueTime` "needs a date" error. A polite status announces the new date.
- **"Today"** is read from the browser's timezone when the button is pressed, which covers the midnight rule. The captions use the page's `today`.
- **Domain:** `startOfNextWeek()` in `domain/dates.ts`, the Monday after `startOfWeek()`. `browserTimeZone()` in `api.ts` is now exported.
- **Unchanged:** no API, schema, RLS or validation change. The server sees an ordinary due date.
- **Deviations from the design reference:**
  - The buttons use the existing `Button variant="outline"`, which has a `muted` hover, instead of the reference's `accent` hover, to stay consistent with other outline buttons.
  - The 700ms field highlight after a tap was not built. The field's new value and the live announcement provide the feedback.
- **Checks (2026-10-12):**
  - `npm run lint`: 0 errors, 5 earlier fast-refresh warnings in other files.
  - `npm run typecheck`: passes.
  - `npm test`: 132 passed, including new `startOfNextWeek` cases for Monday, Wednesday, Sunday, month end and year end.
  - `vite build`: passes (an existing chunk-size warning).
  - Not done: no browser run of the dialog and no component test (React Testing Library is not installed).
- **Tester:**
  - Tap each shortcut with a typed date and with a time set.
  - On a Sunday, Next week should be tomorrow.
  - Submit the form and check the saved due date.
  - Check the layout at 320 px (two buttons side by side, at least 44 px tall).
  - Check keyboard order: date → Today → Next week → time.
  - Check the screen-reader announcement.

## Change 2026-10-12: one date display format

- **Format.** All Finisher dates now display as "12 Oct 2026", through `formatDate()` in `domain/dates.ts`. This applies to visible text and screen-reader text (decision 12). It replaces `formatFullDate` ("Friday, 9 October 2026") and `formatShortDate` ("Mon 12 Oct").
- **Relative words.** `formatRelativeDate` still says Today, Tomorrow or Yesterday, and otherwise falls back to `formatDate`. The screen-reader date suffix is now added only when the visible text is one of those relative words.
- **Unchanged:**
  - The 7-day session strip keeps its compact "Mon 12" cell labels; each cell's screen-reader text uses `formatDate`.
  - Slot weekday chips are unchanged.
  - Native `<input type="date">` fields still show the browser's locale format.
- **Checks:**
  - lint: 0 errors.
  - typecheck: passes.
  - `npm test`: 132 passed.
  - build: passes.
  - No browser run.

## Change 2026-10-12: date fields and shortcut captions (requirements v3.1)

- **Date fields.** A new `components/date-picker.tsx` uses shadcn `Popover` + `Calendar` (react-day-picker). It replaces `<input type="date">` in:
  - the task form (Due date, clearable);
  - the project form (Target date, clearable, from today);
  - the Park dialog (Revisit on, from tomorrow up to 365 days).

  The trigger shows "12 Oct 2026" or "Pick a date", weeks start on Monday, and out-of-range days are disabled. The trigger's accessible name includes its value ("Due date: 12 Oct 2026"). Day cells are 40px, so the calendar fits a 320px screen.
- **Shortcut captions.** The captions and accessible names use the new `formatWeekdayDate()` ("Monday 12 Oct"). The announcement after a tap still uses `formatDate()`.
- **Layout.** Due date and Due time are now stacked. Below 360px the two shortcuts stack too, each on one line.
- **Dependencies.** `npx shadcn add calendar popover` added `react-day-picker` and `date-fns`. The CLI also overwrote `ui/button.tsx`, which was **restored** to keep the foundation's `primary-hover` and link colours.
- **Checks:**
  - lint: 0 errors.
  - typecheck: passes.
  - `npm test`: 133 passed.
  - build: passes, with the existing chunk-size warning; the main chunk is about 1.09 MB.
  - **No browser run:** the popover inside the dialog, focus return, keyboard navigation in the calendar, and 320px fit are untested.
- **Tester:**
  - Open each of the three date fields and pick a date with the mouse and with the keyboard (arrows, Enter, Escape).
  - Check that out-of-range days are disabled.
  - Use Clear date on Due date and Target date.
  - With a screen reader, check that the field announces its value.

## Change 2026-10-12: foundation fonts (Space Grotesk + JetBrains Mono)

Input: [foundation typography](../../output/designs/_foundation/design-system.md#typography), revised 2026-10-12.

- **Fonts.** `@fontsource-variable/inter` was replaced by `@fontsource-variable/space-grotesk` and `@fontsource-variable/jetbrains-mono`.
  - Both are imported in `src/main.tsx` and self-hosted, so CSP `font-src 'self'` is unchanged.
  - `globals.css` maps `--font-sans` and `--font-heading` to Space Grotesk and `--font-mono` to JetBrains Mono, keeping the system fallbacks.
- **Page titles.** `text-2xl font-bold tracking-tight lg:text-3xl` (was `font-semibold`) on the app pages, Finisher pages, and the task and project views. The auth card titles are unchanged.
- **Mono accents.** These use `font-mono text-[0.8125rem]`, for short read-only meta only:
  - the sidebar "Apps" label;
  - the Today date line and summary line;
  - session meta (project · duration · time) and task meta (due, revisit, project);
  - the Projects tab rate details and revisit line;
  - the Closed list meta line.

  Form fields, buttons (including the FIN-034 shortcut captions), date-field values, and paragraphs stay in Space Grotesk, as the foundation rule requires.
- **Checks:**
  - lint: 0 errors.
  - typecheck: passes.
  - `npm test`: 133 passed.
  - build: passes and emits the Space Grotesk and JetBrains Mono `woff2` subsets.
  - **No browser run:** text wrapping at 320 px with the wider fonts (Space Grotesk, and mono meta lines) is unchecked.

## Change 2026-10-13: Claude design system and reference orange

Inputs: [foundation](../../output/designs/_foundation/design-system.md) and [theme.css](../../output/designs/_foundation/theme.css), revised 2026-10-13; [app-shell design notes](../../output/designs/app-shell/design-notes.md#change-2026-10-13-claude-design-system-and-reference-orange). This change is shell-wide; it is recorded here because it restyles the Finisher pages.

- **Tokens.** `src/app/globals.css` now mirrors the new `theme.css`:
  - primary and light sidebar orange `#D4724F` with white text; hover and active pill `#C96442`;
  - parchment page `#F5F4ED`, ivory cards `#FAF9F5`; dark `#141413` / `#30302E`;
  - focus ring terracotta, not the Claude system's blue (which fails 3:1);
  - `--radius` `0.5rem`. The `@theme` radius scale now follows the foundation (4 / 6 / 8 / 12 / 16 px for `sm` to `2xl`), replacing shadcn's multipliers;
  - new `--elev-ring` and `--elev-raised` (utilities `shadow-elev-ring`, `shadow-elev-raised`) and the `ease-standard` easing;
  - body line height 1.6.
- **Fonts.** `@fontsource-variable/space-grotesk` was replaced by `@fontsource-variable/inter` (body and UI) and `@fontsource-variable/source-serif-4` (`opsz.css`, for headings). JetBrains Mono is unchanged. All are self-hosted, so CSP `font-src 'self'` is unchanged.
  - `--font-heading` maps to Source Serif 4. The shadcn titles that already used `font-heading font-medium` (Dialog, AlertDialog, Card, Sheet, Empty) became serif with no other change.
- **Headings.** Page titles: `font-heading text-3xl font-medium lg:text-4xl`. Auth card titles: `font-heading text-2xl font-medium`. Section headings (`ListSection`, `CollapsibleSection`): `font-heading text-xl font-medium`; the collapsible count stays small sans. Dialog titles: `text-xl`. The brand name and phone top-bar title are serif. Serif is never bold.
- **Shapes.** Dialogs and cards are `rounded-2xl`. Inputs, textareas and select triggers are `rounded-xl`; select popups (shadcn `Select`, Base UI) are `rounded-xl` with `rounded-lg` items. Native `<select>` is not used because its option list is drawn by the OS and cannot be styled. Row lists, slot cards, dashed placeholders and Home app cards are `rounded-2xl` with a border and no drop shadow. The laptop content card uses `shadow-elev-raised`. The outline button is ivory (`bg-card`) with `shadow-elev-ring` and an accent hover.
- **Finisher tabs** (`finisher-tabs.tsx`) are now underline tabs: muted text; the current tab gets foreground text, medium weight and a 2px foreground underline. The row scrolls inside itself if it ever overflows.
  - **Not implemented: the tab count pills** shown in the design reference. The designer flagged that what each count means needs a BA decision, and counts would need data from the API.
- **Home** gets the mono "Personal Hub · Home" eyebrow (rust, `text-accent-foreground`).
- **Checks:**
  - lint: exit 0. The `react-refresh/only-export-components` warnings in untouched files are unchanged, and lint also exits 0 on the previous commit.
  - typecheck: passes.
  - `npm test`: 6 files, 133 passed.
  - build: passes and emits the Inter and Source Serif 4 `woff2` subsets.
  - Browser: headless Edge screenshot of the production build (`vite preview`) at `/sign-in`, 1280 px. It shows the orange frame, serif title and brand, Inter body text, 12px fields, an ivory card and the orange button with white text.
  - **Not checked in a browser:** the signed-in pages (sidebar, Today, Tasks, Projects, dialogs), the phone width, and dark mode, because they need a signed-in session. The app's security headers also block iframe rendering, which was used to emulate phone width. Next manual check: sign in, then compare the sidebar, Finisher tabs, lists and the task dialog at 320 px, 390 px and 1280 px, in light and dark, against `output/designs/app-shell/` and `output/designs/finisher/`.

## Handoff gaps

- **No Finisher design (`output/designs/finisher/`).** Layouts follow the app-shell reference (its Finisher Today preview, tokens, 44px targets, card lists) and the layout rules in FIN-018. Replace or adjust them when the Designer delivers the Finisher reference.
- **No Finisher architecture (`docs/architecture/finisher.md`).** The requirements hand the TA these questions:
  - the tables;
  - the slot and status history;
  - the date calculations;
  - transition enforcement;
  - idempotent marking.

  I answered them in ADR-0002 and in "Data model" below so that implementation could proceed. The TA should review them.

## Requirement coverage

| ID | Where |
| --- | --- |
| FIN-001 | `components/shell/apps.ts` (Finisher first, then Events); `app/(app)/finisher/(tabs)/` with one URL per tab; `finisher-tabs.tsx`; loading skeletons in every page; `error.tsx` with Retry; title "Finisher · Personal Hub"; focus on the heading after navigation (`route-focus.tsx`) |
| FIN-031 | `views/today-view.tsx`, `getToday()`: sessions (timed first), overdue, due today, collapsed "Done today"; optimistic session check-off that reverts on failure (`session-control.tsx`); Skip in the item menu; summary line; revisit-due count with link; empty state |
| FIN-019, 020 | `task-form-dialog.tsx` (create and edit, the project is preselected on a project page, values are kept on error, the submit button is disabled while pending); `views/task-view.tsx` |
| FIN-021 | `TaskCheck` in `task-row.tsx` (optimistic, toast with Undo → reopen) |
| FIN-022 | `views/tasks-view.tsx`, `task-group-list.tsx`: Overdue / Today / Upcoming / No date, then a collapsed Parked group with "Due for revisit"; project filter in `?project=`; 50 per group with "Load more" (`GET /api/finisher/tasks`) |
| FIN-023, 024 | `project-form.tsx` (new with slots, edit), `views/project-view.tsx`, `project-actions.tsx` |
| FIN-025 | `slot-list.tsx`, `slot-fields.tsx`; versioned slots, where changes apply from today (`finisher_update_slot`, `finisher_remove_slot`); removal is confirmed |
| FIN-026 | `finisher_private.is_scheduled` (database) and `domain/schedule.ts` `listSessions` (reads) |
| FIN-027 | `finisher_mark_session` (window, schedule and idempotent upsert); 7-day strip `StripCell` |
| FIN-028 | `summarizeWeek`, `formatWeekRate`, `formatWeekDetails`: the current week and 4 previous weeks; "No sessions scheduled"; counts as text |
| FIN-033 | `views/projects-view.tsx` |
| FIN-029, 012, 013, 030, 016 | `lifecycle-dialogs.tsx` (Finish with Done when and the open-task count, Let go with a reason, Park and change date, Reopen with confirmation, Delete naming the item); database lifecycle in `finisher_task_action` and `finisher_project_action` |
| FIN-032 | `views/closed-view.tsx`, `closed-list.tsx`: type and outcome filters, counts with no percentage, 20 per page with "Load more" (`GET /api/finisher/closed`), duration and sessions for projects, reason or reflection |
| FIN-017 | See "Security controls" |
| FIN-018 | Single column below `lg`, two columns at `lg`; tabs fit at 320px; 44px targets; secondary actions in menus; real buttons with `aria-pressed` and item names; labelled fields with linked errors (`form-field.tsx`), focus moved to the first invalid field |
| SHELL-001 to 004 | `components/shell/*`, `app/(app)/layout.tsx`, `home/page.tsx`, and an `events/page.tsx` placeholder ("Coming soon") so the nav item is not a 404 |

## Data model (`supabase/migrations/20261011120000_finisher.sql`)

| Table | Purpose |
| --- | --- |
| `finisher_projects` | Status, revisit date, `close_note` (reflection or reason), `started_on` (local date), `closed_at` (UTC) |
| `finisher_project_periods` | Dates when the project was Active, as `[start_on, end_on)`. Park, finish and let go close the open period at today. Unpark and reopen open one from today, rejoining a period that ended today. |
| `finisher_slots` / `finisher_slot_versions` | Slot identity plus versions valid over `[valid_from, valid_to)`. An edit closes the current version at today and opens a new one, or updates it in place when it started today. |
| `finisher_session_marks` | One row per (slot, date) holding `done` or `skipped`. Unmarked means no row, and the primary key makes marking idempotent. |
| `finisher_tasks` | Status, due date and optional time, revisit date, reason, `closed_at`. The project link uses a composite foreign key with `on delete set null (project_id)` (assumption A5). |

Scheduling rule (FIN-026): a session exists on date D when all of these hold:
- a version covering D includes D's ISO weekday;
- a period covers D.

A recorded mark always counts as a session. This means a session marked today stays scheduled after the slot changes or is removed (FIN-025).

Week summary (FIN-028): `done / scheduled`, plus counts of skipped, missed, unmarked and remaining sessions:
- **Missed:** unmarked, older than 7 days.
- **Unmarked:** past, still within the marking window.
- **Remaining:** today or later in the week.

Timezone (assumption A1): `TimeZoneSync` writes the browser's IANA zone to the `ph-tz` cookie (SameSite=Lax, 1 year, not HttpOnly, because it is not a secret). The server validates it with `Intl` and passes it as `p_tz`. The database checks it against `pg_timezone_names` and derives "today" itself. UTC is the fallback.

## API (`src/app/api/finisher/**`)

All routes go through `handleFinisherRequest` (`features/finisher/server/route.ts`):

- Mutations require `Origin` = site origin (otherwise 403) and a JSON content type when they have a body (otherwise 415).
- The session is checked before any input is read (401 otherwise).
- Bodies are limited to 32 KB and must be JSON objects.
- Errors come back as `{ error, fields? }` using safe codes.
- Every response sends `Cache-Control: private, no-store`.

| Method and path | Purpose |
| --- | --- |
| `GET /api/finisher/tasks?group&project&offset` | Load more tasks. `offset` must be a multiple of 50 between 0 and 10,000. |
| `POST /api/finisher/tasks` | Create a task |
| `PATCH` / `DELETE /api/finisher/tasks/[id]` | Edit or delete a task |
| `POST /api/finisher/tasks/[id]/actions` | `done`, `park`, `unpark`, `let_go`, `reopen` |
| `POST /api/finisher/projects` | Create a project with slots |
| `PATCH` / `DELETE /api/finisher/projects/[id]` | Edit or delete a project |
| `POST /api/finisher/projects/[id]/actions` | `finish`, `park`, `unpark`, `let_go`, `reopen` |
| `POST /api/finisher/projects/[id]/slots` | Add a slot |
| `PATCH` / `DELETE /api/finisher/slots/[id]` | Edit or remove a slot |
| `PUT /api/finisher/sessions` | `{slotId, date, state}`, where `state` is `done`, `skipped` or `unmarked` |
| `GET /api/finisher/closed?type&outcome&cursor` | Load more closed items |

Server Components call the same server-only queries directly (`features/finisher/server/queries.ts`), without an internal HTTP request.

## Security controls as built

- Identity comes from `requireUser()` (`getClaims()`) in every route and again in `finisherContext()` at the start of every query and mutation.
- Reads use the caller's session with the publishable key, and RLS limits rows to the owner. Writes are database functions that derive the owner from `auth.uid()` (ADR-0002).
- Direct table writes are not granted to anyone. The private helpers are not executable through the API.
- Composite foreign keys stop cross-user links: task → project, slot → project, version → slot, mark → slot.
- Only allowlisted fields are parsed. Unknown fields, including `user_id` and `status`, are ignored. A malformed ID returns 404 without a database call.
- Responses and pages are `private, no-store`. The static shell from partial prerendering holds only skeletons, and personal content streams in at request time. Document titles for task and project pages are generic, so personal titles stay out of browser history and tab titles.
- Logs contain only error codes. Database messages, which can echo personal text, are dropped.
- Abuse controls: body size limits, bounded pagination, and an idempotent marking design. **There is no per-user write rate limit** (see Debt).

## Checks run (2026-10-11, Windows, Node 22.2.0)

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test` | **122 passed**, in 6 files. |
| `npm run build` | Pass. All Finisher pages are partially prerendered (◐), and all APIs are dynamic. |
| `npm audit --omit=dev` | **7 high**, all from one new advisory on `braces` (GHSA-vfj7-8cjw-p6xm, every version affected). The path is `shadcn` → `fast-glob` / `ts-morph` → `micromatch` → `braces`. `shadcn` is a runtime dependency only because `globals.css` imports `shadcn/tailwind.css`. The vulnerable code is the CLI's file globbing, which the app never runs. The only offered fix (`--force`) downgrades shadcn to 1.0.0, so it was not applied. This is not caused by this change: the lockfile diff only adds `@electric-sql/pglite`. Recheck when `braces` publishes a fix. |

The 122 tests break down as follows:

| Test file | What it runs |
| --- | --- |
| `supabase/tests/finisher-rls.test.ts` (42) | The **real migration** on PGlite with Supabase-like roles, default grants and `auth.uid()`, covering: <ul><li>anonymous, owner and other-user reads and writes;</li><li>direct table writes refused;</li><li>lifecycle tables;</li><li>validation limits;</li><li>marking window edges at day 0, 7 and 8 and the future;</li><li>a slot edit and removal mid-history;</li><li>park and unpark on the same day;</li><li>deleting a project.</li></ul> A mutation check confirmed these tests fail when the owner predicate is removed from the read policy. |
| `tests/unit/finisher-domain.test.ts` (19) | Timezone and DST handling, overdue checks at the day boundary, the schedule with slot edits and park/unpark, week summaries, and validation |
| `tests/unit/finisher-routes.test.ts` (11) | The CSRF guard, 401 before any data access, allowlisting, ownership not taken from input, error mapping with no leaked text, and pagination bounds |
| Earlier auth tests (50) | Unchanged |

**Browser run against a mock Supabase.** The harness lives in a scratch directory and is not committed. It ran the production build (`next start`) against a small local stand-in for Supabase:
- Auth `/user` was mocked.
- A subset of PostgREST was translated to SQL on PGlite with the real migration, role and RLS per request.

The run used headless Chrome with the timezone `Asia/Ho_Chi_Minh` and passed **126 of 126 checks**:

- **Pages.** All ten pages render at 1280, 390 and 320 px, plus dark mode at 1280, with no horizontal overflow and no console errors.
- **Today.** Navigation order and `aria-current` are correct, the title is right, and the `ph-tz` cookie is set. Marking a session is optimistic and the summary updates. Skip works, and Done today appears.
- **Tasks.** Add task validation works: a required title, a time without a date rejected, and focus moved to the field. A new task appears without a reload. Check-off with Undo works, as do the task groups, the Parked group labelled "Due for revisit", and the project filter.
- **Project page.** Marking a past session in the 7-day strip works. A slot edit applies, and the Finish dialog shows the Done when and the open-task count.
- **Closed tab.** It shows the filters' counts, the reflection and the reason.
- **Phone drawer.** It opens as a dialog. Choosing an app closes it, and focus moves to the heading. Escape closes it.
- **Security probes.**
  - A second user gets 404 when acting on the owner's task or deleting the owner's project, and sees only their own tasks.
  - A cross-origin POST gets 403.
  - An anonymous API call gets 401.
  - An anonymous page request gets a 307 to `/sign-in?next=…`.
  - Pages are `private, no-store`.

Two bugs found and fixed during these checks:
- `Intl` date formatting differed by ICU version ("Wed, 7 Oct" vs "Wed 7 Oct"), a hydration risk. Dates are now formatted by hand.
- A slot added, marked and removed on the same day lost its only version. Today's version is now kept.

## Not verified

- **No real Supabase project.** Nothing was run against one: PostgREST's exact filter and embedding behaviour, real JWT verification, the Supabase default grants on an actual project, and Postgres 15/17 (PGlite is Postgres 18) are untested. The migration has **not** been applied anywhere.
- **Database types** were not generated (`supabase gen types`): the Supabase CLI is not installed. The queries use hand-written row types.
- **Accessibility tools.** No real screen readers (NVDA, VoiceOver), real phones or Safari, 200% zoom, or forced-colors mode.

## Migration and setup

1. Review `supabase/migrations/20261011120000_finisher.sql` and then apply it to the project, with `supabase db push` or the SQL editor, after your own authorization. It creates the six tables, the `finisher_private` schema and twelve functions. Rollback: drop the `finisher_*` functions, the tables and `finisher_private`. All Finisher data is lost.
2. In the API settings, keep `finisher_private` out of the exposed schemas (it is not exposed by default).
3. Run `supabase gen types typescript` once the CLI is available, and consider replacing the hand-written row types.
4. No new environment variables. `.env.example` is unchanged.

## Tester notes

- `npm test` runs the database tests in-process. No Docker or Supabase CLI is needed.
- Priorities with a real project:
  - FIN-017 through PostgREST directly with a second account: `select`/`insert`/`update`/`delete` on each `finisher_*` table, and RPC calls with the other user's IDs.
  - The `anon` key with no session.
  - A day boundary in a non-UTC zone.
  - Marking on day 7 and day 8.
  - Park and unpark mid-week.
- Suggested committed Playwright flows mirror the scratch run above. Authenticated browser state must stay out of Git.

## Debt and follow-ups

- No per-user write rate limit. Supabase has none on PostgREST by default, and CLAUDE.md asks for documented abuse controls. TA to decide; options are a Postgres-side counter table, or a Cloudflare rate-limiting rule.
- **Timezone aliases.** A browser zone that `Intl` accepts but Postgres lacks makes writes fail with a generic error. This is rare; consider mapping it or falling back to UTC.
- **Undo after check-off reopens to Open.** A task that was Parked before it was completed does not return to Parked.
- **Closed-tab cursor.** It pages by `closed_at` only, so two items closed in the same microsecond at a page boundary could be skipped.
- **Read limits.** The project index is capped at 1,000 projects and the task lists at their page sizes. The PostgREST `max_rows` setting (1,000 by default) caps other reads silently.
- **Drawer overlay.** It uses shadcn's default (10% black with blur), not the 50% black in the shell design.
- ~~**Content-Security-Policy with nonces.**~~ Done 2026-10-11 ([platform.md](platform.md)).
