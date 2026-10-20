# ADR-0006: Drag and drop with the classic dnd-kit packages (`@dnd-kit/core` + `@dnd-kit/sortable`)

- Status: accepted (Technical Architect, 2026-10-20). The user chose dnd-kit on 2026-10-20; this ADR picks which dnd-kit packages and records the conditions. It is not a record of user approval of these specific versions.
- Related: [requirements/finisher.md](../../../requirements/finisher.md) FIN-038 (decision 21: a visible handle on every row), [Finisher architecture](../finisher.md#drag-and-drop-in-the-spa), [design notes](../../../output/designs/finisher/design-notes.md#shadcnui-mapping-tasks-list), [ADR-0005](ADR-0005-finisher-task-order-keys.md)

## Context

FIN-038 needs the following:

- vertical sortable lists, dragged from a handle with a mouse, pen or touch;
- a keyboard alternative with polite announcements;
- a drag overlay (the "ghost");
- auto-scroll near the viewport edges;
- cancelling with Escape or by dropping outside the section.

The app runs React 19.3. CLAUDE.md requires reviewing new dependencies, pinning them through the lockfile and checking official sources. The user prefers dnd-kit.

dnd-kit currently has two package lines (checked on npm on 2026-10-20):

| Line | Packages | Version | React peer range | Last published |
| --- | --- | --- | --- | --- |
| Classic | `@dnd-kit/core`, `@dnd-kit/sortable` (plus `@dnd-kit/utilities`, `@dnd-kit/accessibility`) | 6.3.1, 10.0.0 | `>=16.8.0` | Dec 2024 |
| New | `@dnd-kit/react` (on `@dnd-kit/dom`, `@dnd-kit/abstract`, `@dnd-kit/state`) | 0.5.1 | `^18 \|\| ^19` | 15 Oct 2026 |

The project's [migration guide](https://dndkit.com/react/guides/migration/) and [changelog](https://dndkit.com/changelog/) describe `@dnd-kit/react` as the new API.

## Alternatives

1. **`@dnd-kit/react` 0.5.x.** It is actively developed and declares React 19. But it is pre-1.0, so the API may change between minors. The latest release is five days old, too new to adopt without a settling period. It also pulls four packages.
2. **Classic `@dnd-kit/core` + `@dnd-kit/sortable`.** (Chosen.) It is the stable, widely used API, with a documented `KeyboardSensor`, `sortableKeyboardCoordinates`, `DragOverlay`, auto-scroll, and customisable `announcements` and `screenReaderInstructions`. Its peer range admits React 19. Its risk is that no release has shipped since December 2024.
3. **Hand-written pointer and keyboard drag**, as in the design prototype. No dependency, but touch, auto-scroll and screen-reader edge cases would be reinvented. Rejected.
4. **Another library (for example Pragmatic drag and drop).** Not preferred by the user, and its accessibility layer is separate. Not pursued.

## Decision

- **Packages:** add `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0` and `@dnd-kit/utilities` at the version `@dnd-kit/sortable` resolves. Pin them exactly in `package.json` and through the lockfile.
- **No `@dnd-kit/modifiers`:** restricting drags to the vertical axis and to the list is a few lines as a custom modifier.
- **Usage:**
  - one `DndContext` per draggable section, so a drag cannot leave its section (FIN-038, decision 19);
  - `PointerSensor` and `TouchSensor` bound to the handle only, through `setActivatorNodeRef`; a small activation distance for pointer and a short delay with tolerance for touch, so taps on the handle do not start a drag;
  - `KeyboardSensor` with `sortableKeyboardCoordinates`;
  - custom `announcements` with the FIN-038 wording, such as "moved to position 2 of 5 in Due today";
  - `DragOverlay` for the ghost.
- **Developer checks before merging:**
  - the install has no peer-dependency warnings with React 19.3;
  - pointer, touch and keyboard sorting work in a browser test;
  - the production build's JS size change is recorded in the implementation notes.
  If React 19 support fails in practice, stop and revisit this ADR rather than patching the library.

## Implementation check (2026-10-20)

- **Install:** pinned exactly (`6.3.1`, `10.0.0`, `3.2.2`). npm installed them with React 19.3 and reported no peer-dependency warnings. The lockfile adds only the four `@dnd-kit/*` packages. `npm audit --omit=dev` reports 0 vulnerabilities.
- **Bundle:** the main chunk grew by 62.5 kB minified (20.5 kB gzip), including the new Finisher components: from 1,117.45 kB to 1,179.98 kB.
- **Not yet verified in a browser:** pointer, touch and keyboard sorting (see the implementation notes).

## Consequences

- **Stale upstream:** the dependency has had no release since December 2024. It has no network access or HTML rendering, so its security exposure is low. It is still recorded as a dependency to monitor.
- **Lower churn now, migration later:** choosing the stable API means less churn today but a likely migration to `@dnd-kit/react` later. The migration guide exists, and the code is confined to one sortable-list component.
- **Single file:** the sortable list is wrapped in one component (`src/features/finisher/components/sortable-task-list.tsx`), so swapping the library touches one file.

## Revisit when

- A React release breaks the classic packages, or `npm install` reports an incompatible peer range.
- `@dnd-kit/react` reaches 1.0, or the classic packages are formally deprecated.
- A security advisory is published for any `@dnd-kit/*` package.
