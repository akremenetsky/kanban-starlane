# Card design roadmap

A shared layout for new card features (sizes, relations, epics, timers, quick actions) and the
order in which they ship. One step = one PR. Mock-ups: concept page shared with the product
owner on 2026-11-12 (variant A + chip popovers from variant C).

Update this file in every PR of the roadmap: tick the step, move settled questions into
*Decisions*.

## Card anatomy

```
┌───────────────────────────────┐  ← quick action panel floats over the top edge (hover)
│ ● Import from Trello   🔒 Blocked │  header: context — epic, blocked. Only these two.
│ ☐ Card text #tag              │  body: checkbox, text, tags — unchanged
├───────────────────────────────┤
│ 📅 Nov 18   ◔ M   🔗 1   ⏱ 42:13 │  footer: signals — date, size, relations, timer
└───────────────────────────────┘
```

| Zone | Holds | Rules |
|---|---|---|
| Header | Epic, blocked state | Rendered only when not empty. Small text, one line. |
| Body | Checkbox, text, tags | As today. |
| Footer | Date, size, relations, timer, later features | Icon + value, one line, fixed order on the whole board. Grows from the existing metadata area. |
| Action panel | Quick actions | Appears on hover / keyboard focus over the top-right corner; never changes card height. |
| Card state | Running timer, blocked, epic card | Shown by border/background, not by extra text. |

### Rules

1. An empty zone is not rendered: a card without new data looks exactly as today.
2. Each zone is one line; overflow collapses into `+N`, the rest is in a popover.
3. Every feature is a **chip**: icon, value, colour, popover. A new feature picks a zone and a
   position in the order; it does not add its own layout.
4. Chip order is the same on every card of the board.
5. Colour only for states (blocked, overdue, running timer) and epic membership.
6. The card shows, the popover edits: clicking a chip opens its popover.
7. Totals go one level up: lane header (sum of sizes), epic card (progress).
8. Every chip can be hidden in board settings; each feature PR adds its own switch.
9. Nothing technical is visible on a card (ids, raw syntax). Hidden file structures are fine.

### Colour channels

Each colour source owns one channel, so they never compete:

| Source | Channel |
|---|---|
| Tag highlight (`Tag colors` → *Highlight card*) | left edge + background tint (existing) |
| Linked board colour (`board-color`) | bottom edge (existing) |
| Epic colour | epic chip text + dot in the header; header band of the epic card |
| States | blocked: red header chip, dashed checkbox; running timer: accent outline |

Epic colours must never become an edge or a background tint on member cards. If two sources
ever have to share a channel, the tag highlight wins (product owner, 2026-11-12).

## Steps

Each step is a separate PR from `main`. Steps 1–3 need no new syntax in board files.

- [x] **1. Card zones scaffold.** Header/footer slots, chip component, chip popover.
      No visible change: unit/e2e proof that a card without data renders as before.
      How it works: *Card zones* in [architecture.md](architecture.md). Not built yet:
      collapsing overflow into `+N` (rule 2) — comes with the first feature that can
      overflow a line; until then labels are truncated with an ellipsis. Re-placing an open
      popover when its content or the window resizes, and an e2e test of a popover in real
      Obsidian, come with the first chip that has a popover.
- [ ] **2. Date placement setting.** `inline` (as today) / `both` / `footer`, default `footer`.
      Follows the existing `inline-metadata-position` pattern. User-visible: dates of existing
      boards move to the footer after the update — CHANGELOG must say how to get them back.
- [ ] **3. Quick action panel.** Hover panel, `⋯` button removed on desktop (kept on mobile
      and while editing). The set is a setting: up to 5 actions picked from the existing card
      menu actions — Done, Date, Next lane, Move to lane…, Open/create note, Archive,
      Duplicate — in a fixed order; `⋯` is always last and not counted. Default:
      Done · Date · Next lane · `⋯`. Delete is never offered. New features (timer, size,
      relations) add their actions to the list in their own PRs.
- [ ] **4. Card size (estimation).** XS / S / M / L / XL, picker popover, footer chip.
      Format change → `change-board-format` skill. Every size has a weight (default
      XS 1, S 2, M 3, L 5, XL 8, editable in settings). The lane header shows the sum of weights
      with the size icon, right-aligned, hidden when no card has a size. Hover (tap on mobile)
      shows the breakdown: count and weight per size, and the weight scale.
- [ ] **5. Relations within one board.** Card picker, relation types, blocked state in the
      header, relations popover (click → scroll to the card). Card identity = hidden block id
      `^id` (as linked lanes). Types, each shown from both sides:
      blocks / blocked by (the only one that sets the blocked state), relates to,
      duplicates / duplicated by, causes / caused by, depends on / required for.
- [ ] **6. Epics within one board.** Mark a card as epic, assign cards (reuses the card picker
      from step 5), epic chip in the header, epic card with progress in its footer: bar,
      cards done of total, weight done of total; hover shows the breakdown by size. An epic card
      has no size of its own — its total is computed from its cards.
- [ ] **7. Timers.** Per-card start/stop from the panel and the footer chip. Several timers may
      run at once (independent cards need no coordination, so this is also the simplest).
      Finished intervals go to card history.
- [ ] **8. Relations across boards.** Built on `plugin.retainBoard` like linked lanes.
- [ ] **9. Epics across boards.** Same mechanism as step 8.

## Decisions

- 2026-11-12 — Layout: variant A (header + footer) with chip popovers from variant C.
- 2026-11-12 — Scaffold first, then one feature per PR, in the order above.
- 2026-11-12 — Estimation uses sizes (XS–XL), not numbers.
- 2026-11-12 — Date placement is a setting with three options, default *footer only*.
- 2026-11-12 — Tag highlight outranks epic colour.
- 2026-11-12 — Quick actions: configurable set from the existing menu actions (step 3).
- 2026-11-12 — Relation types: blocks, relates to, duplicates, causes, depends on (step 5).
- 2026-11-12 — Size totals: sum of weights in the lane header with a hover breakdown; epic
  progress in the epic card footer (steps 4, 6).
- 2026-11-12 — Timers and epics start with the simplest version (independent timers, epics on
  the same board); cross-board epics come later.

## Open questions

None at the moment.
