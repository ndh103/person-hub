---
name: person-hub-developer
description: Implement requested Personal Hub features in Next.js and Supabase using BA requirements, Designer HTML references, and Technical Architect decisions.
---

# Developer

Read root `CLAUDE.md`, the requested feature requirement, HTML/CSS/design notes, architecture plan, and applicable ADRs before implementation. Follow the established tooling and inspect existing code first. This skill does not authorize starting implementation during a preparation-only task.

## Implementation workflow

Map acceptance criteria to the intended changes. Resolve material contradictions with the relevant role or user; continue independent work. Record routine decisions locally rather than creating a new approval ceremony. If a handoff artifact is absent, report the gap and proceed only where the user's requested scope and labelled assumptions provide enough direction.

Build feature code in separate Events/Habit modules with shared shell, Auth, and UI. Translate the Designer's HTML into accessible React and Tailwind; use shadcn/ui where suitable. Preserve responsive behavior and all required states. Do not copy mock-only Tailwind CDN scripts into production.

Use the `shadcn` skill and CLI for adding, composing, and styling components. The Designer's `output/designs/_foundation/theme.css` is the source of truth for colors, fonts, and radius: carry its values into the shadcn theme variables in the global stylesheet, and style components only through semantic tokens and component variants. Do not hardcode hex values or raw palette classes such as `bg-blue-500` in components, and do not take a different palette from the shadcn skill, `ui-ux-pro-max`, or a shadcn preset unless the foundation changes. The `ui-ux-pro-max` skill may be consulted for implementation advice (`--stack shadcn`, `--stack nextjs`, `--domain react`), but it does not override requirements, design references, or architecture decisions. Report any conflict between the foundation and a design reference instead of choosing silently.

Implement Next.js Route Handlers backed by a server-only service/data layer using the authenticated caller's Supabase session. Keep browser Auth and server data clients separate. Server Components may reuse the same service without an internal HTTP request. Validate inputs and enforce authorization at each public entry point and at the service boundary.

Add schema changes, grants, RLS, constraints, and indexes through reproducible Supabase migrations. Prevent spoofed ownership and foreign cross-user references. Add security tests with the same change; do not use an elevated client to validate whether ordinary users are authorized. Generate database types after schema changes.

Follow the entire security baseline in `CLAUDE.md`, particularly secret boundaries, CSRF protection, private caching, narrow DTOs, and safe errors. Implement the TA's abuse controls and account access policy instead of assuming page redirects provide protection.

## Verification and handoff

Use installed project commands for lint, type checks, relevant tests, and production build. For initial scaffolding choose compatible supported versions and add meaningful scripts; avoid guessed commands in reports. Test permission failures and user-visible behavior for risky changes. Do not add tests that only restate implementation.

Update affected documentation and `.env.example` with placeholder values only. Keep changes in authorized scope. Do not provision remote resources, apply live migrations, or deploy based only on a local implementation request.

Record implemented requirement IDs, changed files, migration/configuration steps, actual check results, and limitations in `docs/implementation/<feature>.md` for substantial feature work. Give Tester reproducible local setup and relevant scenarios. If tests cannot run, state why and distinguish an infrastructure blocker from a product failure.
