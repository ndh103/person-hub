# Technical debt register

Concrete debt only. Each entry names its impact, reason, mitigation, owner role and revisit trigger.

## TD-EVT-1: Events search scans the caller's rows (no text index)

- Added: 2026-10-13 ([events architecture](events.md), [ADR-0004](decisions/ADR-0004-events-table-writes-under-rls.md))
- **Impact:** each search runs `strpos` over every event the caller owns. That's fast for hundreds to a few thousand events. Latency grows linearly beyond that.
- **Reason:** a personal log is small, and a `pg_trgm` GIN index on `lower(title || notes)` and `search_folded` adds an extension and write cost with no current benefit.
- **Mitigation if needed:** enable `pg_trgm` and add GIN trigram indexes on the two search expressions. `strpos` would then need to become `LIKE '%…%'` with escaping, or `pg_trgm`'s `%>` operators, so the index can be used.
- **Owner:** Technical Architect, then Developer.
- **Revisit when:** a user has more than about 10,000 events, or the p95 search response exceeds 300 ms.

## TD-FIN-1: Week tab lists stop at 200 Unplanned and 200 carried-over tasks

- Added: 2026-10-24 ([ADR-0008](decisions/ADR-0008-finisher-week-tab.md))
- **Impact:**
  - The Week tab shows at most 200 Unplanned and 200 carried-over tasks. Its "Show more" pages through those in the browser, and a note says how many more exist (the full lists are on the Tasks tab).
  - "Move all" moves only the loaded tasks, at most 200, which is also the bulk limit (A29).
  - The requirements ask for 50 at a time with "Load more" from the server.
- **Reason:** one read for the whole board keeps the Finisher home to a single request. A personal task list rarely has more than 200 undated or overdue open tasks.
- **Mitigation if needed:** a paged `GET /api/finisher/week/lists/:list?offset=` endpoint (reusing `taskGroupPage`), plus a server-side "move all carried" that doesn't need the ids.
- **Owner:** Technical Architect, then Developer.
- **Revisit when:** a user reaches the limit, or the week read takes more than about 500 ms at p95.

## TD-INS-1: Inspiration can leave orphaned image files

- Added: 2026-10-24 ([ADR-0009](decisions/ADR-0009-inspiration-image-storage.md))
- **Impact:** an image uploaded but never saved (tab closed or network lost between the upload and the create), or a Storage failure after an entry is deleted, leaves up to two objects in the owner's folder. They are private to the owner, but count towards the 1 GB free storage and are not shown in the usage figure.
- **Reason:** the bytes go straight from the browser to Storage (ADR-0009), so the upload and the database row cannot be one transaction. Explicit cancel cleanup covers the normal paths.
- **Mitigation if needed:** a "clean up" action (or a sweep run on create) that lists the caller's folders and removes keys with no entry and older than a day; or a scheduled Worker with a narrowly scoped elevated key (needs its own ADR).
- **Owner:** Technical Architect, then Developer.
- **Revisit when:** the Storage dashboard shows noticeably more used space than the sum of users' usage figures.

## TD-INS-2: Image storage is capped by the free plan's 1 GB for the whole project

- Added: 2026-10-24 ([ADR-0009](decisions/ADR-0009-inspiration-image-storage.md))
- **Impact:** at roughly 0.3–0.8 MB per stored image plus thumbnail, the project holds about 1,500–3,000 images in total. Uploads fail once the project quota is reached. The 800 MB warning (INS-009) is per user and advisory.
- **Reason:** staying on free plans (user decision 2).
- **Mitigation if needed:** lower the stored size (1600 px), move images to Cloudflare R2 (10 GB free, needs a card), or upgrade Supabase.
- **Owner:** Technical Architect.
- **Revisit when:** total Storage use passes 800 MB, or uncached egress passes 4 GB in a month.
