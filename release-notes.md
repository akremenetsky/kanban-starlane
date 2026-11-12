### Added
- **Card size**: give a card a size — XS, S, M, L or XL — from its menu (*Size*), the new *Set
  size* quick action, or by clicking the size in the card footer. Each list shows the total
  of its sizes next to the card count; hover or click it to see how it adds up. A size is a
  tag in the card text, `#size/M`, so it works in the tag filter and in search. New settings
  in *Card size*: switch sizes off, change the tag word, and set what each size weighs
  (XS 1, S 2, M 3, L 5, XL 8 by default).
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

### Fixed
- A multi-line card with a tag or date at the end of its first line was shown with that line
  run together with the next one (and a code block below could break) when moving tags or
  dates out of the text and the vault indents with spaces. Files were not affected.
