### Added
- **Epics**: group cards of a board under an epic card. Right-click a card → *Epic* → *Make
  epic*, then add cards to it (*Epic* → *Add to epic* on a card, or *Add cards to epic* on the
  epic). Each card of an epic shows the epic's name and colour above its text. The epic card
  gets a coloured band at the top and shows its progress at the bottom: a bar, how many of its
  cards are done and, for cards with a size, how much of the total weight is done. Hover it for
  the breakdown by size, click it to see the cards, jump to one, add or remove cards, change the
  colour or remove the epic. A card belongs to one epic at most; checked and archived cards count
  as done. An epic has no size of its own (making a sized card an epic removes its size) and is
  left out of the list's size total. Epics are kept in a hidden block at the end of the board
  file, so card text does not change. New *Epic* quick action; switch epics off in the new
  *Epics* settings.

### Fixed
- A list description starting with the first line of one of the plugin's hidden blocks (for
  example `%% kanban-starlane:settings` followed by other text) no longer hides the cards after
  it, which were then lost when the board was saved. Only a line that is exactly the block's
  first line is taken for a block now.
- A card moved to another board no longer keeps a block id that blocks of that board still
  name (the history, relations or epic of a card that was removed by editing the file): it gets
  a new one, so it does not take over another card's data. This also applies with card history
  switched off.
- A long popover (the list of an epic's cards) that fits neither above nor below its chip now
  scrolls instead of being cut off by the window edge.
