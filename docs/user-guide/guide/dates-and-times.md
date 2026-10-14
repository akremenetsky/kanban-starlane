# Dates and times

## Adding a date

Type the [date trigger](../settings/dates-and-time.md#date-trigger) — `@` by default — while
editing a card to open the date picker.

![Typing the date trigger opens the calendar](../assets/add-date-trigger-calendar.png)

You can also right-click a card, or open its `⋮` menu, and choose **Add date**.

![Adding a date from the card menu](../assets/add-date-context-menu.png)

## Adding a time

Type the [time trigger](../settings/dates-and-time.md#time-trigger) — `@@` by default — to open
the time picker.

![Typing the time trigger opens the time picker](../assets/add-time-trigger.png)

A card that already has a date can also get a time from its `⋮` menu.

![Adding a time from the card menu](../assets/add-time-context-menu.png)

## Dates as tags

If you already mark notes with date tags, switch [Date syntax](../settings/dates-and-time.md#date-syntax)
to **Tag**. A card's date is then written as an ordinary Obsidian tag:

| Tag | Meaning |
|---|---|
| `#26-10-14` | 14 October 2026, no time |
| `#26-10-14-13-25-20` | 14 October 2026, 13:25:20 |
| `#26-10-14-00-00-00` | 14 October 2026, midnight |

The tags show up in Obsidian's tag pane and search like any other tag. On the card they look
and work like any other date: colours, sorting, search, the calendar on click. The date
trigger writes the tag, and the time trigger adds the time to the card's date tag (or to
today's date if the card has none). If a card has several date tags, the first one is its date.

Only one syntax works at a time. With **Tag**, `@{…}` dates are plain text, and with the
default syntax, date tags are ordinary tags. Switching does not change your files.

## Formatting and display

- [Date format](../settings/dates-and-time.md#date-format) and
  [Time format](../settings/dates-and-time.md#time-format) control what gets written into the
  card's markdown.
- [Date display format](../settings/dates-and-time.md#date-display-format) controls how the
  date is shown on the card, independently of what's saved to disk.
- Move the date out of the card's body and into its footer with
  [Move dates to card footer](../settings/dates-and-time.md#move-dates-to-card-footer).
- Turn on [Show relative date](../settings/dates-and-time.md#show-relative-date) to show "in 3
  days" or "a month ago" instead of a fixed date.
- Turn on [Link dates to daily notes](../settings/dates-and-time.md#link-dates-to-daily-notes)
  to make a card's date open the matching daily note.
