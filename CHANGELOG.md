# Changelog

All notable changes to Kanban Starlane. Kanban Starlane is a modified version of the
[Kanban plugin](https://github.com/mgmeyers/obsidian-kanban) by Matthew Meyers (2.0.51).

## Unreleased

### Added
- **Quick actions**: hover a card to show a small panel of buttons in its top-right corner —
  by default *Mark as done*, *Add or change date*, *Move to next list*, and `⋮` for the card
  menu. Choose up to five actions in the new *Quick actions* settings (also *Move to list*,
  *Open or create note*, *Archive card*, *Duplicate card*). The `⋮` button no longer takes
  room on every card; on phones and tablets it stays as before.

### Changed
- **Dates now sit in a footer at the bottom of the card** by default: a calendar icon, the date,
  the time and, with *Show relative date*, the relative date ("in 3 days"). Click the date or
  the time to change it. Cards without a date look as before.
- The *Move dates to card footer* switch is replaced by **Date position** (*Date & Time*):
  *In the card footer* (default), *In the card text*, or *In the card text and footer*. Boards
  and plugin settings where the switch was explicitly set keep their choice; where it was never
  changed (it was off by default), dates now move to the footer. To get the old look
  everywhere, set Date position to *In the card text* in the plugin settings.
- Settings that put tags, task data and inline fields on the line below the card text are now
  named *below the card text* instead of *card footer*: *Show tags below the card text*,
  *Show task data below the card text*, and *Below the card text* in *Inline metadata
  position*. They work as before.

## 0.1.9 — 2026-10-25

### Added
- **Show date tags as written** (*Date & Time*, tag date syntax only): the card shows its date
  tag as written, such as `#26-10-14-13-25-20`, instead of a formatted date and time. It is a
  real tag, so CSS snippets for tags style it; it keeps the date colours, and clicking it opens
  the calendar. Off by default.
- User guide: a CSS snippet that hides dates and tags on cards while they keep working.

### Fixed
- A board with many lists could start scrolling to the right on its own and keep pulling back
  there when scrolled left, until Obsidian was restarted. Drag auto-scroll now stops at the edge
  (also with zoom or display scaling, and with a vertical scrollbar), ends with the drag, and
  scrolls only the list or board the card is dragged against, not every list at once.

## 0.1.8 — 2026-10-21

### Added
- **Send a card to a linked board.** In a list that shows lists of other boards, the card menu
  has **Move to board: …**. It moves the card into the linked list of that board without
  opening it; the card stays visible in your list as a linked card with its board's stripe.
  With several linked lists the item opens a submenu. The item names the board; the list is
  named too only when it is not obvious (it is called differently from yours, or the board has
  several linked lists).

## 0.1.7 — 2026-10-17

### Added
- **Highlight important cards.** A new *Highlight card* switch in *Tag colors* makes cards
  with that tag stand out with a stripe on the left and a light tint of the tag's color. Every
  such tag also appears in the card menu under *Mark as*, to add or remove it in one click.
  `#urgent` and `#important` come ready, so no setup is needed: they are added to *Tag colors*
  once, and cards already tagged with them get highlighted. If you already colored one of these
  tags, your colors stay and the highlight is switched on. If a card has several highlighting
  tags, the first one in the list wins.

## 0.1.6 — 2026-10-14

### Added
- **Filter by tags and boards.** A funnel button in the board header opens a filter row:
  pick tags from those on the board (each with its number of cards) to show only the cards
  that have any of them, and — on boards with linked lists — pick the boards whose cards to
  show. Selected values show as chips with ×; clicking the funnel again resets the filter.
  The filter is not saved to the board file. It can be hidden in *Board header buttons*,
  and the command *Filter cards by tag* opens it from the command palette.
- **Dates as tags.** The new *Date syntax* setting (globally or per board) can write card
  dates as Obsidian tags — `#26-10-14`, or `#26-10-14-13-25-20` with a time — instead of
  `@{…}`. Such dates work like any other: the date picker, time picker, card menu, colours,
  sorting and search. Only one syntax is active at a time; switching does not change files.
  ([#16](https://github.com/akremenetsky/kanban-starlane/issues/16))

### Changed
- With *Tag click action* set to *Search Kanban Board*, clicking a tag adds it to the filter
  (it still searches the board's text when the filter button is turned off).

## 0.1.5 — 2026-10-09

### Changed
- New plugin description in the community plugin directory.

### Fixed
- Text typed into the *Add a card* field was lost when clicking elsewhere on the board. It is
  now saved as a card; an empty field just closes, and Escape still discards the text.

## 0.1.4 — 2026-10-05

### Added
- **List descriptions.** A list can have an optional description, shown under its title in a
  smaller, muted font. Add or edit it from the list menu (*Add description* / *Edit
  description*), by double-clicking it, or when creating a list. It is stored in the board
  file as text right under the list's heading, so it is readable without the plugin.
  Text that was already written under a list's heading is now shown as its description
  instead of being removed on save.

### Fixed
- Cards of several lines showed their service id (such as `^mmwuwm`) at the end of the first
  line; the id is hidden again.
- Tags at the start of a card's second (or later) line were not recognised: no tag badge, tag
  colour or *Move tags to footer*.

## 0.1.3 — 2026-10-04

### Changed
- Fixed the remaining review scanner findings (typing of dates and a sort helper). Nothing
  changes for boards or their files.

## 0.1.2 — 2026-10-03

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
