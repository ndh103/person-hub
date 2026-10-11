# Personal Hub

A private hub for Finisher (tasks and projects) and Events, usable from phone and laptop browsers.

Stack ([ADR-0003](docs/architecture/decisions/ADR-0003-spa-and-worker-api.md)):

- a React single-page app (Vite, TanStack Router and Query, Tailwind CSS, shadcn/ui);
- a Hono API with Zod;
- both served by one Cloudflare Worker, aimed at the free Workers plan;
- Supabase Postgres (RLS) and Supabase Auth.

What's built:

- sign-in with Supabase Auth: password, magic link or code, and Google, for invited users only;
- the sidebar shell;
- Finisher.

Events is a placeholder. Nothing has been deployed, and the Finisher migration hasn't been applied to a Supabase project.

## Run locally

1. Node ≥ 22.12 (24 LTS recommended), then `npm ci`.
2. Copy `.env.example` to `.env.local` (SPA) and `.dev.vars.example` to `.dev.vars` (Worker), and fill in your Supabase project URL and publishable key in both.
3. Configure the Supabase project as described in [docs/architecture/auth.md](docs/architecture/auth.md#configuration) (sign-ups off, redirect URLs including `http://localhost:3000/**`, email templates, SMTP, Google).
4. Run `npm run dev` (the Vite dev server, with the API Worker running in workerd) and open http://localhost:3000.

For Finisher, apply `supabase/migrations/` to the project (see [docs/implementation/finisher.md](docs/implementation/finisher.md#migration-and-setup)).

Checks:

- `npm run lint`
- `npm run typecheck`
- `npm test`: unit and API tests, plus database security tests on an in-process Postgres
- `npm run build`
- `npm run preview`: serves the production build in workerd

Deployment: GitHub Actions deploys `main` to Cloudflare; one-time setup in [docs/implementation/platform.md](docs/implementation/platform.md#deploying).

Implementation notes:

- [platform (SPA and Worker)](docs/implementation/platform.md)
- [auth](docs/implementation/auth.md)
- [Finisher and shell](docs/implementation/finisher.md)

## Working with the role skills

Start with [CLAUDE.md](CLAUDE.md) and [the project brief](docs/project-brief.md). Role skills are versioned in `.claude/skills/`, the project location Claude Code scans for skills. Invoke one with a slash command, such as `/person-hub-ba`, or describe the task and Claude loads the matching skill automatically. If new skills do not appear, restart Claude Code. These files define workflows, not automatically running agents.

| Role | Skill | Outputs |
| --- | --- | --- |
| BA | [person-hub-ba](.claude/skills/person-hub-ba/SKILL.md) | `requirements/` |
| Designer | [person-hub-designer](.claude/skills/person-hub-designer/SKILL.md) | HTML/Tailwind references in `output/designs/` |
| Technical Architect | [person-hub-architect](.claude/skills/person-hub-architect/SKILL.md) | `docs/architecture/` |
| Developer | [person-hub-developer](.claude/skills/person-hub-developer/SKILL.md) | Application, migrations, implementation notes |
| Tester | [person-hub-tester](.claude/skills/person-hub-tester/SKILL.md) | Automated tests and `docs/testing/` |

Example requests for future sessions:

- "/person-hub-ba define the Events requirements; do not implement yet."
- "/person-hub-designer create the Events HTML/Tailwind reference from its requirements."
- "/person-hub-architect plan Events APIs, schema, and security."
- "/person-hub-developer implement Events from its handoff artifacts."
- "/person-hub-tester add/run automated tests for Events."

Use the same feature slug across requirements, design references, architecture, and reports. BA normally comes first; design and architecture can proceed together, then implementation and testing. Each role also works independently for a scoped request. Future team runs can delegate roles if the agent environment supports delegation.

