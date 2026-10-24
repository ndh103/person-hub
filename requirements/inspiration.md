# Inspiration: requirements

## Metadata

- Feature slug: `inspiration`
- Status: `ready`
- Version: 1 (2026-10-24)
- Source: the user's request on 2026-10-24: "I want to have the ability to store Articles, or images that inspired me … I want to keep using the free plan of Supabase and Cloudflare." Answers the same day: images are stored in Supabase Storage; an article is a link plus pasted text; entries are organized with tags; the app is called Inspiration; one image per entry.
- Related: [project brief](../docs/project-brief.md), [Events requirements](events.md) (shared link, date and search conventions), security baseline in [CLAUDE.md](../CLAUDE.md#security-baseline). Design: [output/designs/inspiration/](../output/designs/inspiration/design-notes.md). Architecture: [docs/architecture/inspiration.md](../docs/architecture/inspiration.md) and [ADR-0009](../docs/architecture/decisions/ADR-0009-inspiration-image-storage.md). Test report: [docs/testing/inspiration.md](../docs/testing/inspiration.md).

## Goal and target user

The signed-in hub owner wants one private place for things that inspired them: articles they read and images they saw. Later they want to browse them, find one again by a word or a tag, and remember why it mattered.

Target user: the authenticated account owner, on phone and laptop browsers. All Inspiration data, including image files, is private to its owner.

## Scope

### In scope

- Two kinds of entry: **Article** and **Image**.
- Save an article: title, optional link, optional pasted text, optional notes, tags.
- Upload an image from the device (phone camera roll or laptop file), with optional title, source link, notes and tags. One image per entry; choosing several files creates several entries.
- A browsable list of entries, newest first, with image thumbnails.
- View, edit and delete an entry. Deleting an image entry deletes its file.
- Filter by kind and by tag, and search by text.
- A display of how much image storage the user is using.
- Inspiration as the third app in the shell navigation, at `/inspiration`.

### Out of scope

- Fetching anything from a link: no link previews, page titles, preview images or automatic article copies. The user pastes the text themselves.
- Saving an image from a web address (only uploads from the device).
- Several images per entry, albums or collections; replacing an entry's image (delete and add again).
- Image editing (crop, rotate, filters) beyond the automatic resize (INS-004).
- Rich text, Markdown or HTML in article text or notes. All text is plain.
- Videos, PDFs and other files.
- Sharing, public links, export, import, reminders, and Home-page summaries.
- Undo after delete, trash or archive.
- Paid storage or image services.

## Fields and validation

All text is trimmed and Unicode-normalized (NFC) before validation and storage, as in Events. Limits are enforced on the server. The server sets ownership, kind-specific file references and timestamps. Only the fields below can be written.

| Field | Label | Article | Image | Rules |
| --- | --- | --- | --- | --- |
| Kind | – | – | – | `article` or `image`, chosen by the action ("Add article" / "Add images"). Cannot be changed after creation |
| Title | Title | Required | Optional | 1–200 characters |
| Link | Link (article) / Source (image) | Optional | Optional | Same rules as Events: ≤ 2048 characters, absolute `http`/`https` URL with a host; `https://` is added when the scheme is missing |
| Text | Article text | Optional | – | ≤ 50,000 characters. Plain text; line breaks are kept. Not accepted for images |
| Notes | Why it inspires me | Optional | Optional | ≤ 2000 characters. Plain text; line breaks kept |
| Tags | Tags | Optional | Optional | Up to 10 tags. Each tag 1–32 characters, no commas or line breaks, stored in lower case, duplicates (after lower-casing) removed |
| Image file | Image | – | Required | JPEG, PNG, WebP or GIF as picked by the user, up to 20 MB before resizing (INS-004). Stored as resized WebP or JPEG |

Server-set data: owner, kind, image references and stored size, created time and last-updated time (UTC instants).

## Requirements

### INS-001 Navigation (Must)

Inspiration is the third app in the shell's Apps group, after Finisher and Events, at `/inspiration`, and has a Home card like the other apps.

- Given a signed-in user, when they select Inspiration, then the entry list opens (INS-002), the nav item is marked current, the page title is "Inspiration · Personal Hub", and focus moves to the page heading.
- Given a signed-out visitor opens `/inspiration`, then they are sent to sign-in and come back after signing in.

### INS-002 Entry list (Must)

- **Order:** newest first by creation time; ties by id. Editing does not move an entry.
- **Image entries** show a thumbnail (cropped to a uniform shape), the title if any, and up to three tags.
- **Article entries** show the title, the link's host when present, the first lines of the notes (or of the text when there are no notes), and up to three tags.
- Images and articles appear together in one list unless filtered (INS-008). The layout (grid, cards, rows) is a design choice; on phone it must stay one or two columns without horizontal overflow.
- **Paging:** 30 entries load first, then "Load more" loads the next 30. No entry is duplicated or skipped.
- **Loading:** skeleton cards. **Error:** an error message with Retry; never partial or another account's data.
- **Empty:** "Nothing saved yet. Keep an article or an image that inspired you." with "Add article" and "Add images" actions.
- A thumbnail that fails to load shows a neutral placeholder with the text "Image unavailable"; the rest of the entry still works.
- "Add article" and "Add images" are always reachable at the top of the page.

### INS-003 Save an article (Must)

- Given the user chooses "Add article", then a form opens with Title (focused), Link, Article text, Notes and Tags.
- Given valid input, when submitted, then the entry is saved, appears at the top of the list, and "Article saved" is announced.
- Example: Title "Designing calm interfaces", Link `example.com/calm`, Text (pasted paragraphs), Notes "Use fewer colors", Tags "design, ui" → saved with link `https://example.com/calm` and tags `design`, `ui`.
- **Validation:** a missing title, an invalid link, over-long text, notes or tags, or more than 10 tags show an error next to the field; values are kept; focus moves to the first invalid field; nothing is saved. The server applies the same rules.
- **Failure:** a server or network failure shows a general error and keeps the values. The submit button is disabled while saving, so a double tap does not create two entries.
- **Cancel:** closing with unsaved input asks to confirm discarding it (as Events A5).
- The article text field shows a character count against the 50,000 limit.

### INS-004 Upload images (Must)

- Given the user chooses "Add images", then a form opens with a file picker (accepting JPEG, PNG, WebP and GIF; several files allowed, up to 10 at a time), and Title, Source, Notes and Tags.
- On phones the picker offers the photo library and, where the device supports it, the camera.
- After choosing files, each is previewed in the form before upload. The user can remove a chosen file before saving.
- **Title** is shown and saved only when exactly one file is chosen. With several files, the Source, Notes and Tags apply to every created entry and titles are left empty.
- **Resize before upload:** each image is scaled in the browser so its longer side is at most 2048 pixels, and re-encoded (WebP where the browser supports it, otherwise JPEG). A small thumbnail (longer side 480 pixels) is made the same way. The original file is not uploaded. Re-encoding drops embedded metadata such as camera location (privacy benefit). Orientation is kept as the photo appears on the device. Animated GIFs are stored as their first frame (A6).
- **Progress:** the form shows per-file status (waiting, uploading, saved, failed) and stays open until all files are done. Status is also announced politely ("2 of 3 images saved").
- **Success:** each image becomes its own entry and appears at the top of the list. When all succeed, the form closes and "3 images saved" is announced.
- **Partial failure:** files that failed stay listed with "Failed" and a "Try again" action; successful ones are saved and not uploaded twice.
- **Rejections (before any upload):** a file that is not a supported image, cannot be decoded by the browser (for example HEIC on a laptop), or is over 20 MB shows an error on that file ("This file type isn't supported" / "This image is too large") and is not uploaded; the other files can still be saved. Choosing more than 10 files keeps the first 10 and says so.
- **Cancel:** before saving, closing discards the chosen files (with confirmation if anything was chosen or typed). Nothing is left stored for files that were never saved (INS-010).
- The submit button is disabled while uploading.

### INS-005 View an entry (Must)

- Selecting an entry opens its detail view with: the image at full stored size (fitted to the screen, not cropped) for images; title; link (as its host and path, opening in a new tab with `rel="noopener noreferrer"`, only `http`/`https` clickable); full article text and notes with line breaks kept; tags; added and updated dates ("24 Oct 2026"); Edit and Delete actions.
- Article text and notes are plain text. HTML or markup is shown literally, never interpreted.
- An entry that does not exist or is not the user's own shows "Entry not found" with a way back, without revealing whether it exists for someone else.
- The detail view has its own URL (`/inspiration/<id>`) so a reload or back/forward reopens it. Page titles stay generic ("Entry · Inspiration").
- For a long article the text is readable at phone width (comfortable line length on laptop).

### INS-006 Edit an entry (Must)

- Edit opens the same form as INS-003 (articles) or the text fields of INS-004 (images: Title, Source, Notes, Tags) with current values. The image itself and the kind cannot be changed.
- Optional fields can be cleared; an article's title cannot.
- On save the entry is updated in place and "Entry updated" is announced. Validation, failure, pending and cancel behave as INS-003.
- If the entry was deleted elsewhere, saving fails with "This entry no longer exists" and the list refreshes.

### INS-007 Delete an entry (Must)

- Delete asks for confirmation naming the entry ("Delete 'Designing calm interfaces'?", or "Delete this image?" when it has no title) and says it cannot be undone; for images, that the image file is deleted too.
- On confirm the entry and its image files are permanently deleted, the user returns to the list (from the detail view), and "Entry deleted" is announced.
- Cancel changes nothing. Failure shows an error and keeps the entry. Deleting an entry that is already gone counts as success.

### INS-008 Filter and search (Must)

- **Kind filter:** All (default), Articles, Images.
- **Tag filter:** a control lists the user's tags (most used first, then alphabetical) with counts; choosing one shows only entries with that tag. One tag at a time.
- **Text search:** matches entries whose title, notes, article text or tags contain (the link is not searched, as in Events) the text, ignoring case and Vietnamese accent marks (as Events A13). At most 100 characters. Results keep the INS-002 order (no exact-first grouping; A3).
- Kind, tag and search combine (all must match). The values are kept in the page URL so reload and back/forward restore them; search text is sent to the API in a request body, never in an API URL (as Events EVT-007).
- The list updates after a short pause while typing, without a page reload.
- **No matches:** "No entries match …" with "Clear search and filters", distinct from the empty state. A polite status announces the result count.
- Tapping a tag on an entry (list or detail) applies that tag filter.

### INS-009 Storage usage (Should)

- The page shows how much image storage the user's entries use, for example "Images: 48 MB used". It is informational; the hub does not enforce a per-user quota (A4).
- When the user's images exceed 800 MB, a warning explains that the free storage plan holds about 1 GB for the whole hub and suggests deleting images they no longer need.

### INS-010 Ownership, permissions and privacy (Must)

- Only authenticated, non-anonymous users can use Inspiration. Requests without a valid session are rejected.
- A user can list, search, view, create, edit and delete only their own entries **and image files**. Ownership comes from the verified session, never from input, and cannot be changed.
- Another user's entries and files behave as if they do not exist, through the API and through direct Supabase requests (database and storage) made with the caller's session. Tag lists, counts and usage include only the caller's data.
- Image files are never public. They are displayed through short-lived links that the API issues to the owner only (at most 1 hour; A2). A copied link stops working after it expires.
- Content (titles, text, notes, tags, links, images) and search text must not appear in logs, analytics, error reports or shared caches. Images are not stored in browser storage by the app.
- The app never fetches or previews the linked page.
- Files uploaded for an entry that was never saved (cancelled or interrupted) are removed when the user cancels; leftovers from an interrupted upload must not be visible to anyone else and are tracked as technical debt.

### INS-011 Responsive layout and accessibility (Must)

- Phone (< 1024px): no horizontal overflow at 320px; one or two columns; touch targets ≥ 44px; add actions and search reachable without scrolling a long list.
- Laptop (≥ 1024px): a multi-column grid is allowed.
- Every image has a text alternative: its title when present, otherwise "Image saved on 24 Oct 2026". Decorative placeholders are hidden from assistive technology.
- All actions work by keyboard with visible focus; dialogs trap and return focus; fields are labelled; errors are linked and announced; upload progress is announced politely.
- Motion respects reduced-motion settings.

## Business rules

- **Order:** created time descending, then id descending; stable for paging.
- **Dates shown:** "Added 24 Oct 2026" in the browser's timezone from the UTC created instant (same as Events "Added").
- **Tags** are compared case-insensitively by storing them lower-cased; "Design" and "design" are one tag. Order within an entry is kept as entered.
- **Image sizes:** stored image ≤ 2048 px on the longer side, thumbnail ≤ 480 px; each stored file ≤ 5 MB (A5).
- **No automation:** entries change only by user action.

## Confirmed decisions

From the user, 2026-10-24:

1. Store articles and images that inspired them.
2. Stay on the Supabase and Cloudflare free plans; images are stored in Supabase Storage.
3. An article holds a link and pasted text (plus title and notes).
4. Entries are organized with tags.
5. The app is called Inspiration.
6. One image per entry.

## Assumptions (reversible proposed defaults)

- A1. Text, title, tag and file limits in the Fields table and the page size of 30 are proposed defaults.
- A2. Image links issued by the API expire after 1 hour; the list refetches links when they are older than about 50 minutes.
- A3. Search is a single accent-insensitive "contains" match (not Events' two groups), because tags and kind filters already narrow results.
- A4. No per-user quota: the hub has one or few users; the warning in INS-009 is advice only.
- A5. Re-encoding quality and sizes (2048 / 480 px) are chosen to keep a typical photo around 0.3–0.8 MB, so the 1 GB free storage holds well over a thousand images.
- A6. GIF animation is not preserved (first frame only).
- A7. Choosing several files applies the same source, notes and tags to each entry.
- A8. Deletion is permanent with confirmation (as Events).

## Open questions

None blocking. Possible later additions: saving images from a URL, several images per entry, export.

## Change notes

- **2026-10-24, v1.** Initial specification (INS-001 to INS-011). **Affects:** new design, architecture, migration (table, Storage bucket and policies), API, UI and tests; the shell's app registry and the CSP `img-src`.

## Handoff dependencies

- **Designer:** list/grid with thumbnails, article cards, filters, empty/no-match/error/loading states, the article form, the multi-file upload form with per-file progress and errors, the detail view for both kinds, the delete dialog, and the usage line/warning.
- **Technical Architect:** table and constraints, tags representation and tag listing, accent-insensitive search, keyset paging, Storage bucket configuration and owner-folder policies, the signed upload and download flow given the API's JSON-only write guard, delete and cleanup of files, CSP changes, free-tier limits.
- **Tester:** INS-010 for anonymous, owner and another user through the API and directly against the database and storage policies; validation limits; tag normalization; search with accents and filters; paging; upload rejections and partial failures; delete removes files.
