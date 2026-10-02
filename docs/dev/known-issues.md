# Known issues and quirks

Behaviour inherited from obsidian-kanban 2.0.51 that is pinned by tests but probably not
what users expect. Each item is a candidate task; fixing one means updating its test.

| Area | Behaviour | Pinned by |
|---|---|---|
| Card links | A card with several links/embeds keeps only the **last** one as "the card's file" (used for linked metadata and the card menu). | `parse.test.ts` › keeps only the last link/embed |
| Frontmatter | Setting keys written in frontmatter (e.g. `lane-width: 300`) are moved into the settings JSON on the first save. | `parse.test.ts` › moves setting keys found in frontmatter |
| Settings | Board metadata keys are merged with global ones, never replaced. | `stateManager.test.ts` › merges global and board metadata keys |
| Diff/patch | `diffApply` mutates non-plain objects (class instances) on the old state in place. | not yet |
| Drag & drop | Real pointer drags are only covered by `linkedLanes.e2e.ts`; other drags are verified by hand. | — |
| Opening | Closing a board right after an edit and reopening it at once can read the file while Obsidian writes it; the empty data makes `setViewData` switch the leaf to markdown. Inherited. | — (seen in `linkedLanes.e2e.ts`, which now waits for the save) |
| Linked lanes | New own cards in a combined lane follow the `self` slots: with *prepend*, a new card takes the first own slot and the other own cards shift one slot. | — |
| Linked lanes | Positions among own cards are stored by count; editing the own lane in markdown can shift linked cards relative to own ones. | — |
| Linked lanes | A linked board edited in a markdown view keeps its unsaved typing only once Obsidian has saved it (≈2 s); a change made from another board before that is dropped with a notice. | `backgroundBoard.test.ts` › keeps a change made on disk |
| Linked lanes | If a linked board or lane is missing, moving cards in that combined lane does not update its stored order (so positions of the missing board's cards are kept for when it comes back). | `linkedDrop.test.ts` › keeps stored positions … not available |
| Linked lanes | Only the board view shows linked cards; the table view shows own cards. While a whole lane is dragged, its preview shows own cards only. | — |
| Linked lanes | Remembering some positions gives linked cards block ids (`^id`) in their file, even if only this board's order changed. Block ids are not shown on boards. | `linkedDrop.test.ts` › keeps an interleaving … in D1 only |
| Card history | Only changes made in the plugin are recorded; editing the markdown directly is not. Moving a card by cutting/pasting its line to another board loses its history. | `cardHistory.test.ts` › does not record changes read from the file |
| Card history | A history block that cannot be read (bad JSON, wrong shape) is kept as is, and that board records nothing new until it is fixed; a card dragged onto such a board loses its history. | `parse.test.ts` › keeps an unreadable history block |
| Card history | Splitting a card records the parts as new cards; the original's history is dropped. | — |
| Code review | The Obsidian review warns about loose typing (`any`, unsafe member access/return; ~400 places inherited from obsidian-kanban), `fs` (copying files pasted from the OS clipboard in `dropAndPaste.ts`), `localStorage.getItem('language')` (`getLanguage()` needs Obsidian 1.8.7, `minAppVersion` is 1.6.2), vault enumeration (needed to find boards for linked lanes and migration) and `new Function` (from a bundled dependency). The typed-unsafe rules are off in `eslint.config.mjs`; the rest are warnings. | `npm run lint` |
| Card menu | *New note from card* turns the whole text of the first line into one link; dates, times and tags from the middle of the line are moved after the link. Other links in that line are replaced by their text. | `noteFromCard.test.ts` |

Fixed during the fork setup (see `CHANGELOG.md`): lost settings edits within one second,
stale inline metadata after editing an open board, reset buttons showing the wrong state,
duplicated mobile menu item, archive/complete markers depending on the UI language, a board
failing to open when it embeds a missing note with markdown link syntax.
