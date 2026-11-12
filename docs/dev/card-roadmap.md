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

- [ ] **1. Card zones scaffold.** Header/footer slots, chip component, chip popover.
      No visible change: unit/e2e proof that a card without data renders as before.
- [ ] **2. Date placement setting.** `inline` (as today) / `both` / `footer`, default `footer`.
      Follows the existing `inline-metadata-position` pattern. User-visible: dates of existing
      boards move to the footer after the update — CHANGELOG must say how to get them back.
- [ ] **3. Quick action panel.** Hover panel, `⋯` button removed on desktop (kept on mobile
      and while editing). *Needs a decision:* the default action set.
- [ ] **4. Card size (estimation).** XS / S / M / L / XL, picker popover, footer chip.
      Format change → `change-board-format` skill. *Needs a decision:* lane header total
      (sum of weights? count per size?), whether weights are configurable.
- [ ] **5. Relations within one board.** Card picker, relation types, blocked state in the
      header, relations popover (click → scroll to the card). Card identity = hidden block id
      `^id` (as linked lanes). *Needs a decision:* the list of relation types.
- [ ] **6. Epics within one board.** Mark a card as epic, assign cards (reuses the card picker
      from step 5), epic chip in the header, epic card with progress (cards done, sizes done).
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
- 2026-11-12 — Timers and epics start with the simplest version (independent timers, epics on
  the same board); cross-board epics come later.

## Open questions

- Default quick actions (step 3).
- Relation types, 5–7 at most (step 5).
- Lane header total for sizes (step 4).
