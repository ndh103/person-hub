# Personal Hub design system (foundation)

- Status: draft
- Date: 2026-10-08
- Source: first designer request (app shell landing page). The visual direction is not yet user-approved.
- Tokens: [theme.css](theme.css), the single source of truth for colors, fonts and radius.
- First consumer: [app-shell design](../app-shell/design-notes.md)

## Direction

Calm, private, utilitarian: a personal tool used daily on a phone and a laptop, not a marketing site. Minimal Swiss style: neutral surfaces, one restrained accent, generous whitespace, clear hierarchy, no decorative gradients or glass effects. Content (events, habits) should carry the colour, not the chrome.

## ui-ux-pro-max research

Python is not installed on this machine, so `search.py --design-system` could not run. Instead, the skill's bundled data (`.claude/skills/ui-ux-pro-max/data/*.csv`) was read directly with keyword grep. No database output has been invented; the findings are:

| Source row | Recommendation | Used? |
| --- | --- | --- |
| `colors.csv` #16 Productivity Tool | Teal primary (#0D9488) + orange accent | Teal initially adopted, then replaced on 2026-10-08 by the user's request for a light, playful, Claude-inspired orange. |
| `colors.csv` #94 Habit Tracker | Streak amber + habit green on warm cream | Warm cream neutrals echo the adopted direction; amber/green rejected as hub-wide (too module-specific). |
| `colors.csv` #11 Portfolio/Personal | Monochrome neutrals + one accent | Adopted principle: one accent on neutrals. |
| `typography.csv` #5 Minimal Swiss | Inter only, weight-based hierarchy, for dashboards/apps | Adopted. |
| `products.csv` Analytics/Financial dashboards | Data-dense dashboards | Rejected: dashboards are not confirmed scope. |

Run `python .claude/skills/ui-ux-pro-max/scripts/search.py "personal life log habit tracker dashboard" --design-system -p "Personal Hub"` when Python is available to confirm or revise this direction (do not use `--persist`).

## Colour

Light and dark themes both ship. Direction (user requests, 2026-10-08): a light, bright orange for a more playful feel, in the style of Claude Code / Anthropic, on warm ivory (light) and charcoal (dark) neutrals. This is colour inspiration only; no Anthropic logo, name, or brand assets are used.

- `--primary` is `#F59563` in both themes, with near-black `--primary-foreground` (`#1F1E1D`, 7.42:1). Filled buttons, the pressed habit toggle and the logo monogram use this pair.
- Rule: on light surfaces orange is too light for text or focus rings (2.13:1 on ivory). Use `--accent-foreground` (deep rust `#8A3A1C`) for orange-tinted text and links, and `--ring` (`#C2603A`) for focus. In dark mode the orange itself is readable and is also the ring.
- `--accent` / `--sidebar-accent` are peach tints (light) or brown (dark) for hover and active navigation; text and icons on them use `--accent-foreground`.
- The active menu item's leading bar uses `--sidebar-primary`. In light mode it is decorative (1.94:1); the active state is carried by the accent background, semibold label and rust icon.
- Sidebar / frame (2026-10-08, user reference: coloured frame with a floating content card): light theme uses Anthropic orange `#D97757` as `--sidebar`, which is also the page frame colour behind the content card. White text on it fails AA (3.12:1), so sidebar text is near-black `#1F1E1D` (5.33:1) at full strength. Never dim it: 80% opacity already drops to 3.96:1. Hierarchy comes from size, weight and uppercase. The active item uses a lighter orange pill `--sidebar-accent` `#E4A089` (text 7.68:1), bold text and a near-black bar (`--sidebar-primary`). Focus on the frame uses `--sidebar-ring` (near-black). Dark theme frame is `#1A1918` behind a `#262624` card.
- Destructive stays red (`#B91C1C` light, `#F87171` dark), distinct from the orange.

Superseded earlier the same day: teal primary, then deep terracotta `#B4532F` with white text.

### Contrast checks (WCAG 2.x ratio, computed with a script)

| Pair | Light | Dark |
| --- | --- | --- |
| foreground / background | 17.50 | 14.39 |
| card-foreground / card | 18.43 | 12.55 |
| primary-foreground / primary (buttons, monogram) | 7.42 | 7.42 |
| accent-foreground / accent (active nav text, icon) | 6.71 | 9.04 |
| accent-foreground text / card (links) | 7.77 | 8.96 |
| muted-foreground / muted | 5.67 | 6.42 |
| muted-foreground / background | 6.26 | 7.36 |
| secondary-foreground / secondary | 9.38 | 10.57 |
| destructive-foreground / destructive | 6.47 | 6.15 |
| destructive text on card | 6.47 | 4.78 |
| sidebar-foreground / sidebar (frame) | 5.33 | 14.03 |
| sidebar-accent-foreground / sidebar-accent (active pill) | 7.68 | 9.04 |
| sidebar-primary-foreground / sidebar-primary (monogram) | 15.80 | 7.42 |
| sidebar-ring / sidebar (non-text) | 5.33 | 7.83 |
| ring / background (non-text, ≥3:1) | 3.96 | 6.76 |
| ring / card (non-text, ≥3:1) | 4.18 | 5.90 |
| input border / card (non-text, ≥3:1) | 3.55 | 3.48 |
| input border / background (non-text, ≥3:1) | 3.37 | 3.99 |
| primary / background (decorative in light) | 2.13 | 6.76 |

All text pairs meet AA (4.5:1). `--border` is decorative separation only; form controls use `--input`.

## Typography

Inter (Google Fonts, weights 400/500/600/700) with a system sans fallback. In production prefer `next/font` to self-host it.

| Role | Size / line-height | Weight |
| --- | --- | --- |
| Page title (h1) | 1.5rem / 2rem (`text-2xl`) | 600 |
| Section title (h2) | 1.125rem / 1.75rem (`text-lg`) | 600 |
| Body | 0.875–1rem (`text-sm`/`text-base`) | 400 |
| Labels, nav items | 0.875rem (`text-sm`) | 500 |
| Meta / helper | 0.75–0.875rem, `text-muted-foreground` | 400 |

Body text on phones is at least 16px for form inputs (prevents iOS zoom).

## Spacing, radius, elevation

- Tailwind 4px scale. Page gutter 16px on phone (`px-4`), 24–32px on laptop (`px-6 lg:px-8`).
- `--radius` 0.625rem; shadcn derives `sm/md/lg/xl` radii from it.
- Elevation is mostly borders; `shadow-sm` on cards, `shadow-lg` only on overlays (drawer, toast).

## Motion

150–200ms ease-out for hover/colour changes; 200ms for drawer slide. Respect `prefers-reduced-motion` by removing transitions.

## Icons

Lucide (shadcn/ui default, `lucide-react` in production), 20px in navigation, 16px inline, 1.75–2px stroke. Icons always accompany a text label in navigation; icon-only buttons need an accessible name.

## Using the tokens

Copy `theme.css` values into the app's `globals.css` and map them for Tailwind v4 with `@theme inline { --color-background: var(--background); … }` exactly as shadcn/ui does. Design references show that mapping inline. Class names to use: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary text-primary-foreground`, `bg-sidebar`, `bg-sidebar-accent`, `border-border`, `ring-ring`, etc. No raw hex or palette utilities (`bg-orange-700`) in feature designs.

## Open questions

- Orange direction confirmed by the user on 2026-10-08. Light/dark support still assumed; language and branding remain unresolved.
- Product name and logo mark: "Personal Hub" with a monogram placeholder is used until branding is decided.
