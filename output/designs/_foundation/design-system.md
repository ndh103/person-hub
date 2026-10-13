# Personal Hub design system (foundation)

- Status: draft
- Date: 2026-10-08. Revised 2026-10-11 (bright orange with white text), 2026-10-12 (Space Grotesk + JetBrains Mono), and 2026-10-13 (Claude design system, orange `#D4724F`, Source Serif 4 + Inter + JetBrains Mono).
- Source: first designer request (app shell landing page). On 2026-10-13 the user supplied a reference image and asked to apply the Claude design system published at <https://open-design.ai/plugins/design-system-claude/>. That system is used as **inspiration only**: no Anthropic fonts, logos, illustrations or other assets are used. The visual direction is not yet user-approved.
- Tokens: [theme.css](theme.css) is the single source of truth for colours, fonts, radius, elevation and motion.
- Consumers: the [app-shell design](../app-shell/design-notes.md) and the [Finisher design](../finisher/design-notes.md).

## Direction

The style is warm, editorial and calm: a personal tool used daily on a phone and a laptop. It follows the Claude system's character:

- A parchment page with ivory cards. Every neutral is warm; there are no cool blue-greys.
- Serif headings at weight 500 and a clean sans for UI.
- One chromatic accent (orange), used for primary actions and for the frame.
- No gradients. Cards are separated with 1px rings instead of drop shadows, and generous whitespace keeps the hierarchy clear.

Content (tasks, sessions, events) carries the meaning; the chrome stays quiet.

## Colour

The orange `#D4724F` was **sampled from the user's reference image**: the filled "1 Brief" step, the asterisk mark and the tag outlines are all exactly this value. The user asked for white text on the orange, on buttons and on the sidebar.

### Light theme

| Role | Token | Value | Name in the Claude system |
| --- | --- | --- | --- |
| Page | `--background` | `#F5F4ED` | Parchment |
| Cards | `--card` | `#FAF9F5` | Ivory |
| Overlays | `--popover` | `#FFFFFF` | Pure White (overlays only, never the page) |
| Text | `--foreground` | `#141413` | Near Black |
| Primary fill | `--primary` | `#D4724F` | Reference orange (the system's Coral is `#D97757`) |
| Primary hover / active pill | `--primary-hover`, `--sidebar-accent` | `#C96442` | Terracotta Brand |
| Secondary button | `--secondary`, `--secondary-foreground` | `#E8E6DC`, `#4D4C48` | Warm Sand, Charcoal Warm |
| Muted surface and text | `--muted`, `--muted-foreground` | `#F0EEE6`, `#5E5D59` | Border Cream, Olive Gray |
| Tint and rust text | `--accent`, `--accent-foreground` | `#F6E4DB`, `#8A3A1C` | Hub additions |
| Error | `--destructive` | `#B53333` | Error Crimson |
| Decorative borders | `--border` | `#E8E6DC` | Border Warm |
| Control edges | `--input` | `#87867F` | Stone Gray |
| Focus | `--ring` | `#C96442` | Terracotta (see the deviation below) |

**Sidebar and frame (light):**
- `--sidebar` is the same orange `#D4724F` with white text. Never dim that text.
- Hover and the active item use a terracotta pill (`#C96442`) with white text. The active item also gets semibold text and a white leading bar (`--sidebar-primary`).
- The monogram is white with orange letters.
- Focus on the frame uses a white ring.
- `--sidebar-border` (`#E3987C`) is decorative only.

**Dark theme:** this follows the system's dark sections:

| Role | Value | Name in the Claude system |
| --- | --- | --- |
| Page | `#141413` | Deep Dark |
| Cards and overlays | `#30302E` | Dark Surface |
| Text | `#FAF9F5` | |
| Muted text | `#B0AEA5` | Warm Silver |
| Muted surface | `#262624` | |
| Borders | `#3E3D39` | |
| Focus ring | `#D97757` | Coral |

The orange primary and its white text are the same as in light. The dark sidebar stays charcoal (`#1F1E1D`) with light text and a brown active pill. This is an assumption: the user's request ("the sidebar should reflect this orange") was about the light theme.

### Rules and accepted trade-offs

- **White on orange is 3.32:1 (user choice).** That meets WCAG AA only for large text (≥24px, or ≥18.66px bold) and for non-text UI. Normal-size white labels on buttons and in the sidebar fall short of 4.5:1. Mitigations: white labels on orange are semibold (buttons) or medium (nav) and are never dimmed, and hover/active states darken to `#C96442` (3.90:1). For full AA later, darken the primary to about `#B4532F`, or use near-black labels.
- **Hover darkens; never lighten.** Do not use `hover:bg-primary/90` or opacity, which lightens the button and lowers white-text contrast.
- **Orange text.** Never set text in `--primary` on light surfaces: `#D4724F` on parchment is only 3.01:1. Eyebrows, links and tag text use `--accent-foreground` (rust).
- **Focus ring (a deviation from the system).** The Claude system uses Focus Blue `#3898EC`, but that is 2.77:1 on parchment, under the 3:1 non-text minimum. The hub keeps a warm terracotta ring (`#C96442`, 3.54:1 on the page, 3.70:1 on cards) and coral `#D97757` in dark.
- **"Ring Subtle" is skipped.** The system page lists it as `#DEDC01`, a saturated yellow that looks like a typo, so it is not used.
- **Destructive** stays crimson, distinct from the orange.

History:
- 2026-10-08: teal, then terracotta `#B4532F` with white text, then light orange `#F59563` with near-black text.
- 2026-10-11: `#C4511A` (rejected as too dark), then bright `#F46530` with white text.
- 2026-10-13: reference-image orange `#D4724F` on Claude-system neutrals (current).

### Contrast checks (WCAG 2.x ratio, computed with a script on 2026-10-13)

| Pair | Light | Dark |
| --- | --- | --- |
| foreground / background | 16.72 | 17.50 |
| card-foreground / card | 17.50 | 12.55 |
| primary-foreground / primary (buttons, pressed toggle) | **3.32** (large text only) | **3.32** (large text only) |
| primary-foreground / primary-hover | 3.90 | 3.90 |
| secondary-foreground / secondary (also the active tab count) | 6.87 | 10.57 |
| muted-foreground / muted (tab counts) | 5.67 | 6.82 |
| muted-foreground / background | 5.98 | 8.29 |
| muted-foreground / card | 6.26 | 5.95 |
| accent-foreground / accent | 6.30 | 9.04 |
| accent-foreground / card (links, tags) | 7.38 | 8.96 |
| accent-foreground / background (eyebrow) | 7.05 | n/a |
| destructive-foreground / destructive | 6.02 | 6.15 |
| destructive text / card | 5.72 | 4.78 |
| sidebar-foreground / sidebar (frame) | **3.32** (large text only) | 13.30 |
| sidebar-accent-foreground / sidebar-accent (active pill) | 3.90 | 9.04 |
| sidebar-primary-foreground / sidebar-primary (monogram) | 3.32 | 3.32 |
| sidebar-ring / sidebar (non-text, ≥3:1) | 3.32 | 5.33 |
| sidebar-ring / sidebar-accent (non-text) | 3.90 | n/a |
| ring / background (non-text, ≥3:1) | 3.54 | 5.90 |
| ring / card (non-text) | 3.70 | 4.24 |
| input / background (non-text) | 3.31 | 4.85 |
| input / card (non-text) | 3.47 | 3.48 |
| primary button edge / background (non-text) | 3.01 | 5.55 |
| Focus Blue `#3898EC` / background (rejected) | 2.77 | n/a |

All text pairs meet AA (4.5:1) except white on orange (3.32 to 3.90:1), which is the accepted user choice above. `--border` is for decorative separation only; form controls use `--input`.

## Typography

These are free substitutes for the Claude system's proprietary faces (Anthropic Serif, Sans and Mono). The user chose them on 2026-10-13.

| Font | Variable | Use |
| --- | --- | --- |
| Source Serif 4 (variable, optical size) | `--font-heading` (`font-heading`) | Page titles, section headings, card and dialog titles, empty-state titles, the brand name, the phone top-bar title |
| Inter (variable) | `--font-sans` (body default) | Body text, nav, buttons, labels, form fields and their values, task titles in lists |
| JetBrains Mono (variable) | `--font-mono` (`font-mono`) | Small read-only meta: eyebrows, dates and times in lists, counts, durations, tab counts, tags |

| Role | Font | Size | Weight and tracking |
| --- | --- | --- | --- |
| Page title (h1) | Serif | `text-3xl`, `lg:text-4xl`; line height 1.2 | 500, normal tracking |
| Dialog title | Serif | `text-2xl` | 500 |
| Section heading (h2), card title | Serif | `text-xl` | 500 |
| Body | Inter | `text-sm` / `text-base`; line height 1.6 | 400 |
| Labels, nav, buttons | Inter | `text-sm`, nav `0.9375rem` | 500, buttons 600 |
| Eyebrow (`.eyebrow`) | Mono | `text-xs`, uppercase | 500, `0.12em`, rust |
| Meta in lists | Mono | 0.75–0.8125rem | 400, `text-muted-foreground` |

Rules:

- **Serif is never bold.** Use weight 500 at every size; do not use `font-semibold` or `font-bold` on `font-heading`.
- **Serif for content headings, sans for UI.** Buttons, labels, inputs and task titles stay in Inter.
- **Mono for short, read-only meta only.** The Claude system reserves mono for code. The hub keeps it for meta and tags because the user's reference image uses it that way, and because it is an accepted earlier choice; record this as a deviation. Never use mono for paragraphs, titles, inputs or buttons.
- **Phones.** Form inputs are at least 16px on phones, which prevents iOS zoom.
- **Loading.** Design references load the fonts from Google Fonts. Production should self-host them, using `@fontsource-variable/source-serif-4` and `@fontsource-variable/inter` in place of `@fontsource-variable/space-grotesk`, keep `@fontsource-variable/jetbrains-mono`, and keep the system fallbacks (Georgia, system sans).

## Spacing, radius, elevation

- **Spacing.** Tailwind's 4px scale. The page gutter is 16px on phones (`px-4`) and 24–48px on laptops. Card padding is 16–24px.
- **Radius.** `--radius` is `0.5rem`, so shadcn derives these values:

  | Utility | Size | Use |
  | --- | --- | --- |
  | `rounded-sm` | 4px | |
  | `rounded-md` | 6px | |
  | `rounded-lg` | 8px | Buttons, nav pills, shortcut chips |
  | `rounded-xl` | 12px | Inputs, selects |
  | `rounded-2xl` | 16px | List cards, app cards, dialogs, the content card |

  Tags and counts are pills. Never go below 6px on buttons or cards.
- **Elevation.**
  - L0: flat.
  - L1: a 1px `--border`.
  - L2: `--elev-ring`, a 1px ring used for outline buttons.
  - L3: `--elev-raised` (`0 4px 24px rgb(0 0 0 / 0.05)`), used for the floating laptop content card.

  Overlays (drawer, dialog, toast) keep a stronger shadow for separation from the dimmed page. Do not add heavy drop shadows elsewhere.

## Components (patterns taken from the reference)

| Pattern | Treatment |
| --- | --- |
| Primary button | `bg-primary text-primary-foreground hover:bg-primary-hover`, semibold, `rounded-lg`. One per view or dialog. |
| Secondary button | `bg-secondary text-secondary-foreground` (Warm Sand) |
| Outline button | `bg-card`, a 1px border and the `--elev-ring` shadow, like the image's "Copy prompt". Hover uses `--accent`. |
| Section tabs | Underline tabs: muted text; the active tab gets foreground text, medium weight and a 2px foreground underline; a mono count pill on `--muted`. The tab row scrolls within itself, never the page. |
| Tag | A pill with a 1px orange border (`border-primary/60`), mono `text-xs`, rust text, on `--card`. |
| Eyebrow | `.eyebrow`: mono, uppercase, tracked, rust, above a page title |
| Cards and lists | `bg-card`, a 1px border, `rounded-2xl`, rows divided by `divide-border`, no shadow |

## Motion

`--motion-fast` is 150ms (hover and colour), `--motion-base` is 200ms (drawer), and `--ease-standard` is `cubic-bezier(0.2, 0, 0, 1)`. Respect `prefers-reduced-motion` by removing transitions.

## Icons

Lucide (the shadcn/ui default; `lucide-react` in production). Use 20px in navigation and 16px inline, with a 1.75–2px stroke. In navigation an icon always comes with a text label; icon-only buttons need an accessible name.

## Using the tokens

Copy the `theme.css` values into the app's `globals.css` and map them for Tailwind v4 with `@theme inline { --color-background: var(--background); … }`, exactly as shadcn/ui does. The design references show that mapping inline. Also map `--color-primary-hover: var(--primary-hover)` and `--font-heading`.

Class names to use include `bg-background`, `hover:bg-primary-hover`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary text-primary-foreground`, `bg-sidebar`, `bg-sidebar-accent`, `border-border`, `ring-ring` and `font-heading`. Feature designs must not use raw hex values or palette utilities such as `bg-orange-700`.

## ui-ux-pro-max research

For the 2026-10-13 change, no new search was run. The direction came from the user's explicit design-system choice and their reference image, which take priority over advisory research. Earlier findings (from the skill's CSV data, read with grep because Python is not installed) still apply in principle: one accent on neutrals, and warm cream neutrals. The earlier font recommendations (Inter only, then Space Grotesk) are superseded.

## Open questions

- White on orange is AA for large text only, an accepted user choice. If full AA is required later, darken the primary or switch labels to near-black.
- Dark-mode sidebar: it stays charcoal (an assumption), or it could become orange like the light theme.
- The focus ring is terracotta, not the system's blue, to meet 3:1. This can be revisited if the user wants the blue.
- Product name and logo mark: "Personal Hub" with a monogram placeholder until branding is decided.
