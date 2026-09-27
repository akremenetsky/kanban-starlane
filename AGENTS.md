# AGENTS.md — Kanban Starlane

Instructions for AI coding agents (Claude Code, Codex, ...) and humans working on this repo.
This file is the single source of truth; `CLAUDE.md` imports it. Folder-specific rules live
in nested `AGENTS.md` files (`src/parsers/`, `src/dnd/`, `src/components/`, `tests/`).

## Project

Kanban Starlane is an [Obsidian](https://obsidian.md) plugin that turns markdown notes into
Kanban boards. It is a maintained fork of *obsidian-kanban* 2.0.51 by mgmeyers (GPL-3.0).

**Roles.** The repository owner is a *technical product owner*: they request features and
review results but do not write code. **Agents are the developers.** The product owner
writes in Russian — reply in Russian; code, comments, docs and commit messages are English.

## Golden rules

1. **Board files are user data.** Never break existing boards. Parse → serialize must be
   byte-identical for unchanged boards. Any format change follows
   [docs/dev/board-format.md](docs/dev/board-format.md#compatibility-rules).
2. **Tests prove behaviour.** Every behaviour change or bug fix comes with a test that fails
   without it (unit test for format/state logic, e2e test for anything UI/Obsidian-bound).
3. **Green before commit.** `npm run check` must pass for every commit. Also run
   `npm run test:e2e` when you touch `src/view`, `src/plugin`, `src/components`, `src/dnd`,
   `src/settings` or styles.
4. **Git.** Work on a branch (`feature/…`, `fix/…`, `refactor/…`), small commits with
   descriptive messages. **Never push, tag, release or publish unless the product owner asks.**
5. **Ask about product decisions, decide technical ones.** If a request is ambiguous in a way
   that changes what users see or what gets written into their files, ask before building.
   Otherwise pick the conventional option and state it in your report.
6. **Respect the layers** in [docs/dev/architecture.md](docs/dev/architecture.md). No upward imports.

## Commands

| Command | Purpose |
|---|---|
| `npm install` | Install dependencies (npm only, no yarn) |
| `npm run dev` | Watch build → `dist/` and `test-vault/.obsidian/plugins/kanban-starlane` |
| `npm run build` | Production build → `dist/` |
| `npm run check` | typecheck + lint + format check + unit tests (run before every commit) |
| `npm test` | Unit tests (Vitest) · `npx vitest run <file>` for one file |
| `npm run test:e2e` | Build + e2e in real Obsidian (headless via xvfb) · `-- --spec <file>` for one spec |
| `E2E_VERSIONS=all npm run test:e2e` | e2e on minimum (`manifest.json` minAppVersion) and latest Obsidian |
| `npm run test:update-fixtures` | Regenerate `tests/fixtures/boards/*.md` from the serializer (review the diff!) |
| `npm run format` / `npm run lint:fix` | Auto-fix formatting / lint |
| `npm run docs:install` | Create `.venv-docs` and install Zensical (Python; run once) |
| `npm run docs:serve` | Live-reload preview of `docs/user-guide` at localhost:8000 |
| `npm run docs:build` | Build the docs site into `site/` (also run by the Docs CI workflow) |

## Repository map

```
src/
  main.ts            entry (re-exports plugin/KanbanPlugin)
  constants.ts       ids that live in users' vaults (plugin id, frontmatter key, CSS prefix)
  plugin/            lifecycle, commands, file menu, vault events, workspace patches, migration
  view/              KanbanView (TextFileView), Preact root per window, markdown events
  components/        Preact UI: Kanban, Lane, Item, Table, Editor (vendored flatpickr inside)
  dnd/               custom drag & drop engine
  state/             StateManager (per file), boardModifiers (all edits), compileSettings,
                     linked lanes (combined order, drop planning)
  settings/          setting types/defaults, settings UI (sections.ts + controls.ts)
  parsers/           markdown ⇄ Board, markers, legacy migration, linked metadata
  integrations/      Tasks, Dataview, Daily notes, Templates, vault config (Obsidian internals)
  model/             Board/Lane/Item types
  shared/            pure helpers (ids, diff/patch, colors, links)
  lang/              i18n: locale/en.ts is the key list, other locales are partial
tests/
  unit/              Vitest; setup/ has the fake Obsidian API and the loadBoard() harness
  fixtures/boards/   canonical board files (byte-exact, never hand-format)
  e2e/               WebdriverIO specs + deterministic vault
test-vault/          vault for manual testing by the product owner
docs/dev/            architecture, board format, testing, decisions, known issues
docs/user-guide/     end-user docs, built as a Zensical site and published to GitHub Pages
scripts/             build helpers and refactoring tools
zensical.toml        Zensical config for docs/user-guide (site_url, nav, theme)
```

## Where things go

| Task | Where |
|---|---|
| New command | `src/plugin/commands.ts` (never rename existing ids — users bind hotkeys) |
| New setting | follow `.claude/skills/add-setting/SKILL.md` |
| New card/lane syntax or anything written to files | follow `.claude/skills/change-board-format/SKILL.md` |
| Change to a board (move, add, edit cards) | `src/state/boardModifiers.ts`, called from components |
| Reading another plugin or Obsidian internals | a function in `src/integrations/` taking `app` |
| UI text | `t('English text')`; add the key to `src/lang/locale/en.ts` and a translation to `ru.ts` |
| Styles | `src/styles.less`, classes via `c('name')` → `kanban-starlane__name` |
| Identifiers stored in vaults | `src/constants.ts` only |
| End-user documentation | `docs/user-guide/*.md` (Zensical site, see `zensical.toml`) |

## Code conventions

- TypeScript, Preact (`react` imports are aliased to `preact/compat`), functional components + hooks.
- Imports: relative inside the same directory tree, `src/...` otherwise. Prettier sorts them.
- Never use the global `app` (ESLint enforces). Use `plugin.app`, `view.app`, `stateManager.app`.
- Pop-out windows: use `activeWindow` / `win.setTimeout` / `getParentWindow(el)`, not global
  `window`/`document`, for timers and DOM that belongs to a board.
- Board data is immutable: build new objects (`immutability-helper`, `src/dnd/util/data.ts`).
- Keep modules focused; if a file passes ~500 lines, split it by responsibility.
- Comments explain *why*, not what. Public functions in `parsers/`, `state/`, `integrations/`
  get a one-line doc comment.
- Do not modify vendored code (`src/components/Editor/flatpickr/`) beyond minimal fixes.

## Refactoring tools

- `node scripts/mv.mjs <from> <to> [...]` — move/rename modules, rewrite all imports (`git mv`).
- `node scripts/move-symbol.mjs <fromFile> <toFile> <name...>` — move top-level declarations
  between modules and fix every import.
- `node scripts/organize-imports.mjs <files...>` — drop unused imports.
Always follow with `npm run format && npm run check`.

## Playbooks

Step-by-step guides in `.claude/skills/<name>/SKILL.md` (Claude Code loads them as skills;
other agents: read the file when the task matches).

| Playbook | Use when |
|---|---|
| `implement-feature` | Any feature or behaviour change requested by the product owner |
| `fix-bug` | A bug report |
| `add-setting` | Adding a global/board setting |
| `change-board-format` | Anything that changes what is read from or written to board files |
| `e2e-testing` | Writing or debugging e2e tests |
| `release` | Only when the product owner asks for a release |

## Definition of done

- [ ] Behaviour covered by tests that fail without the change; `npm run check` green.
- [ ] e2e green if UI/Obsidian-bound code changed.
- [ ] Manually verifiable in `test-vault/` (add a sample note/board there for new features).
- [ ] `CHANGELOG.md` (*Unreleased*) updated for user-visible changes; `docs/dev/*` updated when
      architecture, format or decisions changed; `docs/dev/known-issues.md` updated if you
      found or fixed a quirk.
- [ ] Committed on a branch; report to the product owner (in Russian): what changed, how to
      try it in the test vault, any decisions you made or questions left open.

## Gotchas

- Card and lane titles render asynchronously (Obsidian markdown renderer) — in e2e tests
  never assert right after an action; use `expectEventually`/`waitForFile`.
- Only the *primary* view of a file saves; several views can share one `StateManager`.
  A board can also be loaded without a view (`plugin.retainBoard`, used by linked lanes);
  then it saves itself via `vault.process` — see *Linked lanes* in `docs/dev/architecture.md`.
- Changing settings listed in `shouldRefreshBoard` re-parses every card.
- `Archive`/`Complete` markers are written in English, read in any language.
- Obsidian internals used: `app.plugins`, `vault.getConfig`, `embedRegistry` (editor class),
  `commands.executeCommand` patch. Check them first when something breaks after an Obsidian update.
