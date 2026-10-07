# Architecture contract

TA owns `docs/architecture/<feature>.md`. Include:

- Metadata/status, requirement IDs, and design links.
- Context, constraints, assumptions, and open technical questions.
- Component responsibilities and request/data-flow diagram where useful.
- Server/client boundary and authentication/session lifecycle.
- API methods/paths, inputs, outputs, failures, permissions, and caching.
- Database tables, relationships, constraints, indexes, grants, and RLS per operation.
- Threats, mitigations, and security test obligations.
- Date/timezone, concurrency, and failure behavior relevant to the feature.
- Implementation steps, migrations/configuration, deployment constraints, and rollback considerations.
- Alternatives, consequences, ADR links, and concrete debt.

Consequential decisions go in `decisions/ADR-NNNN-<slug>.md` with context, alternatives, status, decision, consequences, and revisit trigger. Create a debt register only when actual debt exists. Initial stack direction is in `CLAUDE.md`; it does not substitute for a feature's technical plan.
