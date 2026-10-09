# Architecture

Kanban Starlane is an Obsidian plugin that shows specially marked markdown notes as Kanban
boards. **The markdown file is the source of truth.** The plugin parses it into an
in-memory `Board`, renders the board with Preact, and writes the whole file back after
every change.

```
 markdown file ──parse──▶ Board (immutable tree) ──render──▶ Preact UI
      ▲                        │   ▲                             │
      └──────serialize─────────┘   └──── boardModifiers ◀────────┘ user actions
```

## Layers

Dependencies point downwards. A module must not import from a layer above it.

| Layer | Directory | Responsibility |
|---|---|---|
| Entry | `src/main.ts` | Re-exports the plugin class (esbuild entry point) |
| Plugin | `src/plugin/` | Lifecycle, view/state registries, commands, menus, vault events, workspace monkey patches, migration |
| View | `src/view/` | `KanbanView` (Obsidian `TextFileView`), the Preact root per window (`DragDropApp`), markdown link/hover events |
| UI | `src/components/`, `src/settings/*.tsx` | Preact components for board, lanes, cards, table/list views, editors |
| Drag & drop | `src/dnd/` | Self-contained DnD engine (hitboxes, sorting, auto-scroll, overlay) |
| State | `src/state/` | `StateManager` (one per open file), `boardModifiers` (all board edits), settings resolution |
| Settings | `src/settings/` | Setting keys/types, defaults, settings UI (tab + board modal) |
| Format | `src/parsers/` | markdown ⇄ `Board`, markers, legacy migration, linked-note metadata, search text |
| Integrations | `src/integrations/` | Everything that reads other plugins or Obsidian internals: Tasks, Dataview, Daily notes, Templates/Templater, vault config |
| Model | `src/model/` | `Board`/`Lane`/`Item` types, value formatting |
| Shared | `src/shared/`, `src/constants.ts`, `src/lang/` | Pure helpers, ids, diff/patch, identifiers, i18n |

Parsers take the `StateManager` as their context (for settings, `app` and the file). This
is the one intentional upward reference; do not add new ones.

## Data model (`src/model/types.ts`)

Everything the DnD engine can move is a `Nestable`: `{ id, type, accepts, data, children }`.

- `Board` — `data`: settings, frontmatter, archive (`Item[]`), errors. `children`: lanes.
- `Lane` — `data`: `title`, `maxItems` (WIP limit), `shouldMarkItemsComplete`, sort. `children`: items.
- `Item` (card) — `data`: `titleRaw` (markdown as in the file), `title` (preprocessed for
  rendering), `checked`/`checkChar`, `blockId`, and `metadata` (dates, tags, linked file and
  its metadata, inline fields).

Ids are generated at parse time and **are not stored in the file**. A re-parse keeps the
ids of unchanged entities (see *Re-parsing* below) so Preact keeps DOM and editor state.

Boards are immutable: every edit builds a new tree (`immutability-helper`, `dnd/util/data.ts`).

## Lifecycle of an open board

1. **Opening.** `plugin/workspacePatches.ts` patches `WorkspaceLeaf.setViewState`: a markdown
   file whose frontmatter has `kanban-starlane:` opens as view type `kanban-starlane` unless
   the user switched that leaf to markdown (`plugin.kanbanFileModes`).
2. **Loading.** Obsidian calls `KanbanView.setViewData(md)` → `plugin.addView()`.
   There is **one `StateManager` per file**, shared by every view of that file
   (split panes, pop-out windows). The first view parses; later views reuse the state.
3. **Parsing** (`parsers/ListFormat.mdToBoard`):
   `parseMarkdown` (frontmatter + settings footer + mdast with custom micromark extensions
   for dates, times, tags, wikilinks, block ids) → `astToUnhydratedBoard` (headings → lanes,
   lists → cards) → `hydrate` (moment dates, resolved files, search text).
4. **Pre-rendering.** `KanbanView.prerender` renders each card's markdown with Obsidian's
   renderer off-screen (`BasicMarkdownRenderer`, queued in batches) before the board is shown.
5. **Rendering.** Each window has one Preact root (`view/DragDropApp.tsx`) mounted on
   `document.body`; every `KanbanView` is rendered into its `contentEl` through a portal.
   One root per window lets cards be dragged between boards.
6. **Editing.** Components call `boardModifiers` (`state/boardModifiers.ts`) →
   `stateManager.setState(newBoard)` → `boardToMd` → `view.requestSaveToDisk` → Obsidian saves.
   Only the *primary* view of a file writes to disk (boards loaded without a view save
   themselves — see *Linked lanes and background boards* below).
7. **External changes.** When the file changes on disk, Obsidian calls `setViewData` again and
   the board is re-parsed. When a note that cards link to changes, `plugin/vaultEvents.ts`
   re-parses boards so linked metadata stays current.

### Re-parsing

`mdToBoard` with an existing state diffs the old and the new tree (`shared/patch.ts`),
ignoring generated keys (`id`, parsed dates, ...), applies the patch to the old state and
re-hydrates only the entities whose content changed. This keeps ids stable.

## Linked lanes and background boards

A lane can show the cards of lanes on other boards (`linked-lanes` setting, see
`board-format.md`). The pieces:

- **Background boards.** `plugin.retainBoard(file)` returns the file's `StateManager`
  whether or not a view has it open, loading it from the vault if needed; `release()` ends
  the use. Without a view a manager saves with `vault.process`, and only if the file still
  holds what it last read or wrote (otherwise the change on disk wins and a notice says the
  edit was not saved). It re-parses on the vault `modify` event (`applyExternalChange`),
  ignoring events of its own pending writes. When a view opens the file
  it attaches to the same manager, re-parses the view's data and takes over saving. One
  manager per file still holds, so a board edited from two places cannot diverge.
- **State** (`state/linkedLanes.ts`): `mergeLane` builds a lane's combined card list from
  own cards, linked lanes and the stored `order`; `laneEntries` does it for a lane of a board.
- **Drops** (`state/linkedDrop.ts`, `view/linkedDrop.ts`): the DnD engine reports positions
  in combined lists. `planLinkedDrop` turns a drop into a move inside the card's own file,
  new `order`s and the block ids needed to remember positions; the view layer applies it
  with the usual completion rules. `getLinkedDropFilter` (via the engine's
  `getDropFilter`) keeps a linked card from targeting lanes that do not show its board.
- **UI** (`components/linkedLanes.tsx`): `useLinkedBoards` retains the linked boards of the
  open board and provides `LinkedLanesContext`. A linked card is rendered inside
  `LinkedBoardProvider` (its board's `stateManager`/`boardModifiers`) and an
  `ExplicitPathContext` with its path in its board, so every card action edits its own
  file. Own cards in a combined lane also get an explicit path.
- **Renames** (`plugin/linkedBoards.ts`): renaming a board file or (through the plugin) a
  lane updates the `linked-lanes` of every board that links to it.

## Card history

`state/cardHistory.ts`. `StateManager.setState` (only for changes that are saved, i.e. made
in the plugin, not re-parses of the file) passes the old and new board to
`recordCardHistory`, which matches cards by instance id (then block id), derives events
(lane change, archive, status, text), gives cards block ids and updates
`board.data.history`. Because it compares boards, every edit path is covered — menus,
drag and drop, linked lanes and background boards (a linked card's events land in its own
board). Cross-board drags call `carryCardHistory` in `view/DragDropApp.tsx` so the card
takes its history along. Parsing/serializing: `parsers/history.ts`. UI: card menu →
*History* (`components/Item/CardHistoryModal.ts`).

## Settings

Three layers, resolved per key in `state/compileSettings.ts`:

1. **Board** — JSON in the settings footer of the file, plus setting keys found in frontmatter.
2. **Global** — plugin `data.json` (settings tab).
3. **Defaults** — `compileSettings` and `settings/defaults.ts`.

`stateManager.getSetting(key)` reads the compiled value; `useSetting(key)` subscribes a
component. Changing a key listed in `shouldRefreshBoard` (`settings/types.ts`) re-parses every card.

## Drag and drop (`src/dnd/`)

A custom engine (not a library):

- `DndManager` (per window) owns the `DragManager` (pointer events, hit testing with
  `box-intersect`), and the maps of hitbox and scroll entities.
- `EntityManager` registers each `Droppable`/`Sortable` DOM node as an `Entity` with a
  path (`[laneIndex, itemIndex]`) and a scope id (`<leafId>:::<filePath>`).
- `SortManager` moves siblings out of the way and shows placeholders; `ScrollManager`
  auto-scrolls; `DragOverlay` renders the dragged clone.
- The drop itself is handled in `view/DragDropApp.tsx`: same-board moves, cross-board moves,
  moving into/out of a "Complete" lane, and drops of files/links from outside Obsidian.

Paths passed to `moveEntity`/`insertEntity` are *slot* paths counted before removal — see
`tests/unit/helpers/boardTree.test.ts` for the exact semantics.

## Obsidian specifics that bite

- **Pop-out windows.** Use `activeWindow`/`win.setTimeout`, `getParentWindow(el)`, never the
  global `window`/`document` for timers or DOM created for a board. esbuild rewrites timer
  calls inside `node_modules` for the same reason.
- **No global `app`.** Always use `plugin.app`, `view.app` or `stateManager.app`
  (enforced by ESLint).
- **Preact, not React.** `react`/`react-dom` are aliased to `preact/compat`.
- **Internal APIs** (`app.plugins`, `vault.getConfig`, `embedRegistry`, `commands`) are
  used in a few places and wrapped in `src/integrations/` or `plugin/workspacePatches.ts`.
  They can break on Obsidian updates — the e2e suite runs on the minimum and a pinned
  version, plus a daily run on the latest one (see `docs/dev/testing.md`).
- **CSS**: every class is prefixed `kanban-starlane__` via `c('name')`.
