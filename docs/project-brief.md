# Personal Hub: starting brief

Status: draft. Source: the user's initial project request. This brief records intent; it is not a complete feature specification.

## Confirmed direction

- A website usable in phone and laptop browsers.
- Multiple separate apps accessible from a sidebar menu.
- Events records life events, for example buying a new TV.
- Habit Tracker tracks personal habits.
- Next.js provides the frontend and backend API in the same project.
- Supabase provides the database and built-in authentication.
- Tailwind CSS and preferably shadcn/ui provide frontend styling and components.
- Backend security is the highest engineering priority; the backend retrieves data and serves the frontend.
- Prefer free hosting, with Vercel as the intended Next.js hosting option.
- Prepare agent instructions and skills first; application implementation is not yet requested.

## Working defaults to validate

- Private data per authenticated account, even if the initial installation has one user.
- Responsive sidebar with a phone navigation drawer.
- One application with separate feature modules and shared infrastructure.
- Next.js App Router, TypeScript, and server-mediated application data access.

## Questions for the next requirements task

Ask only questions relevant to the feature being specified; do not block all work on this entire list.

- Access model: one invited account, invitation-only users, or public registration? Which sign-in method?
- Events: required fields, date versus exact time, editing/deletion, tags/search, and any attachments?
- Habits: daily/weekly/custom schedules, binary versus quantity tracking, missed days, backdating, and streak rules?
- Timezone: account timezone, travel behavior, and when a habit day begins/ends?
- Data lifecycle: deletion behavior, retention, export, and recovery expectations?
- Product priorities: which feature should be specified and implemented first?
- Visual preferences: light/dark mode, language, and any branding?

Reminders, uploads, offline sync, sharing, notifications, and dashboards are not confirmed requirements. Add them only when requested or explicitly agreed as scope.
