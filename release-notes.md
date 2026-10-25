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
