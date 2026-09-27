# src/components — Preact UI

- Preact with hooks; `react` imports resolve to `preact/compat`. Memoize list items (`memo`).
- Read board state via `KanbanContext` (`stateManager`, `boardModifiers`, `view`); subscribe
  to settings with `stateManager.useSetting(key)`.
- Never mutate `Board`/`Lane`/`Item`; change boards only through `boardModifiers`.
- CSS classes via `c('name')` (→ `kanban-starlane__name`), styles in `src/styles.less`.
  Class names are part of the e2e selectors and of users' CSS snippets: renaming one is a
  breaking change.
- User-visible text via `t()`; add keys to `src/lang/locale/en.ts` (+ `ru.ts`).
- Card markdown is rendered by Obsidian (`MarkdownRenderer/`), asynchronously.
- `Editor/flatpickr/` is vendored — don't touch beyond minimal fixes.
- UI changes need an e2e test (`tests/e2e/specs/`) when feasible and a manual check in
  `test-vault/`.
