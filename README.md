# Kanban Starlane

[![License: GPL v3](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A51.6.2-7C3AED)](https://obsidian.md)
[![BRAT](https://img.shields.io/badge/install%20with-BRAT-8b5cf6)](https://github.com/TfTHacker/obsidian42-brat)

Kanban boards for [Obsidian](https://obsidian.md), stored as plain markdown notes.

Kanban Starlane turns a note into a board: lists are headings and cards are task-list items, so
the note stays readable and editable without the plugin. Cards carry dates, tags and links to
other notes, move between lists and boards by drag and drop, and keep a history of what happened
to them. One list can also show the cards of lists on other boards, so you can keep a board per
area and still see all your work in one place.

Documentation: [akremenetsky.github.io/kanban-starlane](https://akremenetsky.github.io/kanban-starlane/)

![A Kanban board in Obsidian](docs/user-guide/assets/home-board-overview-3.png)

## Features

- **[Three views](https://akremenetsky.github.io/kanban-starlane/guide/views/)** of the same note: board, table and list.
- **[Cards and lists](https://akremenetsky.github.io/kanban-starlane/guide/cards-and-lists/)**: edit cards in place,
  embed images, turn a card into a note, search the board, drag cards between lists and boards.
- **[Linked lists](https://akremenetsky.github.io/kanban-starlane/guide/linked-lists/)**: a list also shows the cards of
  lists on other boards; each board's cards carry its color, and changes go to that board's file.
- **[Dates and times](https://akremenetsky.github.io/kanban-starlane/guide/dates-and-times/)** on cards, shown as dates or
  relative ("in 3 days").
- **[Tags](https://akremenetsky.github.io/kanban-starlane/guide/tags/)** with their own colors.
- **[WIP limits](https://akremenetsky.github.io/kanban-starlane/guide/cards-and-lists/#wip-limits)** per list.
- **[Card history](https://akremenetsky.github.io/kanban-starlane/guide/card-history/)**: when a card was created, edited,
  moved, checked or archived, even across boards.
- **[Archive](https://akremenetsky.github.io/kanban-starlane/guide/archive/)** for finished cards.
- **[Linked page metadata](https://akremenetsky.github.io/kanban-starlane/guide/linked-page-metadata/)**: a card linking
  to a note shows that note's properties, and
  [Tasks and Dataview fields](https://akremenetsky.github.io/kanban-starlane/settings/inline-metadata/) on the card
  are shown too.
- **[Settings](https://akremenetsky.github.io/kanban-starlane/settings/)** set globally or overridden per board.

## Installation

- **Community plugins** (recommended): in Obsidian open _Settings → Community plugins → Browse_,
  search for _Kanban Starlane_, install and enable it
  ([plugin page](https://community.obsidian.md/plugins/kanban-starlane)).
- **BRAT**: install [Obsidian42 - BRAT](https://github.com/TfTHacker/obsidian42-brat) and add
  this repository as a beta plugin.
- **Manually**: download `main.js`, `manifest.json` and `styles.css` from the latest release into
  `<your vault>/.obsidian/plugins/kanban-starlane/`, then enable _Kanban Starlane_ in
  _Settings → Community plugins_.

Requires Obsidian 1.6.2 or newer.

## Coming from the Kanban plugin

Kanban Starlane can be installed next to the original plugin; it does not open the original's
boards until you convert them. Open the command palette and run:

- **Convert all boards from the Kanban plugin** — converts every board in the vault, or
  **Convert board from the Kanban plugin** for the current note;
- **Import settings from the Kanban plugin** — copies your global settings.

Conversion changes only the plugin identifiers in each file (`kanban-plugin` →
`kanban-starlane`); lanes, cards, archive and board settings are kept. After converting,
disable the original plugin.

## Documentation

- User guide: [akremenetsky.github.io/kanban-starlane](https://akremenetsky.github.io/kanban-starlane/)
  (source: [docs/user-guide](docs/user-guide/index.md))
- Changes: [CHANGELOG.md](CHANGELOG.md)

## Development

```bash
npm install
npm run dev        # watch build, installs into test-vault/ — open that folder as a vault
npm run check      # typecheck, lint, format check, unit tests
npm run test:e2e   # end-to-end tests in real Obsidian
```

Start with [AGENTS.md](AGENTS.md) (conventions and workflow — for humans and AI agents alike)
and [docs/dev/](docs/dev/architecture.md) (architecture, board format, testing, decisions).

## Credits and license

Kanban Starlane is a fork of the [Kanban plugin](https://github.com/mgmeyers/obsidian-kanban)
2.0.51 by Matthew Meyers. It is developed on its own roadmap.

Copyright (C) 2021–2024 Matthew Meyers — original Kanban plugin
([his note on the project's history](docs/history/original-maintainers-note.md)).
Copyright (C) 2026 Anton Kremenetsky — Kanban Starlane modifications (see [CHANGELOG.md](CHANGELOG.md)).

Licensed under the [GNU General Public License v3.0](LICENSE). Bundled third-party code
keeps its own license: flatpickr (MIT), parts of Dataview and Tasks (MIT),
Hot Reload in the test vault (ISC).
