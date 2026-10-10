# App shell and post-sign-in landing: design notes

- Feature slug: `app-shell`
- Status: draft (exploratory; no requirement exists yet)
- Date: 2026-10-08; revised 2026-10-10 (Habit Tracker replaced by Finisher; Finisher listed first)
- Source request: "Design a landing page for my person-hub, the screen a user lands on after logging in. Sidebar with a menu item per app (Events, Habit Tracker, …); clicking a menu item shows that app module on the right."
- Related inputs: [CLAUDE.md](../../../CLAUDE.md), [project brief](../../../docs/project-brief.md), [foundation](../_foundation/design-system.md) and [theme.css](../_foundation/theme.css)
- Related requirements: [requirements/finisher.md](../../../requirements/finisher.md) (FIN-001 navigation order and Today default). No shell requirement yet. Suggested BA artifact: `requirements/app-shell.md`. Placeholder IDs below (`SHELL-*`) are design proposals, not confirmed requirements.
- Architecture: none yet.

## Preview

Open `output/designs/app-shell/index.html` directly in a browser (no server needed). Needs network access for:

- the pinned Tailwind v4 browser runtime `@tailwindcss/browser@4.1.11` from jsDelivr (prototype only, never copy into the app)
- Inter from Google Fonts (falls back to system sans offline)

Routes are hash URLs standing in for App Router paths: `#/home`, `#/finisher`, `#/events`; any other `#/x` shows "App not found". Resize below 1024px to see the drawer. On Finisher and Events, open "Prototype controls" at the bottom of the page to switch Ready / Loading / Empty / Error. The sidebar footer toggles light/dark.

## Screens and states

| Proposed ID | Screen / behaviour | States shown |
| --- | --- | --- |
| SHELL-001 | Persistent sidebar at ≥1024px: brand, Home, "Apps" group (Finisher, then Events), account footer (signed-in email, theme, sign out) | Active item |
| SHELL-002 | Below 1024px: sticky top bar (menu button + current app name); sidebar becomes a left drawer | Closed, open |
| SHELL-003 | Selecting a menu item swaps the right-hand content to that module, updates URL, page title and active item | Home, Finisher, Events, unknown app (including the retired `#/habits`) |
| SHELL-004 | Home: default landing after sign-in; welcome plus one card per app and a "more apps" placeholder | Ready |
| SHELL-005 | Module content area (Finisher Today and Events previews) | Ready (sample data), loading skeleton, empty with call to action, error with retry |
| SHELL-006 | Sign out from the sidebar footer | Prototype toast only |

Module content is illustrative. The Finisher preview shows a Today view (FIN-031): sessions today from projects, then overdue and due-today tasks, each with a "Done" toggle, plus the Today / Tasks / Projects / Closed tabs (FIN-001). Its exact layout, the Skip action, the Done-today group and the other tabs belong to the full Finisher design (`output/designs/finisher/`, not yet created). Event fields are fixtures until Events requirements exist. "Add task", "New project", "New event" and the non-Today tabs only show a toast.

Change 2026-10-10: Habit Tracker was removed from the hub. Its nav item, Home card and module preview were replaced by Finisher, which is now the first app; Events is second.

## Layout and responsive rules

Visual style follows a user-supplied reference (2026-10-08): the whole page sits on the sidebar colour (Anthropic orange in light, near-black in dark), the sidebar has no border, and content floats on a large rounded card. The sidebar header shows the monogram, hub name and signed-in email. The footer has Sign out and a segmented Light/Dark switch. The reference's per-item count badges and external-link section are not used: counts are not confirmed scope.


- ≥1024px (`lg`): two-column grid `17rem | 1fr` on `bg-sidebar`. Sidebar is `sticky`, full viewport height, with independent scroll for a long nav. The content card (`main.content-card`) has 20px top/right/bottom inset, `rounded-2xl`, `bg-background`, a soft shadow and a 1px `--sidebar-border` outline. Inner content is `max-w-5xl` with `px-12 py-14` padding.
- <1024px: sticky `h-14` top bar on `bg-sidebar` (orange); content is a sheet with `rounded-t-2xl` below it; drawer width `min(18rem, 85vw)` slides in from the left with a 50% black overlay; body scroll locked while open. Tablets use the drawer too, so content keeps its full width.
- Page gutter 16px on phone (`px-4`), 24px at `sm`.
- Event rows stack date over title on phone, date column beside title from `sm`.
- Touch targets are at least 44px tall (`min-h-11` / `size-11`) for nav items, buttons, and toggles.

## Navigation behaviour

- Active app: `aria-current="page"` on the link, styled as a lighter pill (`--sidebar-accent`), semibold label and a 3px leading bar in `--sidebar-primary` (near-black in light, orange in dark), so it does not rely on colour alone.
- On navigation: content view swaps, `document.title` becomes `<App> · Personal Hub`, top-bar title updates, and focus moves to the new page's `h1` so screen-reader and keyboard users land on the new content. Initial load does not move focus.
- Drawer: opens from the menu button (`aria-expanded`, `aria-controls`); while open it gets `role="dialog"` + `aria-modal="true"`, the rest of the page is `inert`, focus moves to the close button and Tab/Shift+Tab wrap inside. Closes on Escape, close button, overlay click, or selecting an item. Escape/close/overlay return focus to the menu button; selecting a different app moves focus to that app's heading. Resizing to desktop closes it.
- When the drawer is closed it is `visibility: hidden`, so its links are removed from tab order and the accessibility tree.
- Skip link "Skip to content" is first in tab order.
- Unknown app route shows "App not found" with a link to Home and no active nav item.

## Tokens

Only foundation tokens via semantic classes: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`/`text-primary-foreground`, `bg-accent`, `bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-accent`, `border-border`, `border-input`, `text-destructive`, `text-accent-foreground` (orange-tinted links; primary orange is never used as text on light surfaces). `styles.css` adds no new tokens; it holds the drawer positioning, active-item treatment, focus outline, skeleton pulse, toast animation, and reduced-motion overrides. The overlay uses `rgb(0 0 0 / 0.5)`, matching the shadcn Sheet overlay.

## shadcn/ui mapping (proposed)

| Reference element | shadcn/ui |
| --- | --- |
| Sidebar + drawer | `SidebarProvider`, `Sidebar` (`collapsible="offcanvas"`, which renders a left `Sheet` on mobile), `SidebarHeader`, `SidebarContent`, `SidebarGroup`/`SidebarGroupLabel` ("Apps"), `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton asChild isActive` wrapping `next/link`, `SidebarFooter` |
| Menu button in top bar | `SidebarTrigger` |
| Content column | `SidebarInset` |
| App cards on Home | `Card` + `CardHeader`/`CardTitle`/`CardDescription` inside a `Link` |
| Primary/outline buttons | `Button` (`default`, `outline`) |
| "Sample data" chip | `Badge variant="secondary"` (prototype only) |
| Loading rows | `Skeleton` |
| Error banner | `Alert variant="destructive"` with retry `Button` |
| Finisher "Done" toggle (session / task) | `Toggle` (pressed state); the full Finisher design may switch tasks to `Checkbox` |
| Finisher section tabs | `Tabs` with `TabsList` / `TabsTrigger` rendered as links (each tab has its own URL per FIN-001) |
| Toasts | `Sonner` |
| Sidebar header (monogram, name, email) | `SidebarHeader` (+ `Avatar`) |
| Light/Dark switch | `ToggleGroup type="single"` (two `ToggleGroupItem`s); the reference uses `aria-pressed` buttons |
| Sign out | `Button variant="ghost"` inside a POST form |
| Content card on the frame | `SidebarInset` with shadcn's `variant="inset"` sidebar, which already renders inset rounded content |

Note: shadcn's `Sidebar` switches to the Sheet at its own mobile breakpoint (768px by default via `useIsMobile`). This reference uses 1024px; Developer should either set the hook's breakpoint to 1024px or accept 768px. Flag the choice to the user if it changes tablet behaviour.

## Implementation notes for TA / Developer

- Map routes to App Router segments, e.g. `src/app/(app)/layout.tsx` (shell, requires an authenticated user) with `home/`, `finisher/`, `events/` pages; post-sign-in redirect goes to `/home` (or `/`). Each module page is a separate feature module per CLAUDE.md.
- The app list in the sidebar and on Home should come from one static registry (id, label, href, icon, description) so adding an app updates both.
- The signed-in email shown in the footer must come from verified server-side identity; render nothing sensitive beyond what is needed. Shell responses are personal and must not be publicly cached.
- Sign out must be a POST (no state-changing GET) and should redirect to the sign-in page.
- Theme preference: use `next-themes` or equivalent with the `.dark` class; avoid a flash of the wrong theme.
- No backend capability is needed for the shell itself beyond the session/user identity.

## ui-ux-pro-max findings

Python is not installed, so `search.py` could not run; the skill's CSV data was read directly with grep. Applied: shadcn `Sidebar` with `SidebarProvider` and `SidebarTrigger`; `Sheet side="left"` for mobile nav; active-state indication; deep-linkable URLs per view; focus states on all controls; ≥8px spacing between touch targets; `touch-action: manipulation`. Rejected: data-dense dashboard styles (dashboards are not confirmed scope).

## Checks performed

Headless Chrome via the DevTools protocol (scratch script, not committed), at 1280×800, 800×1000, 390×844 and 320×640:

- No horizontal overflow at any tested width (`scrollWidth == clientWidth`), including Events and the former Habit Tracker view at 390 and 320px (2026-10-08 run; see the 2026-10-10 re-check below).
- (2026-10-08) Clicking Events / Habit Tracker swaps the view, sets the hash, `aria-current`, page title, and focuses the module `h1`. Unknown route shows "App not found" with no active item.
- Phone: drawer opens with `role=dialog`, `aria-modal=true`, content `inert`, focus on close button; Tab from the last item wraps to the first; Escape and overlay click close it and return focus to the menu button; choosing Events closes the drawer and focuses the Events heading. 800px tablet uses the drawer.
- Error state's "Try again" returns to loading and then ready.
- Dark theme applies from `prefers-color-scheme: dark`; the Light/Dark switch sets the theme and `aria-pressed`. Screenshots of the orange frame, floating card, drawer and phone top bar reviewed in light and dark.
- Tab from the last drawer control (Dark) wraps to the first (brand link).
- Foundation colour contrast computed (see foundation doc).

Re-check 2026-10-10 (headless Chrome via DevTools protocol, scratch script not committed) at 1280×800, 800×1000, 390×844 and 320×640:

- Nav order is Home, Finisher, Events at every width. `#/finisher` and `#/events` render their views with the correct `aria-current` and page title. `#/habits` now shows "App not found" with no active item.
- No horizontal overflow on Home, Finisher, Events or not-found at any tested width. The Finisher Ready, Loading, Empty and Error states all render without overflow at 320px.
- Clicking Finisher from Home sets `#/finisher` and focuses the Finisher `h1`.
- Screenshots of Finisher Today reviewed in light at 1280 and 320, and in dark at 1280. The drawer behaviour was not re-run because the drawer code is unchanged.

Not checked: real screen readers (NVDA, VoiceOver), real mobile devices/Safari, 200% zoom, Windows High Contrast mode, and the shadcn implementation itself. The static reference shows patterns; it does not prove the production component is accessible.

## Unresolved questions

1. Landing target after sign-in: this design uses a Home page with app cards. Alternatives: go straight to Events, or reopen the last-used app. (Assumption, easy to change.)
2. Should Home ever show summaries (e.g. today's Finisher sessions, recent events)? Dashboards are not confirmed scope, so Home is navigation only.
3. Light, playful orange (Claude-inspired, `#F59563` with dark text) chosen by the user on 2026-10-08; light/dark support is still an assumption.
4. Desktop sidebar collapse to an icon rail (`collapsible="icon"`) is not shown; add if wanted.
5. Mobile breakpoint for the drawer: 1024px here vs shadcn's 768px default.
6. Account access model and sign-in page design are out of scope here (no `auth` requirement yet).
