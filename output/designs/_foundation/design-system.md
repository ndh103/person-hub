# Personal Hub design system (foundation)

- Status: draft
- Date: 2026-10-08; revised 2026-10-11 (bright orange with white text) and 2026-10-12 (fonts: Space Grotesk + JetBrains Mono)
- Source: first designer request (app shell landing page). The visual direction is not yet user-approved.
- Tokens: [theme.css](theme.css), the single source of truth for colors, fonts and radius.
- First consumer: [app-shell design](../app-shell/design-notes.md)

## Direction

Calm, private, utilitarian: a personal tool used daily on a phone and a laptop, not a marketing site. Minimal Swiss style: neutral surfaces, one restrained accent, generous whitespace, clear hierarchy, no decorative gradients or glass effects. Content (tasks, sessions, events) should carry the colour, not the chrome.

## ui-ux-pro-max research

Python is not installed on this machine, so `search.py --design-system` could not run. Instead, the skill's bundled data (`.claude/skills/ui-ux-pro-max/data/*.csv`) was read directly with keyword grep. No database output has been invented; the findings are:

| Source row | Recommendation | Used? |
| --- | --- | --- |
| `colors.csv` #16 Productivity Tool | Teal primary (#0D9488) + orange accent | Teal initially adopted, then replaced on 2026-10-08 by the user's request for a light, playful, Claude-inspired orange. |
| `colors.csv` #94 Habit Tracker | Streak amber + habit green on warm cream | Warm cream neutrals echo the adopted direction; amber/green rejected as hub-wide (too module-specific). |
| `colors.csv` #11 Portfolio/Personal | Monochrome neutrals + one accent | Adopted principle: one accent on neutrals. |
| `typography.csv` #5 Minimal Swiss | Inter only, weight-based hierarchy, for dashboards/apps | Adopted 2026-10-08; replaced 2026-10-12 by the user's reference (Space Grotesk + JetBrains Mono). |
| `typography.csv` "Tech Startup" (2026-10-12 search) | Space Grotesk headings + DM Sans body | Partly adopted: Space Grotesk kept. DM Sans was not used, because the user wanted the reference's set; Space Grotesk also serves as body text. |
| `typography.csv` "Developer Mono" (2026-10-12 search) | JetBrains Mono + IBM Plex Sans | JetBrains Mono adopted, for accents only. |
| `products.csv` Analytics/Financial dashboards | Data-dense dashboards | Rejected: dashboards are not confirmed scope. |

Run `python .claude/skills/ui-ux-pro-max/scripts/search.py "personal life log tasks projects tracker" --design-system -p "Personal Hub"` when Python is available to confirm or revise this direction (do not use `--persist`).

## Colour

Light and dark themes both ship. Direction (user requests, 2026-10-11): an orange theme with **white text** on orange, for buttons and for the sidebar frame, then "lighter orange please" with a reference shot (bright orange drawer and button, white text, roughly #FF9A62 to #FF6B3A). Colour inspiration only; no third-party brand assets are used.

- `--primary` is bright orange `#F46530` in both themes, with white `--primary-foreground`. Filled buttons, the pressed session check-off toggle and the skip link use this pair.
- **Accepted contrast trade-off (user choice):** white on `#F46530` is **3.11:1**. That meets WCAG AA only for large text (≥24px, or ≥18.66px bold) and for non-text UI; normal-size white labels (buttons, sidebar links) fall short of 4.5:1. `#F46530` is the lightest orange that still reaches 3:1; the reference's own `#FF6B3A`-ish orange is about 2.8:1. Mitigations: white labels on orange are semibold (buttons) or medium (nav), never dimmed, and active/hover states use a darker orange. The darker `#C4511A` (4.63:1, full AA) was tried earlier the same day and rejected as too dark.
- `--primary-hover` `#E0551F` (white 3.83:1) is a foundation addition beyond the shadcn variable set. Hover **darkens**; never use `hover:bg-primary/90` or opacity, which lightens the button and lowers white-text contrast further.
- `--ring` is `#D94F1C` in light (3.92:1 on background, 4.13:1 on card); `#F46530` alone would be 2.95:1 on ivory, under the 3:1 non-text minimum. Dark keeps `#F59563`.
- Orange-tinted text and links on light surfaces use `--accent-foreground` (rust `#8A3A1C`); never use `--primary` as text on light surfaces (2.95:1). `--accent` (peach tint light, brown dark) remains the hover and icon-tile surface in content.
- Sidebar / frame (light): `--sidebar` is the same `#F46530` with white `--sidebar-foreground` (3.11:1). Never dim that text. Hover and the active item use a darker orange pill `--sidebar-accent` `#E0551F` with white text (3.83:1); the active item adds semibold text and a white leading bar (`--sidebar-primary`). The reference's translucent white cards were not used for the active pill, because lightening the pill would drop white text further. The monogram is white with orange letters (3.11:1). Focus on the frame uses a white ring (`--sidebar-ring`, 3.11:1 non-text). `--sidebar-border` `#FF9A62` is decorative only.
- Sidebar / frame (dark): kept charcoal `#1A1918` behind a `#262624` card, with light text and the brown active pill (assumption, easy to change). The monogram and active bar use the primary orange with white text.
- Destructive stays red (`#B91C1C` light, `#F87171` dark), distinct from the orange.

History: teal, then terracotta `#B4532F` with white text, then light orange `#F59563` with near-black text on a `#D97757` frame (all 2026-10-08); `#C4511A` with white text (2026-10-11, rejected as too dark); bright `#F46530` with white text (2026-10-11, current).

### Contrast checks (WCAG 2.x ratio, computed with a script)

| Pair | Light | Dark |
| --- | --- | --- |
| foreground / background | 17.50 | 14.39 |
| card-foreground / card | 18.43 | 12.55 |
| primary-foreground / primary (buttons, pressed toggle) | **3.11** (large text only) | **3.11** (large text only) |
| primary-foreground / primary-hover (button hover) | 3.83 | 3.83 |
| accent-foreground / accent | 6.71 | 9.04 |
| accent-foreground text / card (links) | 7.77 | 8.96 |
| muted-foreground / muted | 5.67 | 6.42 |
| muted-foreground / background | 6.26 | 7.36 |
| secondary-foreground / secondary | 9.38 | 10.57 |
| destructive-foreground / destructive | 6.47 | 6.15 |
| destructive text on card | 6.47 | 4.78 |
| sidebar-foreground / sidebar (frame) | **3.11** (large text only) | 14.03 |
| sidebar-accent-foreground / sidebar-accent (active pill, hover) | 3.83 | 9.04 |
| sidebar-primary-foreground / sidebar-primary (monogram) | 3.11 | 3.11 |
| sidebar-ring / sidebar (non-text, ≥3:1) | 3.11 | 7.83 |
| sidebar-ring / sidebar-accent (non-text, ≥3:1) | 3.83 | n/a |
| ring / background (non-text, ≥3:1) | 3.92 | 6.76 |
| ring / card (non-text, ≥3:1) | 4.13 | 5.90 |
| input border / card (non-text, ≥3:1) | 3.55 | 3.48 |
| input border / background (non-text, ≥3:1) | 3.37 | 3.99 |
| primary button edge / background (non-text) | 2.95 | 4.87 |

All text pairs meet AA (4.5:1) except white on the orange primary, sidebar and hover pill (3.11 to 3.83:1), an accepted user choice listed above. `--border` is decorative separation only; form controls use `--input`.

## Typography

Revised 2026-10-12 at the user's request, from a reference design they liked: a bold grotesque for headings and a monospace for text. The reference's exact fonts are not named, so these are the closest free matches by eye (an assumption): letterforms such as the straight-tailed `y`, the flagged `1`, and the tight bold headline match **Space Grotesk**, and the narrow mono with a curled `l` matches **JetBrains Mono**. Both are free (SIL OFL) and on Google Fonts.

The user chose "headings + mono accents" rather than all-mono body text: monospace is wider, so phone layouts, long task titles, and forms would get tighter.

| Font | Variable | Use |
| --- | --- | --- |
| Space Grotesk (variable, 300–700) | `--font-sans`, `--font-heading` | Headings, body text, nav, buttons, form fields and their values, big numbers |
| JetBrains Mono (variable, 400–700) | `--font-mono` (`font-mono`) | Small read-only meta: eyebrow labels, dates and times in lists, counts and rates, durations, the "Sample data" tag |

| Role | Font | Size / line-height | Weight / tracking |
| --- | --- | --- | --- |
| Page title (h1) | Space Grotesk | 1.5rem / 2rem (`text-2xl`); 1.875rem at `lg` | 700, `tracking-tight` |
| Section title (h2) | Space Grotesk | 1.125rem / 1.75rem (`text-lg`) | 600 |
| Big number (rates, stats) | Space Grotesk | `text-2xl`–`text-4xl` | 700, `tabular-nums` |
| Body | Space Grotesk | 0.875–1rem (`text-sm`/`text-base`) | 400 |
| Labels, nav items, buttons | Space Grotesk | 0.875rem (`text-sm`) | 500 (buttons 600) |
| Eyebrow label | JetBrains Mono | 0.75rem (`text-xs`), uppercase | 500, `tracking-[0.12em]`, `text-accent-foreground` |
| Meta / helper in lists | JetBrains Mono | 0.75–0.8125rem | 400, `text-muted-foreground` |
| Helper text under form fields | Space Grotesk | 0.875rem | 400, `text-muted-foreground` |

Rules:

- **Mono is for short, read-only meta only.** Never use it for paragraphs, titles, form inputs, or buttons. Inside controls (including the date-field value and the FIN-034 shortcut captions) keep Space Grotesk, so the layouts sized for it still fit at 320px.
- **Orange text.** The reference sets eyebrows and highlights in bright orange on ivory. Here `#F46530` on ivory is 2.95:1, which fails for small text. Orange-tinted text uses `--accent-foreground` (rust, 7.77:1 on card). Bright orange stays for fills, such as the primary button and sidebar, as before.
- **Font size on phones.** Form inputs are at least 16px on phones (prevents iOS zoom).
- **Loading.** Design references load both fonts from Google Fonts. Production should self-host them with `@fontsource-variable/space-grotesk` and `@fontsource-variable/jetbrains-mono`, replacing `@fontsource-variable/inter`, and keep the system fallbacks.

## Spacing, radius, elevation

- Tailwind 4px scale. Page gutter 16px on phone (`px-4`), 24–32px on laptop (`px-6 lg:px-8`).
- `--radius` 0.625rem; shadcn derives `sm/md/lg/xl` radii from it.
- Elevation is mostly borders; `shadow-sm` on cards, `shadow-lg` only on overlays (drawer, toast).

## Motion

150–200ms ease-out for hover/colour changes; 200ms for drawer slide. Respect `prefers-reduced-motion` by removing transitions.

## Icons

Lucide (shadcn/ui default, `lucide-react` in production), 20px in navigation, 16px inline, 1.75–2px stroke. Icons always accompany a text label in navigation; icon-only buttons need an accessible name.

## Using the tokens

Copy `theme.css` values into the app's `globals.css` and map them for Tailwind v4 with `@theme inline { --color-background: var(--background); … }` exactly as shadcn/ui does. Design references show that mapping inline. Also map `--color-primary-hover: var(--primary-hover)`. Class names to use: `bg-background`, `hover:bg-primary-hover`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary text-primary-foreground`, `bg-sidebar`, `bg-sidebar-accent`, `border-border`, `ring-ring`, etc. No raw hex or palette utilities (`bg-orange-700`) in feature designs.

## Open questions

- Bright orange `#F46530` with white text chosen by the user on 2026-10-11, accepting AA-large-only contrast for white labels. If full AA is later required, darken to `#C4511A` or switch labels to near-black. Dark-mode sidebar kept charcoal as an assumption. Light/dark support still assumed; language and branding remain unresolved.
- Product name and logo mark: "Personal Hub" with a monogram placeholder is used until branding is decided.
