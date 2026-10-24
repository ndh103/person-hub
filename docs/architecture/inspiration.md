# Inspiration: architecture

- Feature slug: `inspiration`
- Status: `ready`
- Date: 2026-10-24
- Requirements: [requirements/inspiration.md](../../requirements/inspiration.md) v1 (INS-001 to INS-011)
- Design: [output/designs/inspiration/](../../output/designs/inspiration/design-notes.md)
- Decisions: [ADR-0009](decisions/ADR-0009-inspiration-image-storage.md) (image storage, signed URLs); table writes follow [ADR-0004](decisions/ADR-0004-events-table-writes-under-rls.md) (owner RLS, column grants, CHECK constraints as the authority, invoker search functions)
- Debt: [TD-INS-1, TD-INS-2](technical-debt.md)

## Context and constraints

- One table of entries (`article` or `image`), one private Storage bucket. Single-row writes with static per-row rules, so the ADR-0004 pattern applies unchanged.
- Free tiers: Supabase 500 MB database, 1 GB storage, 5 + 5 GB egress, 50 MB per file, no image transformations. Workers 10 ms CPU. Article text is capped at 50,000 characters, images are resized in the browser.
- Search must ignore Vietnamese accents (as Events A13) across title, notes, article text and tags.

## Components and data flow

```text
Browser (React, TanStack Query)
  │  JSON + Bearer  ─────────────► Worker /api/inspiration (Hono, Zod, requireUser)
  │                                   └─► features/inspiration/server (queries, mutations, storage)
  │                                          └─► Supabase as the caller: PostgREST (RLS) + Storage (RLS)
  │  image bytes (PUT, signed token) ───────────────────────► Supabase Storage (bucket inspiration)
  └  <img src=signed URL> ──────────────────────────────────► Supabase Storage
```

- `src/worker/inspiration.ts`: routes and request validation.
- `src/features/inspiration/server/`: `queries.ts` (list, detail, tags, usage, signed links), `mutations.ts` (create, update, delete, uploads), `errors.ts`.
- `src/features/inspiration/domain/validation.ts`: field parsers shared by the form and the Worker. `domain/image.ts`: pure resize maths.
- `src/features/inspiration/upload.ts` (browser only): decode, resize, encode, and send to the signed upload URL with the browser Supabase client's Storage API (ADR-0009). That client is used for Storage uploads only; data reads stay behind the API.

## API (`/api/inspiration`, all behind `requireUser`, all `private, no-store`)

| Method and path | Body / params | Returns | Errors |
| --- | --- | --- | --- |
| `POST /query` | `{ q?: string ≤ 100, kind?: 'article'\|'image', tag?: string ≤ 32, cursor?: string ≤ 512 }` | `{ items: ListItem[], nextCursor, count? }` (count on the first page) | 400 invalid body or cursor |
| `GET /tags` | – | `{ tags: { tag, count }[] }` (≤ 200) | |
| `GET /usage` | – | `{ bytes: number }` | |
| `GET /:id` | UUID, else 404 | `{ item: Detail }` | 404 missing or not the caller's |
| `POST /uploads` | `{ contentType: 'image/webp'\|'image/jpeg' }` | `{ key, full: { path, token }, thumb: { path, token } }` | 503 Storage unavailable |
| `DELETE /uploads/:key` | UUID, else 404 | `{ ok: true }`; does nothing when an entry uses the key | |
| `POST /` | article: `{ kind, title, link?, body?, notes?, tags? }`; image: `{ kind, imageKey, title?, link?, notes?, tags? }` | `{ item: ListItem }`, 201 | 422 field errors; 400 unknown fields; 409 `upload_missing` |
| `PATCH /:id` | any of `title, link, body, notes, tags` (`body` only for articles) | `{ item: ListItem }` | 404, 422, 400 |
| `DELETE /:id` | – | `{ ok: true }` (idempotent) | |

- Bodies: strict field allowlists, then the domain parsers. Create and update accept up to 256 KB (article text); everything else keeps the 32 KB default.
- Search text, tag and kind travel in the POST body, never in the API URL (logs record URLs).
- `ListItem`: `id, kind, title, link, excerpt (≤ 280 chars of notes, else text), hasText, tags, thumbUrl (images), createdAt, updatedAt`. `Detail` adds `notes, body, imageUrl`. Never `user_id`, `image_key`, `search_folded`.
- Signed links: `createSignedUrls(paths, 3600)`. The SPA keeps Inspiration queries fresh for 30 minutes (`staleTime`), so links in the cache are always well inside their hour.
- Cursor: opaque base64url JSON `{ c: created_at, i: id }`, re-validated on decode.
- Errors map by SQLSTATE only, as Events; no database or Storage text reaches the client or the logs.

## Database (`supabase/migrations/20261024130000_inspiration.sql`)

### `public.inspiration_items`

| Column | Type | Rule |
| --- | --- | --- |
| `id` | uuid pk | default `gen_random_uuid()` |
| `user_id` | uuid | not null, default `auth.uid()`, FK `auth.users` on delete cascade |
| `kind` | text | `in ('article','image')` |
| `title` | text | null or 1–200 code points, non-blank, NFC; required when `kind = 'article'` |
| `link` | text | null or ≤ 2048 and `^https?://host` (as Events) |
| `body` | text | null or 1–50,000, NFC; must be null for images |
| `notes` | text | null or 1–2000, NFC |
| `tags` | text[] | not null default `{}`; `inspiration_private.valid_tags`: ≤ 10, each 1–32, trimmed, no comma or line break, NFC, no duplicates |
| `image_key` | uuid | not null exactly when `kind = 'image'`; unique per user |
| `image_bytes` | integer | not null exactly when `kind = 'image'`; 0–10 MB |
| `search_folded` | text | generated: `inspiration_private.fold(title, notes, body, tags)` |
| `created_at`, `updated_at` | timestamptz | defaults; trigger maintains `updated_at` |

- Index `(user_id, created_at desc, id desc)`.
- RLS enabled; all privileges revoked from `public`, `anon`, `authenticated`. `authenticated`: `select`, `delete`; `insert (kind, title, link, body, notes, tags, image_key, image_bytes)`; `update (title, link, body, notes, tags)`. Kind, image and ownership cannot change.
- Owner policies for select, insert (with check), update (using + with check), delete on `user_id = (select auth.uid())`.
- Tags are lower-cased by the Worker. The database does not check case (Postgres `lower()` depends on the collation, which could disagree with JavaScript); a direct insert with mixed case only affects the caller's own tag list.

### Functions (`SECURITY INVOKER`, `STABLE`, execute for `authenticated` only)

- `inspiration_page(p_q, p_kind, p_tag, p_after_created, p_after_id, p_limit)`: list columns plus `image_key`, ordered `created_at desc, id desc`, keyset after the cursor, limit capped at 101. Search: `strpos(search_folded, fold(q)) > 0`.
- `inspiration_count(p_q, p_kind, p_tag)`: total matches.
- `inspiration_tags()`: `(tag, uses)` ordered by uses desc, tag; limit 200.
- `inspiration_usage()`: `coalesce(sum(image_bytes), 0)::bigint`.
- `inspiration_private.fold(...)` is `IMMUTABLE` (the generated column needs it), and copies the Events folding rule rather than sharing `events_private`, to keep the modules separate.

### Storage

- Bucket `inspiration` (`public false`, 5 MB, `image/webp` + `image/jpeg`), inserted with `on conflict do nothing`.
- Policies on `storage.objects` for `authenticated`: `inspiration_objects_select_own`, `_insert_own`, `_delete_own`, each on `bucket_id = 'inspiration' and (storage.foldername(name))[1] = (select auth.uid()::text)`. No update policy.

## Flows

- **Image create.** Browser: decode with `createImageBitmap(file, { imageOrientation: 'from-image' })`, draw to a canvas at ≤ 2048 px and ≤ 480 px, `toBlob('image/webp', 0.82)`, fall back to JPEG when the browser returns another type. `POST /uploads` → two `uploadToSignedUrl` calls → `POST /` with `imageKey`. Cancel or removal of a file after its upload → `DELETE /uploads/:key`.
- **Delete.** Read `kind, image_key` (RLS), delete the row, then `remove([full, thumb])`. Storage failure after the row is gone is logged by code and leaves an orphan (TD-INS-1).
- **Edit.** Read the row's kind first; `body` on an image entry is a 422 field error.

## Threats and controls

| Threat | Control |
| --- | --- |
| Direct PostgREST requests | Same column grants, owner policies and CHECK constraints as the API |
| Direct Storage requests (upload, read, list, delete another user's folder) | Storage RLS on the first folder segment; no update policy; private bucket |
| Spoofed owner or path | `user_id` from `auth.uid()`; paths built by the Worker from the verified user; rows derive paths from their own `user_id` |
| A row pointing at another user's image | Impossible: path = `<row.user_id>/<image_key>/…`; `image_key` is unique per user only |
| Oversized or wrong-type files | Bucket `file_size_limit` and `allowed_mime_types` (authoritative), browser checks first |
| Article text bloating the database | 50,000-character constraint; 256 KB body limit |
| Stored XSS via text, tags, link | React text rendering only; links re-checked with `isSafeLink` before rendering; no `dangerouslySetInnerHTML` |
| SVG or HTML disguised as an image | Only WebP/JPEG accepted by the bucket; the browser re-encodes everything through a canvas |
| Leaked signed URL | 1-hour expiry; issued only to the owner; never logged (ADR-0009) |
| Shared caching | API responses `private, no-store`; image caching exception documented in ADR-0009 |
| CSRF | Bearer tokens, JSON-only writes, foreign `Origin` refused (unchanged) |
| Anonymous sign-ins (if ever enabled) | Same hub-wide note as Events: policies would need an `is_anonymous` restriction |

## Test obligations

- Database (`supabase/tests/inspiration-rls.test.ts`, PGlite with a stubbed `storage` schema): owner, other user and anon for select/insert/update/delete; column-grant denials (kind, image_key, user_id, timestamps); every constraint; search folding and filters; keyset paging; tags and usage scoped to the caller; Storage policies for own folder, other folder and anon.
- API (`tests/unit/api-inspiration.test.ts`): 401 before data access; write guards; strict allowlists; body limits; upload path derived from the session; create refuses a missing upload; delete removes files; safe errors; no-store.
- Domain (`tests/unit/inspiration-domain.test.ts`): field parsers, tag normalization, resize maths.
- Manual on the hosted project: the ADR-0009 "to verify" list, and a real upload from a phone.

## Implementation and rollout

1. Migration (additive). The deploy workflow applies it with `supabase db push`.
2. Worker routes and services; SPA pages; app registry; CSP.
3. Rollback: revert the Worker; the table and bucket can stay. Dropping them is a separate, reviewed migration (the free plan has no point-in-time restore).
