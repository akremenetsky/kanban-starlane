# Date & time

## Move dates to card footer

When on, dates are shown in the card's footer instead of inline in its body text.

## Date syntax

How card dates are written into markdown:

- **@{date} @@{time}** (default) — `@{2026-10-14}` and `@@{13:25}`, using the triggers and
  formats below.
- **Tag** — an Obsidian tag: `#26-10-14`, or `#26-10-14-13-25-20` with a time. The triggers
  still open the pickers; [Date format](#date-format), [Time format](#time-format) and
  [Link dates to daily notes](#link-dates-to-daily-notes) do not apply. See
  [Dates as tags](../guide/dates-and-times.md#dates-as-tags).

Dates written the other way are no longer recognised, but your files are not changed:
switching back brings them back.

## Date trigger

The character (or sequence of characters) that opens the [date
picker](../guide/dates-and-times.md#adding-a-date) while editing a card. Default: `@`.

![Date trigger setting](../assets/date-trigger-setting.png)

## Time trigger

The character (or sequence) that opens the [time
picker](../guide/dates-and-times.md#adding-a-time). Default: `@@`.

![Time trigger setting](../assets/time-trigger-setting.png)

## Date format

The format a date is saved as in markdown. Uses [moment.js
tokens](https://momentjs.com/docs/#/displaying/format/).

`YYYY-MM-DD`:

![Date format YYYY-MM-DD](../assets/date-format-ymd.png)

`ddd, MMM Do, YYYY`:

![Date format ddd, MMM Do, YYYY](../assets/date-format-ddd.png)

## Time format

The format a time is saved as. Uses [moment.js
tokens](https://momentjs.com/docs/#/displaying/format/).

`HH:mm`:

![Time format HH:mm](../assets/time-format-24h.png)

`h:mm a`:

![Time format h:mm a](../assets/time-format-12h.png)

## Date display format

How a card's date is *shown*, independent of [Date format](#date-format) used to save it.

![Setting the date display format](../assets/date-display-format-setting.png)

A card with a date in the current [Date format](#date-format):

![A card with a saved date](../assets/date-display-format-card-date.png)

...shown using the display format:

![The date shown using the display format](../assets/date-display-format-result.png)

## Show relative date

Shows the distance between today and a card's date (e.g. "In 3 days", "A month ago") instead of
a fixed date. Not applied to dates from the Tasks and Dataview plugins.

![A relative date on a card](../assets/show-relative-date.png)

## Link dates to daily notes

Makes a card's date link to the matching daily note, e.g. `[[2021-04-26]]`.

![A date linking to a daily note](../assets/link-dates-daily-notes-1.png)
![The linked daily note](../assets/link-dates-daily-notes-2.png)

## Calendar: first day of week

Overrides which day the date picker's calendar starts each week on. Default: follows Obsidian's
own setting.
