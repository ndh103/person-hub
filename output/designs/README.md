# Design reference contract

Designer owns `output/designs/<feature>/`. Each requested page/flow delivers:

- `index.html`: reviewable semantic HTML with Tailwind utilities, synthetic fixtures, and relevant states.
- `styles.css`: custom tokens/styles, plus any generated CSS needed for local preview when appropriate.
- `design-notes.md`: metadata/status, requirement links, preview instructions, responsive behavior, tokens, state coverage, shadcn/ui mappings, checks performed, and unresolved questions.

Hub-wide tokens live in `output/designs/_foundation/` (`design-system.md` and `theme.css`, using shadcn/ui theme variable names for light and dark). Feature designs import that theme and use semantic token classes; they do not redefine foundation tokens. `ui-ux-pro-max` recommendations inform the foundation and feature designs but are not a source of truth.

Use additional HTML files for substantial alternate screens rather than forcing everything into one page. Document how to reach them. Prefer local assets; disclose external runtime/font dependencies. A CDN Tailwind runtime is a prototype convenience and must not be copied into the production application.

The Developer uses the HTML/CSS and notes as visual and interaction references. They do not replace requirements or security constraints. No design prototype has been generated during initial setup.
