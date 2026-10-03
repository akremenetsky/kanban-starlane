# Changelog

All notable changes to Kanban Starlane. Kanban Starlane is a modified version of the
[Kanban plugin](https://github.com/mgmeyers/obsidian-kanban) by Matthew Meyers (2.0.51).

## Unreleased

Clean-up for the review scanner of the community directory (the plugin page listed 1698
issues). Nothing changes for boards or their files.

### Changed
- Requires Obsidian 1.8.7 or newer (was 1.6.2).
- The date picker no longer adds `flatpickr` to every element, list and date in Obsidian, nor
  CSS rules to Obsidian's stylesheet; keyboard navigation uses current browser APIs.
- The UI language is read with Obsidian's `getLanguage()`.
- *New note from card* opens the note with current Obsidian APIs; if the configured note folder
  does not exist, the note is created in the default location.
- An image pasted from the clipboard on desktop is saved through Obsidian's binary API with the
  expected data type.
- Removed unused parts of the bundled date picker and dependency updates past known advisories.

## 0.1.1 — 2026-10-03

Changes made for Obsidian's community plugin review. Nothing changes for boards or their files.

### Changed
- Date picker: built without `innerHTML`, uses Obsidian's `Platform` instead of browser sniffing.
- Styles are set through Obsidian's `setCssStyles` or CSS classes instead of inline assignments.
- Release assets (`main.js`, `manifest.json`, `styles.css`) carry GitHub build attestations.
- Removed unused dependencies and the unused `preact-shim.js`.

## 0.1.0 — 2026-10-02

First version of the fork.

### Changed
- New plugin identity: id `kanban-starlane`, name *Kanban Starlane*. Can be installed next to
  the original Kanban plugin.
- Boards are marked with `kanban-starlane: board` in frontmatter and store settings under
  `%% kanban-starlane:settings`.
- The `Archive` heading and the `**Complete**` marker are always written in English and are
  recognised in any language, so changing Obsidian's language no longer breaks boards.
- Requires Obsidian 1.6.2 or newer.

### Added
- **Linked lanes**: a list can also show the cards of lists on other boards (list menu →
  *Show cards from other boards*). Those cards keep a stripe in their board's color and stay
  in their own board: checking, editing, archiving and moving them changes that board, even
  when it is not open. They can be put in any order among this list's cards; they can only be
  moved to lists that show their board. The card menu names the card's board (*From board: …*) and
  opens it.
- **Card history**: the board records when each card was created, edited, moved to another
  list, checked or unchecked, archived — also for cards changed from another board through
  linked lists (the history is kept in the card's own board). Card menu → *History* lists the
  events and shows since when the card is in its list. Stored in a hidden block at the end of
  the board file; cards get a block id (`^id`) with their first event. Edits within 2 minutes
  count as one; deleting a card deletes its history; dragging it to another board takes the
  history along. Can be turned off (setting *Card history*).
- **Board color** (board settings): the color that marks this board's cards on other boards.
- Commands to migrate from the Kanban plugin: *Convert board from the Kanban plugin*,
  *Convert all boards from the Kanban plugin*, *Import settings from the Kanban plugin*.

### Fixed
- Duplicating a card or a list copied block ids, so two cards had the same `^id`.
- A component could miss a board setting read while the board was still loading.
- Changing two settings within a second saved only the last change.
- Inline metadata (`[key:: value]`) removed from a card in markdown stayed visible until the
  board was reopened.
- "Reset to default" in settings showed the wrong toggle state for header buttons and for
  "Move dates / task data to card footer".
- A board failed to open when a card embedded a missing note with `![alt](Note.md)`.
- The mobile board menu listed "Archive completed cards" twice.
- A second copy of moment.js and Luxon is no longer bundled (smaller `main.js`).
- *New note from card* put the card's date, time and tags into the note's name and replaced
  them with the link, so the card lost its date and tags and showed raw HTML. Now the note is
  named after the card's text only, and the date, time and tags stay on the card.
- The board icon was blank everywhere (tab, ribbon, *New kanban board* in the folder menu,
  *View as board*): the Lucide icon it used no longer exists in Obsidian.
- The global settings page was titled "Kanban Plugin" instead of "Kanban Starlane".
