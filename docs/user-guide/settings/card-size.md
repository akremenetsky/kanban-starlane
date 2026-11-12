# Card size

Give cards a size — **XS**, **S**, **M**, **L** or **XL** — to estimate how big a task is.
A card shows its size in its footer, and each list shows the total of its cards' sizes next to
the card count.

## Card sizes

On by default. The size is written into the card's text as a tag, `#size/M`, so it stays with
the card when you copy it, works in the [tag filter](../guide/cards-and-lists.md#filtering-by-tags-and-boards)
and in Obsidian's search (`tag:#size/M`). On the card the tag itself is hidden; the footer
shows the size instead.

When off, `#size/…` tags are ordinary tags.

## Size tag

The word in size tags, `size` by default. With `est`, sizes are written as `#est/M`. Use another
word if your vault already has `#size/…` tags for something else. Changing it does not rewrite
your cards: tags with the old word become ordinary tags again.

## Size weights

What each size counts for in the list total: by default XS 1, S 2, M 3, L 5, XL 8. Leave a
field empty to use the default; in a board's settings, an empty field uses the global value of
that size.
