# src/parsers — board format

Everything here reads or writes users' files. Read `docs/dev/board-format.md` first.

- Round-trip must stay byte-identical: `tests/unit/format/roundtrip.test.ts` over
  `tests/fixtures/boards/`. If you change output on purpose, run
  `npm run test:update-fixtures` and explain every fixture diff in the commit message.
- Reading must be tolerant (never throw on odd but valid markdown — a thrown error makes the
  whole board unusable); writing must be canonical.
- New syntax = additive only. Old files must parse the same way.
- Parsers get the `StateManager` as context (`getSetting`, `app`, `file`). Don't reach into
  UI modules; put Obsidian/plugin access in `src/integrations/`.
- Pipeline: `parseMarkdown.ts` (frontmatter, settings footer, mdast with micromark
  extensions in `extensions/`) → `markdownToBoard.ts` → `hydrate.ts`; serialization is
  `boardToMarkdown.ts`; `ListFormat.ts` ties them together and handles re-parse diffing.
- Fixed strings (markers) live in `markers.ts`; identifiers in `src/constants.ts`.
