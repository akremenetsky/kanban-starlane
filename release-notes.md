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
