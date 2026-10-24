# Inspiration: implementation notes

- Feature slug: `inspiration`
- Status: `ready` for Tester on a real Supabase project. Not run against hosted Supabase, not deployed (see "Not verified").
- Date: 2026-10-24
- Inputs: [requirements](../../requirements/inspiration.md) v1, [design](../../output/designs/inspiration/design-notes.md), [architecture](../architecture/inspiration.md), [ADR-0009](../architecture/decisions/ADR-0009-inspiration-image-storage.md), [ADR-0004](../architecture/decisions/ADR-0004-events-table-writes-under-rls.md).

## Implemented

INS-001 to INS-011:

- Navigation entry, Home card, `/inspiration` (list) and `/inspiration/$id` (detail).
- Articles and images.
- Multi-file upload with browser resizing.
- Tag, kind and accent-insensitive search filters in the URL.
- Usage line and 800 MB warning.
- Edit and delete (deleting an entry removes its files).

## Files

| Area | Files |
| --- | --- |
| Migration | `supabase/migrations/20261024130000_inspiration.sql`: table, constraints, grants, RLS, invoker functions, bucket, Storage policies |
| Worker | `src/worker/inspiration.ts` (routes), `src/worker/app.ts` (mount + error mapping) |
| Services | `src/features/inspiration/server/{queries,mutations,errors}.ts` |
| Domain | `src/features/inspiration/domain/{validation,image}.ts`. Shared `src/lib/text.ts` holds the link and text rules that moved out of Events, and Events re-exports them unchanged. |
| Browser | `src/features/inspiration/{api,upload,messages,types}.ts`, `components/*`, `src/app/pages/inspiration.tsx`, `src/app/router.tsx`, `src/components/shell/apps.ts` |
| Headers | `public/_headers`: `img-src` adds `blob:` and `https://*.supabase.co` |
| Tests | `supabase/tests/inspiration-rls.test.ts`, `tests/unit/api-inspiration.test.ts`, `tests/unit/inspiration-domain.test.ts`. `tests/support/supabase-db.ts` now stubs the Storage schema (`storage.buckets`, `storage.objects` with RLS, `storage.foldername`). |

## Decisions made while implementing

- **Encoding.** Stored images are WebP where the browser can encode it, otherwise JPEG (Safari). Quality is 0.82, falling back to 0.7 if a file is over 5 MB. The thumbnail uses quality 0.78. JPEG gets a white background for transparent PNGs.
- **Retries.** Each image upload uses a fresh key. If anything fails after the key was issued, the browser calls `DELETE /uploads/:key`, so a retry starts clean.
- **Rejected files.** Files the browser can't decode (for example HEIC on a laptop) or shrink under 5 MB are marked as rejected, not offered for retry.
- **Cache times.** Inspiration queries use `staleTime` 30 min and `gcTime` 40 min, so signed links (1 h) never outlive the cache.
- **Body limit.** Create and update bodies may be up to 256 KB (for 50,000 characters of text). Other routes keep 32 KB.

## Deploy steps

1. Merge to `main`. The workflow applies the migration with `supabase db push`, then deploys the Worker.
2. In the Supabase dashboard, check the following (ADR-0009 "to verify"):
   - Storage shows the bucket `inspiration` as private, with a 5 MB limit and WebP/JPEG types.
   - The three `inspiration_objects_*` policies exist on `storage.objects`.
3. Smoke test from a phone: upload a photo, view it, sign in as a second user and confirm the entry isn't visible, then delete it and confirm the files are gone in Storage.

No new environment variables or secrets.

## Checks run (2026-10-24, Windows, Node 24.20.0)

| Check | Result |
| --- | --- |
| `npm test` | 344 passed in 19 files (58 new: 31 database, 18 API, 9 domain) |
| `npm run typecheck` | Pass |
| `npm run lint` | 0 errors. 6 warnings, all `react-refresh/only-export-components` in files that already had them; none in Inspiration files |
| `npm run build` | Pass. Client JS 1,311 kB (390 kB gzip) in one chunk; the existing chunk-size warning remains. Not compared against a build without this change. |
| Bundle boundary | The client contains no Inspiration RPC names. The Worker contains no React (one `useState` match is a supabase-js doc comment). No secret keys. |

## Not verified

- **Real Supabase.** No real Storage calls were made: no signed upload or download, `list` metadata, `remove`, or bucket limits. The migration's `storage.buckets` columns and policy creation on the hosted `storage.objects` haven't been checked either. PGlite covers the SQL with a stubbed Storage schema only.
- **Browser runs.** Resizing on real devices (iOS Safari HEIC conversion, EXIF orientation, WebP fallback) and any signed-in screen in a browser.
- **Phone layout** at 320 px.
