# Personal Hub

A planned private hub for Events and Habit Tracker, usable from phone and laptop browsers. Stack: Next.js frontend/API, Supabase database/Auth, Tailwind CSS, and shadcn/ui, targeting Vercel hosting.

This repository currently contains development instructions and role skills. The application has not been scaffolded or deployed.

Start with [AGENTS.md](AGENTS.md) and [the project brief](docs/project-brief.md). Role skills are versioned in `skills/`; AGENTS.md instructs agents to read the matching skill. These files define workflows, not automatically running agents.

| Role | Skill | Outputs |
| --- | --- | --- |
| BA | [person-hub-ba](skills/person-hub-ba/SKILL.md) | `requirements/` |
| Designer | [person-hub-designer](skills/person-hub-designer/SKILL.md) | HTML/Tailwind references in `output/designs/` |
| Technical Architect | [person-hub-architect](skills/person-hub-architect/SKILL.md) | `docs/architecture/` |
| Developer | [person-hub-developer](skills/person-hub-developer/SKILL.md) | Application, migrations, implementation notes |
| Tester | [person-hub-tester](skills/person-hub-tester/SKILL.md) | Automated tests and `docs/testing/` |

Example requests for future sessions:

- "Act as the BA. Read skills/person-hub-ba/SKILL.md and define the Events requirements; do not implement yet."
- "Act as the Designer. Read skills/person-hub-designer/SKILL.md and create the Events HTML/Tailwind reference from its requirements."
- "Act as the Technical Architect. Read skills/person-hub-architect/SKILL.md and plan Events APIs, schema, and security."
- "Act as the Developer. Read skills/person-hub-developer/SKILL.md and implement Events from its handoff artifacts."
- "Act as the Tester. Read skills/person-hub-tester/SKILL.md and add/run automated tests for Events."

Use the same feature slug across requirements, design references, architecture, and reports. BA normally comes first; design and architecture can proceed together, then implementation and testing. Each role also works independently for a scoped request. Future team runs can delegate roles if the agent environment supports delegation.

