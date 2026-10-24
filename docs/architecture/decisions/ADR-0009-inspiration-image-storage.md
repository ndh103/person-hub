# ADR-0009: Inspiration images live in a private Supabase Storage bucket; the browser uploads and downloads with API-issued signed URLs

- Status: accepted (Technical Architect, 2026-10-24, for the Inspiration implementation. Storage choice confirmed by the user on 2026-10-24; this ADR is not a record of user approval of the rest.)
- Date: 2026-10-24
- Related: [requirements/inspiration.md](../../../requirements/inspiration.md) (INS-004, INS-009, INS-010), [docs/architecture/inspiration.md](../inspiration.md), [ADR-0003](ADR-0003-spa-and-worker-api.md), [ADR-0004](ADR-0004-events-table-writes-under-rls.md)

## Context

Inspiration stores image files. Constraints:

- **Free plans only (user decision 2).** Supabase Free: 1 GB file storage, 5 GB uncached + 5 GB cached egress per month, 50 MB per file, no image transformations (a paid feature). Cloudflare Workers Free: 100 MB request bodies, 10 ms CPU per request. Recheck both before relying on them; they change.
- **ADR-0003 data flow:** application reads and writes go through the Worker API, and `guardWrites` accepts JSON bodies only (32 KB by default). Binary uploads don't fit that shape.
- **Security baseline:** owner-only access that stays safe under direct Supabase requests; personal responses out of shared and browser caches.

## Alternatives

1. **Cloudflare R2.** 10 GB free and free egress, bound to the Worker. Rejected by the user: it needs a payment card on the account, has no RLS (the Worker becomes the only access control), and adds a second storage provider.
2. **Cloudflare Images.** Storage is a paid feature. Rejected.
3. **Upload through the Worker** (multipart or raw body to `/api/inspiration/images`, Worker writes to Storage). Keeps "everything through the API", but every byte crosses the Worker twice (in and out), multi-megabyte bodies need a second write-guard shape, and CPU time on the free plan is tight for streaming several images.
4. **Images in Postgres** (`bytea`). Uses the 500 MB database quota and makes every list read heavy. Rejected.
5. **Private Storage bucket; the Worker issues signed URLs; the browser moves the bytes.** (Chosen.)

## Decision

- **Bucket** `inspiration`: private (`public = false`), `file_size_limit` 5 MB, `allowed_mime_types` `image/webp` and `image/jpeg`. Created by migration.
- **Object paths:** `<user id>/<image key>/full` and `<user id>/<image key>/thumb`. The Worker generates the image key (random UUID) and builds the path from the verified user id; no path comes from input.
- **Storage RLS on `storage.objects`** for `authenticated`, each limited to `bucket_id = 'inspiration'` and `(storage.foldername(name))[1] = auth.uid()::text`: `select`, `insert` and `delete`. No `update` policy, so objects can't be overwritten (no upsert). Nothing for `anon`.
- **Upload:** the browser resizes the image (INS-004), then asks `POST /api/inspiration/uploads` (JSON). The Worker, as the caller, calls `createSignedUploadUrl` for both paths and returns `{ key, full: { path, token }, thumb: { path, token } }`. The browser sends each file with `supabase.storage.from('inspiration').uploadToSignedUrl(path, token, blob)`. Signed upload URLs are valid for 2 hours (fixed by Supabase).
- **Create:** `POST /api/inspiration` with `{ kind: 'image', imageKey }` and the text fields. The Worker lists `<uid>/<key>/` as the caller, requires both objects with an allowed MIME type, stores the summed size as `image_bytes`, and inserts the row. A row can only point at its own owner's folder: the path is derived from the row's `user_id`.
- **Download:** list and detail responses carry `createSignedUrls(paths, 3600)` links made as the caller (thumbnails in the list, `full` on the detail). The browser puts them in `<img src>`.
- **Delete:** the Worker deletes the row, then removes both objects with the Storage API (`remove`). A cancelled upload is discarded with `DELETE /api/inspiration/uploads/:key`, which refuses keys that a saved entry still uses.
- **CSP:** `img-src` adds `blob:` (local previews of chosen files) and `https://*.supabase.co` (signed links). `connect-src` already allows `https://*.supabase.co`.
- **No elevated credentials.** All Storage calls use the caller's token and the publishable key, so Storage RLS applies to the Worker exactly as to a direct request.

### Documented exceptions to the baseline

- **Bytes bypass the Worker (ADR-0003).** Image bytes go between the browser and Supabase Storage directly. Authorization stays server-side: the Worker decides the path and issues the token, and Storage RLS independently restricts each user to their own folder. Metadata (titles, notes, tags, which files belong to which entry) still only goes through the API.
- **Images may be cached by the owner's browser.** Storage serves objects with `Cache-Control: max-age=<seconds>` set at upload; it has no `no-store` option. Uploads set `max-age=3600`, matching the link lifetime, so a list refresh doesn't re-download every thumbnail within the hour (the egress budget). The URLs carry an unguessable, expiring token and are only issued to the owner, but the file can remain in that device's HTTP cache after sign-out until evicted. This is weaker than the "no browser cache" rule for API responses and is accepted for images only. Revisit if the hub is used on shared devices.
- **Signed links are bearer capabilities** for up to an hour: anyone who obtains the URL in that time can fetch the image. They are never logged by the app; the referrer policy sends no path to other sites.

## Consequences

- **Positive:** owner isolation is enforced twice (Worker path choice and Storage RLS); no binary bodies in the Worker; stays on free tiers; resizing in the browser keeps storage and egress small and strips EXIF location data.
- **Negative:**
  - Orphans: an upload that is never saved or discarded (tab closed mid-way) leaves up to two objects in the user's folder. See TD-INS-1.
  - A failure after the row is deleted leaves files behind (logged by code only). Same debt entry.
  - Usage (`image_bytes`) is reported by the Worker at create time; a direct-database insert could misstate the caller's own number. It only affects that user's informational display (INS-009).
  - 1 GB is shared by the whole Supabase project. See TD-INS-2.
- **To verify on the hosted project** (not reproducible in the local PGlite tests, which stub the `storage` schema): that `createSignedUploadUrl` refuses a path outside the caller's folder (RLS checked at signing or at upload), that `storage.buckets` has the `file_size_limit` and `allowed_mime_types` columns used by the migration, and that `remove` needs the `select` and `delete` policies only.

## Revisit when

- Storage use approaches 800 MB, or monthly egress approaches the free allowance: consider R2 (with a card) or Supabase Pro.
- Images must be saved from URLs (server-side fetching would need SSRF controls).
- The hub is used on shared or public computers (browser caching of images).
