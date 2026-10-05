# Kanban Starlane — test vault

A sandbox for trying the plugin by hand. It is part of the repository: change it freely,
and use `git checkout test-vault` to get the original notes back.

## Open it

1. In the repository run `npm run dev` (rebuilds on every change and installs the plugin
   into `test-vault/.obsidian/plugins/kanban-starlane`).
2. In Obsidian: *Open another vault → Open folder as vault →* choose this `test-vault` folder.
3. On first open, Obsidian asks whether to trust the vault's plugins — choose **Trust**.

**Hot Reload** is pre-installed: after each rebuild the plugin reloads by itself.

## What's inside

| Note | What to try |
|---|---|
| `Boards/Welcome.md` | Basic board: drag cards, add/edit cards, WIP limit, the "Complete" lane, archive. **List descriptions**: double-click one to edit, lane menu (⋮) → *Add description* on *Done*, or add a list with a description |
| `Boards/Project.md` | Dates and times, tags, links to notes, metadata of linked notes |
| `Boards/Legacy board.md` | A board from the original Kanban plugin: run **Convert board from the Kanban plugin** |
| `Projects/*.md` | Notes the project board links to (their `status`/`owner` show on cards) |
| `Areas/Personal.md` | **Linked lanes**: *In progress* and *Done* also show the cards of `Areas/Work.md` (blue stripe). Drag them between those lanes, reorder them among personal cards, check them — then open `Work.md` |
| `Areas/Work.md` | **Card history**: card menu (⋮) → *History* on "Fix the login bug" or "Ship release 2.3" (sample history). Move, edit, check a card, then open its history again; `Work.md` in markdown mode shows the history block (a hidden comment) at the end |
| `Areas/Overview.md` | A board with no cards of its own: both lanes show Work (blue) and Personal (green). Lane menu → *Show cards from other boards* to change the links |
