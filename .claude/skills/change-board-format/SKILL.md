---
name: change-board-format
description: Rules and steps for any change to what Kanban Starlane reads from or writes to board markdown files (new syntax, markers, settings footer, frontmatter, serialization). Use before touching src/parsers or anything that alters saved file content.
---

# Change the board format

Board files are user data synced across devices and read by other tools. Breaking them is
the worst bug this project can have.

1. Read `docs/dev/board-format.md` (especially *Compatibility rules*) and
   `src/parsers/AGENTS.md`.
2. **Design additively.** New data goes into new syntax that old versions show as plain text,
   or a new key in the settings JSON. Never change the meaning of existing syntax. If a
   breaking change is unavoidable, stop and get the product owner's approval, then design a
   migration like `parsers/legacy.ts` (pure `isX()`/`convertX()` + command + tests).
3. **Tests first**:
   - parse behaviour in `tests/unit/format/parse.test.ts`;
   - a canonical fixture in `tests/fixtures/boards/` that uses the new syntax
     (create an input, then `npm run test:update-fixtures`);
   - old fixtures must not change — if `test:update-fixtures` modifies existing fixtures,
     your change is not backward compatible.
4. **Implement** in the pipeline: micromark extension (`parsers/extensions/`) if it is inline
   syntax → `markdownToBoard.ts` (→ `ItemData`/`LaneData` in `model/types.ts`) → `hydrate.ts`
   → `boardToMarkdown.ts`. Identifiers go in `src/constants.ts`, fixed strings in `markers.ts`.
5. **Tolerant reading.** Malformed input must never throw out of the parser for a single
   card; unit-test the odd cases.
6. **Document**: update `docs/dev/board-format.md`, add an entry to `docs/dev/decisions.md`,
   and `CHANGELOG.md`.
7. `npm run check` and `npm run test:e2e`; open `test-vault/` boards and confirm that saving
   an untouched board produces no git diff (`git diff test-vault`).
