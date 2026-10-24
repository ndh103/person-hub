# Inspiration: design notes

- Feature slug: `inspiration`
- Status: `ready` (sufficient for implementation handoff; not user-approved)
- Date: 2026-10-24
- Requirements: [requirements/inspiration.md](../../../requirements/inspiration.md) v1, INS-001 to INS-011.
- Inputs: [foundation](../_foundation/design-system.md), [theme.css](../_foundation/theme.css), [app shell](../app-shell/design-notes.md), [Events design](../events/design-notes.md) (header, search, dialogs, link rendering).
- Architecture: [docs/architecture/inspiration.md](../../../docs/architecture/inspiration.md), [ADR-0009](../../../docs/architecture/decisions/ADR-0009-inspiration-image-storage.md).

## Preview

Open `index.html` from this folder. Like the other references, it needs a network connection for Google Fonts and the pinned Tailwind browser runtime `@tailwindcss/browser@4.1.11` (prototype only), and loads `../_foundation/theme.css` and `../app-shell/styles.css`. The list, the states and both detail views are shown on one page for review; the buttons open the dialogs. "Prototype controls" toggle the storage warning. Fixture images are token gradients; all data is synthetic.

## Page structure

```
Inspiration                          [ Add article ] [ Add images ]
Images: 48 MB used
Search inspiration           Show                    Tag
[🔍 Title, notes, text… ]   [All|Articles|Images]   [All tags ▾]
24 entries
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ thumb  │ │Article │ │ thumb  │ │ thumb  │   2 cols phone, 3 from 640px, 4 from 1280px
│ title  │ │ title  │ │ #tag   │ │        │
│ #tags  │ │ excerpt│ │        │ │        │
└────────┘ └────────┘ └────────┘ └────────┘
                  [ Load more ]
```

- **Header (INS-001, INS-009).** Same title style as Events; the mono line under the title is the usage figure instead of "Today". "Add images" is the primary action (the most common on a phone); "Add article" is outline. The 800 MB warning is a muted note under the header.
- **Filters (INS-008).** Search, a kind toggle group and a tag select. Stacked on phones; one row from 640px.
- **Grid (INS-002).** Each card is a single link to `/inspiration/<id>`. Image cards: 4:3 cropped thumbnail, title (2 lines), up to 3 tags. Article cards: "Article · host" mono line, serif title, 3-line excerpt, tags. Cards keep a uniform width; heights may differ (CSS grid with `align-items: start` is fine, no masonry library).
- **Failed thumbnail:** muted box with an image icon and "Image unavailable".

## Detail view (INS-005)

A page (not a dialog) at `/inspiration/<id>`, with a back link to the list that keeps the filters.

- Image: full stored image fitted with `object-contain`, max 70dvh, muted background; then title, "Image · Added …", tags as buttons (apply the filter), notes, source link, Edit and Delete.
- Article: title, meta line, link, tags, "Why it inspires me" in a muted panel, then the article text in the serif heading font at ~17px with `max-width: 68ch` for reading. Text and notes use `white-space: pre-wrap`; markup shows literally.

## Dialogs

- **Add images (INS-004):** a dashed drop/choose area wrapping a visually hidden `<input type=file multiple accept="image/jpeg,image/png,image/webp,image/gif">` (on iOS this offers Photo Library, Take Photo and Files, and converts HEIC to JPEG). A per-file list with a mini preview, file name and status (waiting, uploading with spinner, saved with check, failed or rejected with a destructive message and a Remove button, plus "Try again" for failures). Title shows only when one file is chosen; Source, Notes ("Why it inspires me") and Tags apply to all. The submit button shows "Saving…" with a spinner while uploading. A polite live region announces "1 of 2 images saved".
- **Add / Edit article (INS-003, INS-006):** Title, Link, Article text (8 rows, count "1,204 / 50,000"), Why it inspires me, Tags. Field errors below each field. Image edit uses the same dialog without Article text.
- **Delete (INS-007):** AlertDialog naming the entry; for images the description says the file is deleted too. Cancel first (initial focus).

## Tokens and styles

Foundation tokens only. `styles.css` adds the thumbnail ratios, tag chips (`--muted` background, mono 12px; 44px tall when they are buttons), the reading measure, skeleton and spinner animations (disabled under reduced motion) and the dialog frame (same as Events).

## shadcn/ui mapping

| Element | Component |
| --- | --- |
| Add buttons, Load more, card actions | `Button` (default / outline) |
| Kind filter | `ToggleGroup` (single) |
| Tag filter | `Select` |
| Search | `Input` + `Label` |
| Cards | plain `<a>` styled like `Card` (whole card is one link) |
| Tags | `Badge` (secondary); as `Button` variant ghost-like on detail |
| Upload / Article dialogs | `Dialog`; discard confirmation `AlertDialog` |
| Delete | `AlertDialog` |
| Empty / no-match | `Empty` |
| Loading | `Skeleton` |
| Errors | `Alert` (destructive); form errors via `FormField` |
| Toasts ("Article saved", "3 images saved", "Entry deleted") | existing `toast` |

## Accessibility

- Images: `alt` = title, else "Image saved on <date>" (INS-011). Fixture boxes use `role="img"` with the same label.
- Kind toggle uses `aria-pressed`; the result count is a polite status.
- The file input stays a real input (label wraps the visible area) so keyboard and screen readers can open the picker.
- Dialog focus: native `<dialog>` in the prototype; Base UI dialogs in production.

## ui-ux-pro-max

Not run for this feature: Python is not installed on this machine (`python` resolves to the Microsoft Store stub). Choices follow the existing Events patterns and the foundation instead.

## Checks performed

- Built from the Events reference shell; markup reviewed for 320px (two-column grid with `min-w-0` text, `overflow-wrap:anywhere`, stacked filters).
- Not checked in a browser at phone width in this run.

## Open questions

None blocking. Masonry-style layout and a lightbox for full-screen viewing could be added later.
