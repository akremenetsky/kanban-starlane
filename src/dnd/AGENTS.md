# src/dnd — drag and drop engine

A self-contained engine written for this plugin (see "Drag and drop" in
`docs/dev/architecture.md`). It is the most fragile part of the codebase.

- Don't change it as a side effect of another task. If a feature needs DnD changes, make
  them in separate commits and describe the manual test you did in `test-vault/`.
- Pure tree operations (`util/data.ts`, `util/path.ts`) are unit-tested in
  `tests/unit/helpers/boardTree.test.ts` — extend those tests first.
- Paths are *slot* paths (`[laneIndex, itemIndex]`) counted before the dragged entity is
  removed; `moveEntity` adjusts for same-parent moves.
- Everything is per window (pop-outs): use the `win` from the entity/manager, never global
  `window`.
- Real pointer drags are covered only for linked lanes (`dragCard()` in
  `tests/e2e/specs/linkedLanes.e2e.ts`, reusable); verify the rest manually in the test vault
  (drag within a lane, across lanes, across two boards in split panes, into a Complete lane).
- `DndContext`'s `getDropFilter` lets the app exclude drop targets per drag (used by linked
  lanes); keep it generic.
