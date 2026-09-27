# Board file format

A board is a plain markdown note. It must stay readable and editable without the plugin,
and it must survive a round trip (parse → serialize) byte-for-byte when nothing changed.
`tests/fixtures/boards/*.md` are canonical examples; `tests/unit/format/` pins the rules below.

~~~markdown
---

kanban-starlane: board

---

## Todo (3)

- [ ] A card #tag @{2024-03-05} @@{10:30}
- [ ] A multi-line card
    second line
- [x] Done card ^blockid


## Done

**Complete**
- [x] Finished




***

## Archive

- [x] Archived card

%% kanban-starlane:history
```
{
"k3f9a2":[{"at":"2026-09-24T09:00:00+03:00","type":"created","lane":"Todo"}]
}
```
%%

%% kanban-starlane:settings
```
{"kanban-starlane":"board","lane-width":300}
```
%%
~~~

## Elements

| Element | Syntax | Notes |
|---|---|---|
| Board marker | frontmatter `kanban-starlane: board \| list \| table` | Value is the default view. Legacy `basic` = `board`. Other frontmatter keys are preserved. |
| Lane | `## Title` | Everything before the first heading is ignored. |
| WIP limit | `## Title (3)` | Parsed into `maxItems`; `(x)` with non-digits is part of the title. |
| Multi-line lane title | `<br>` in the heading | |
| Complete lane | `**Complete**` as the first paragraph under the heading | Cards moved into it are checked. |
| Card | `- [ ] text` list item under a lane | Any status char in `[ ]` is kept (`[/]`, `[-]`, ...). |
| Card continuation lines | indented 4 spaces or 1 tab | Written with tabs if the vault uses tabs (*Editor → Indent using tabs*). |
| Block id | ` ^id` at the end of the first line | Stored separately and re-appended. |
| Date | `@{date}` or `@[[date]]` | Trigger and format are settings (`date-trigger`, `date-format`). |
| Time | `@@{time}` | `time-trigger`, `time-format`. |
| Archive | `***` then `## Archive` then a list | Must be preceded by a thematic break. |
| Card history | `%% kanban-starlane:history` + fenced JSON + `%%` before the settings block | Only written when some card has history. See *Card history* below. |
| Settings | `%% kanban-starlane:settings` + fenced JSON + `%%` at the end of the file | Board-level overrides. Frontmatter value of the view key wins over the JSON. |

### Linked lanes

A lane can also show the cards of lanes on other boards. This is stored only in the
settings JSON of the board that shows them (the linked boards know nothing about it):

```json
"linked-lanes": {
  "In progress": {
    "sources": [{ "file": "Boards/Work.md", "lane": "Doing" }],
    "order": ["Boards/Work.md#^k3f9a2", "self", "self"]
  }
}
```

- The key is the title of the own lane (without the WIP limit); `lane` is the title of the
  lane on the linked board.
- `order` is the combined order: `self` is the next own card in file order,
  `<path>#^<blockId>` a card of a linked board. It only decides *where* each board's cards
  sit; their relative order always comes from their own file. Cards not in `order` sit next
  to their neighbours from the same file. Unknown tokens are ignored.
- To remember the position of a linked card, the plugin gives it a block id (`^k3f9a2`) in
  its own file. The board UI never shows block ids.
- `board-color` (any CSS colour) marks a board's cards when other boards show them. Like
  `linked-lanes` it is read from the settings JSON only, never from frontmatter.

### Card history

Events of cards, keyed by the card's block id (`^id` on the card line; a card gets one with
its first event). One card per line, events oldest first:

```json
{
"k3f9a2":[{"at":"2026-09-24T09:00:00+03:00","type":"created","lane":"Todo"},{"at":"2026-09-25T10:00:00+03:00","type":"moved","from":"Todo","to":"Doing"}]
}
```

| `type` | Fields | Meaning |
|---|---|---|
| `created` | `lane` | Card added in the plugin |
| `edited` | — | Text changed; edits less than 2 minutes apart are one event (the last time is kept) |
| `moved` | `from`, `to`, `board`? | Moved between lanes; `board` = path of the board it came from |
| `checked` / `unchecked` | `mark` (checked) | Status character changed |
| `archived` / `restored` | `lane` | Moved to / out of the archive |

- `at` is local time with UTC offset. Lane titles are stored as they were at that moment.
- Only changes made in the plugin are recorded, not edits of the markdown.
- Deleting a card deletes its entry; moving a card to another board moves the entry there.
- Unknown `type`s and fields must be kept (read tolerantly). If the JSON cannot be read or
  is not `{ id: [{at, type, ...}] }`, the block is kept verbatim and nothing new is recorded
  on that board. The settings footer is read with the history block removed, so a board
  without settings never takes the history for settings.
- Backticks in lane titles are written as `\u0060` so they cannot end the fence.
- Setting `card-history: false` stops recording; existing history stays.

### Markers and languages

`Archive` and `Complete` are always **written in English**. When reading, their
translations in every bundled locale are also accepted, because obsidian-kanban wrote them
in the UI language (so switching language used to break boards).

### Normalisation on save

The serializer writes a canonical layout: blank lines around lanes, frontmatter via
Obsidian's YAML stringifier, settings JSON on one line. Setting keys found in frontmatter
(e.g. `lane-width: 300`) are moved into the settings JSON on the first save.

## Compatibility rules

1. Existing boards must keep opening and must not change on save unless the user edited them.
2. Add new data **additively**: a new key in the settings JSON, a new inline syntax that old
   versions treat as text. Never repurpose existing syntax.
3. If a change cannot be additive, add a migration (see `parsers/legacy.ts` for the pattern:
   pure `isX` / `convertX` functions + a command in `plugin/commands.ts`) and record the
   decision in `docs/dev/decisions.md`.
4. Every format change updates this document, a fixture in `tests/fixtures/boards/`
   (`npm run test:update-fixtures`, then review the diff) and the parse tests.

## Legacy boards (obsidian-kanban)

Boards of the original plugin use `kanban-plugin:` in frontmatter, `%% kanban:settings`
and `"kanban-plugin"` in the settings JSON. They are *not* opened as boards (so both plugins
can be installed at once). The commands *Convert board from the Kanban plugin* and
*Convert all boards from the Kanban plugin* rewrite only those identifiers.
The legacy settings marker is still accepted when reading.
