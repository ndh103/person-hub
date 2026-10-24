# Personal Hub: starting brief

Status: draft. Source: the user's initial project request. This brief records intent; it is not a complete feature specification.

## Confirmed direction

- A website usable in phone and laptop browsers.
- Multiple separate apps accessible from a sidebar menu.
- Finisher is the first app in the navigation: short Tasks and longer Projects with weekly timetable slots whose sessions are checked off (see [requirements/finisher.md](../requirements/finisher.md)).
- Events records life events, for example buying a new TV. It is second in the navigation (see [requirements/events.md](../requirements/events.md)).
- Inspiration keeps articles (link and pasted text) and uploaded images, organized with tags. It is third in the navigation (see [requirements/inspiration.md](../requirements/inspiration.md)). Added 2026-10-24; images are stored in Supabase Storage on the free plan.
- Habit Tracker was dropped on 2026-10-10; Finisher project sessions cover recurring activities.
- A React single-page app and a Hono API on one Cloudflare Worker, same origin ([ADR-0003](architecture/decisions/ADR-0003-spa-and-worker-api.md), 2026-10-11; this replaced the original Next.js plan).
- Supabase provides the database and built-in authentication.
- Tailwind CSS and preferably shadcn/ui provide frontend styling and components.
- Backend security is the highest engineering priority; the backend retrieves data and serves the frontend.
- Prefer free hosting, with Cloudflare's free Workers plan as the intended host.
- Prepare agent instructions and skills first; application implementation is not yet requested.

## Working defaults to validate

- Private data per authenticated account, even if the initial installation has one user.
- Responsive sidebar with a phone navigation drawer.
- One application with separate feature modules and shared infrastructure.
- Vite, React, TypeScript, TanStack Router/Query, Hono on Workers, and API-mediated application data access.

## Questions for the next requirements task

Ask only questions relevant to the feature being specified; do not block all work on this entire list.

- Access model: answered 2026-10-10. Invitation-only accounts (public sign-up disabled), signing in with email + password, magic link / email code, or Google. See [requirements/auth.md](../requirements/auth.md) and [docs/architecture/auth.md](architecture/auth.md).
- Events: answered 2026-10-13. Title, date (future allowed), optional time, link, and notes; create/edit/delete; latest first; search by text and filter by year. See [requirements/events.md](../requirements/events.md).
- Finisher: see the open questions in [requirements/finisher.md](../requirements/finisher.md).
- Timezone: account timezone, travel behavior, and when a local day begins/ends for Finisher sessions and due dates?
- Data lifecycle: deletion behavior, retention, export, and recovery expectations?
- Product priorities: Finisher is specified first; confirm implementation order.
- Visual preferences: light/dark mode, language, and any branding?

Reminders, offline sync, sharing, notifications, and dashboards are not confirmed requirements. Image uploads are confirmed for Inspiration only. Add them only when requested or explicitly agreed as scope.
