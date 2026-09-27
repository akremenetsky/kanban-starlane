# Kanban Starlane

Kanban Starlane turns markdown notes into Kanban boards inside [Obsidian](https://obsidian.md).
Lists are headings, cards are task-list items — a board stays a plain markdown file that you
can read and edit without the plugin.

![A Kanban board in Obsidian](assets/home-board-overview-3.png)

Kanban Starlane is an independent Kanban plugin, developed further on its own roadmap. It
started as a fork of the [Kanban plugin](https://github.com/mgmeyers/obsidian-kanban) by
Matthew Meyers. It can be installed next to the original plugin and converts its boards on
demand — see [Coming from the Kanban plugin](getting-started/migrating-from-kanban-plugin.md).

## What it does

- Boards, lists and tables backed by a single markdown note.
- Drag and drop cards between lists and between boards.
- **Linked lanes**: a list can also show the cards of lists on other boards — keep one board
  per area and still see everything together ([how it works](guide/linked-lists.md)).
- Dates, times, tags, [WIP limits](guide/cards-and-lists.md#wip-limits) and an
  [archive](guide/archive.md) for finished cards.
- [Card history](guide/card-history.md): see when a card was created, moved or checked, even
  across boards.
- Cards can link to a note and show its [metadata](guide/linked-page-metadata.md), including
  fields from the Tasks and Dataview plugins.
- Every setting can be set globally or overridden per board — see [Settings](settings/index.md).

![Cards linking to other notes](assets/home-board-overview-2.png)

## Where to start

- New to Kanban Starlane? Start with [Getting started](getting-started/installation.md).
- Looking for a specific setting? Go to [Settings](settings/index.md).
- Something not working as expected? Check the [FAQ](faq.md).
