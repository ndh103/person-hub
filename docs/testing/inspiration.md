# Inspiration: test report

- Feature slug: `inspiration`
- Status: `draft`. Automated layers pass; manual checks on the hosted project and on devices are outstanding.
- Date: 2026-10-24
- Links: [requirements](../../requirements/inspiration.md), [design](../../output/designs/inspiration/design-notes.md), [architecture](../architecture/inspiration.md), [implementation](../implementation/inspiration.md)

## Environment

- Vitest 4.1.11 on Node 24.20.0 (Windows).
- Database tests run in PGlite (Postgres 18) with the real migrations plus a stub of Supabase's `auth` and `storage` schemas (`tests/support/supabase-db.ts`). Each check runs as `authenticated` or `anon` with JWT claims, never as the owner.
- API tests run the Hono app with supabase-js mocked, including Storage.
- No secrets or personal data; fixtures are synthetic.

Command: `npm test` → **344 passed** (19 files). New: `supabase/tests/inspiration-rls.test.ts` 31, `tests/unit/api-inspiration.test.ts` 18, `tests/unit/inspiration-domain.test.ts` 9.

## Coverage

| Requirement | Scenario | Layer | Outcome |
| --- | --- | --- | --- |
| INS-002 | Newest-first order, excerpt without article text, keyset paging without gaps, page cap | DB | Pass |
| INS-002 | 30 per page + cursor, broken thumbnail → null without failing the list | API | Pass |
| INS-003 | Requirement example (scheme added, tags lower-cased), required title, every limit, NFC | Domain, DB | Pass |
| INS-004 | Key/kind rules, picked type and size checks, resize maths, upload URLs only in the caller's folder, no caller-chosen path or type, create needs both files with allowed types, size recorded, duplicate key 409, discard skips keys still in use | Domain, API | Pass |
| INS-004 | Browser decode/resize/encode, per-file progress, partial failure and retry | – | **Not automated** (no DOM test setup); manual |
| INS-005 | Detail with signed full image; 404 for missing or another user's entry; no `user_id`/`image_key` returned | API | Pass |
| INS-006 | Allowlisted text only, clearing optional fields, article text refused on images, kind/image fields not writable | API, DB, Domain | Pass |
| INS-007 | Row deleted first, then both files; Storage failure still succeeds and logs no path; idempotent | API | Pass |
| INS-008 | Search over title/notes/text/tags ignoring case and accents; `%` literal; kind and tag filters combined; tag counts; no search text in API URLs | DB, API | Pass |
| INS-009 | Usage sums only the caller's images; formatting | DB, Domain | Pass |
| INS-010 | See security matrix | DB, API | Pass |
| INS-001, INS-011 | Navigation, focus, phone layout, alt text | – | **Manual, not run** |

## Security matrix

| Operation | Anonymous | Owner | Other user |
| --- | --- | --- | --- |
| API, any route | 401 before data/Storage access | allowed | 404 / hidden by RLS (stubbed) |
| Table select/insert/update/delete (direct) | 42501 | allowed; owner, kind, image fields, ids and timestamps not writable | rows invisible, update/delete affect 0 rows |
| Search, count, tags, usage functions | 42501 | own rows only | own rows only |
| `storage.objects` insert (direct) | denied | own folder only | can't write into the owner's folder |
| `storage.objects` select/delete (direct) | nothing visible | own folder | owner's objects invisible, delete affects 0 rows |
| `storage.objects` update | – | no policy, 0 rows | – |
| Other buckets | – | not granted by these policies | – |

Limit: PGlite models the policies, not the Storage server. Whether `createSignedUploadUrl` is refused outside the caller's folder, and how the bucket limits are enforced, must be checked on the hosted project.

## Manual checks still to run

1. Hosted project (ADR-0009 "to verify"):
   - The bucket settings and policies exist.
   - A direct `createSignedUploadUrl` or upload into another user's folder is refused.
   - A 6 MB or `image/png` upload is refused by the bucket.
2. Phone (iOS Safari, Android Chrome):
   - Pick from the library and the camera, and confirm HEIC is converted.
   - Check orientation, and that the stored file has no EXIF location.
   - Upload 3 files with one forced failure (offline), then retry.
3. Laptop: HEIC is rejected with "This file type isn't supported", and 11 files keep the first 10.
4. Accessibility: keyboard through the grid, dialogs and file picker; screen-reader announcements; 320 px width.
5. Signed links expire: after an hour, a copied image URL stops working.

## Defects

None found in the automated runs.

## Readiness

The automated security boundaries are covered. Do the hosted Storage verification (manual step 1) before relying on the feature with real images.
