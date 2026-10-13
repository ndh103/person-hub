# Technical debt register

Concrete debt only. Each entry names its impact, reason, mitigation, owner role and revisit trigger.

## TD-EVT-1: Events search scans the caller's rows (no text index)

- Added: 2026-10-13 ([events architecture](events.md), [ADR-0004](decisions/ADR-0004-events-table-writes-under-rls.md))
- **Impact:** each search runs `strpos` over every event the caller owns. That's fast for hundreds to a few thousand events. Latency grows linearly beyond that.
- **Reason:** a personal log is small, and a `pg_trgm` GIN index on `lower(title || notes)` and `search_folded` adds an extension and write cost with no current benefit.
- **Mitigation if needed:** enable `pg_trgm` and add GIN trigram indexes on the two search expressions. `strpos` would then need to become `LIKE '%…%'` with escaping, or `pg_trgm`'s `%>` operators, so the index can be used.
- **Owner:** Technical Architect, then Developer.
- **Revisit when:** a user has more than about 10,000 events, or the p95 search response exceeds 300 ms.
