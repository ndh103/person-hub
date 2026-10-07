# Personal Hub

A planned private hub for Events and Habit Tracker, usable from phone and laptop browsers. Stack: Next.js frontend/API, Supabase database/Auth, Tailwind CSS, and shadcn/ui, targeting Vercel hosting.

This repository currently contains development instructions and role skills. The application has not been scaffolded or deployed.

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

