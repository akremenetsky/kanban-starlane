# Decision log

Short records of decisions that shape the project. Newest first. Add an entry when a
decision is not obvious from the code (format changes, dependencies, trade-offs).

## 2026-09-26 — Card history

The product owner wants to see what happened to a card (what was done yesterday, how long
a card has been in its list), also for linked cards.

- **Stored in the board file**, in a `%% kanban-starlane:history` comment block before the
  settings (hidden in reading view, syncs with the board, card and history cannot drift
  apart). Rejected: the settings JSON (one line, grows without bound) and plugin data
  (not synced with the vault, lost when the board is copied).
- **Identity = block id.** Cards get a `^id` on their first event; the board UI does not
  show it. A card without events stays untouched, so existing boards do not change.
- **Derived by diffing boards** in `StateManager.setState`, not by instrumenting each action.
- **Only the fact of an edit** is stored, no text (product owner's choice); edits within
  2 minutes merge. Deleted cards drop their history. On by default, setting `card-history`.
- Edits made in the markdown are not recorded (we cannot tell who made them or when).

## 2026-09-26 — User guide on Zensical

`docs/user-guide/` was inherited from obsidian-kanban as loose Obsidian notes (wiki-link
embeds, one file per setting, spaces in file names) and had drifted from the fork's actual
settings (e.g. it still documented `hide-tags-in-card-titles` / `hide-card-display-tags` /
`hide-dates-in-card-titles` / `hide-card-display-dates`, which don't exist — this fork only has
`move-tags` / `move-dates`).

- **Zensical**, not the original mkdocs (the leftover `gh-pages` branch was built with mkdocs
  1.4.2 in 2023, before this fork). Same authors and Markdown dialect as Material for MkDocs,
  actively developed, no reason to pick the predecessor for a fresh setup.
- **Content follows the settings UI**, one page per `renderX` section in
  `src/settings/sections.ts`, so a new setting has one obvious place to document and drift is
  easy to spot in review.
- **Screenshots renamed to kebab-case** describing what they show (`date-trigger-setting.png`)
  instead of macOS screenshot timestamps; unreferenced ones and ones for since-removed settings
  were deleted rather than kept as dead weight.
- **Published via GitHub Actions** (`.github/workflows/docs.yml`) to GitHub Pages on push to
  `main`, building with a local Python venv (`npm run docs:*`) since Zensical is a Python tool
  and the rest of the toolchain stays npm-only.

## 2026-09-26 — Linked lanes

The product owner keeps one board per area (work, personal, study) and wants to see them
together. Rejected: card *types* on one shared board, because areas need different lane sets
and a shared backlog becomes a dump (tags + tag colours + search already cover "types").

- **One-directional.** A lane of D1 shows lanes of D2; the link is stored in D1's settings
  JSON only (`linked-lanes`). D2 is not changed by linking. Two-way links are two links.
- **Free order in the combined lane.** The interleaving is stored in D1 (`order`). D2 is
  written only when its own cards change lane or relative order. Linked cards get Obsidian
  block ids (`^id`) as stable identity; the board UI does not show block ids, and the
  product owner rejected anything visible on cards.
- **A linked card stays in its file.** It can only be dropped into lanes linked to its own
  board's lanes; the drop changes its lane in its own file.
- **Background boards.** Linked boards are loaded without a view (`plugin.retainBoard`),
  save through `vault.modify`, and share the StateManager with a view if one is open.

## 2026-09-26 — Fork setup

**Separate plugin, not a drop-in replacement.** Id `kanban-starlane`, name *Kanban Starlane*.
The original obsidian-kanban (by mgmeyers, archived) and this plugin can be installed side by
side. Community store publication is a goal but not the first priority.

**Own identifiers in the board format.** Frontmatter key `kanban-starlane`, settings marker
`%% kanban-starlane:settings`, view type `kanban-starlane`, CSS prefix `kanban-starlane__`
(`src/constants.ts`). Boards of the original plugin are converted by an explicit command
(`parsers/legacy.ts`, `plugin/migration.ts`) instead of being opened silently — otherwise both
plugins would fight over the same files. The markdown structure itself (headings, task lists,
archive, settings JSON) is unchanged: it is readable without the plugin and syncs well.

**Language-independent markers.** `Archive` / `Complete` are written in English and read in
any bundled language. Previously they followed the UI language.

**License: GPL-3.0-only.** The original is GPL-3.0 (its `package.json` wrongly said MIT). The
fork must stay GPL-3.0 and keep the original copyright; vendored MIT/ISC code (flatpickr,
Dataview/Tasks field parsing, Hot Reload in the test vault) keeps its notices.

**`minAppVersion` 1.8.7.** Raised from 1.6.2 so the plugin can rely on `getLanguage()` (the
moment-locale fallback is gone). Raise it deliberately when using newer APIs; CI tests both ends.

**Tooling.** npm (no yarn), TypeScript 5.9, esbuild, ESLint 9 flat config, Prettier, Vitest
with a fake Obsidian API, WebdriverIO + wdio-obsidian-service for e2e in real Obsidian.
Dataview is reached through `src/integrations/dataview.ts` with its own minimal API type: the
obsidian-dataview npm package's `getAPI()` reads the global `app` and bundles Luxon, and its
typings do not resolve outside its repository (they resolve to `any`).

**Obsidian internals are typed** in `src/integrations/obsidianInternals.ts` (module
augmentation of `obsidian`), never reached through `as any`. Each member is typed as narrowly
as the code needs; values of other plugins are typed per plugin in its integration module.

**Layered `src/`** — see `docs/dev/architecture.md`. Module moves are done with
`scripts/mv.mjs` / `scripts/move-symbol.mjs` so imports stay consistent.

**Agent-first repository.** `AGENTS.md` is the single source of instructions (Codex reads it,
`CLAUDE.md` imports it). Playbooks live in `.claude/skills/*/SKILL.md` and are written to be
usable by any agent.
