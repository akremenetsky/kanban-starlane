---

kanban-starlane: board

---

## Backlog

- [ ] CSV import: an epic, its progress is at the bottom ^csvimp
- [ ] Map columns to fields #size/M ^mapcol
- [ ] Right-click a card → Epic → Add to epic #size/S
- [ ] Release notes: an epic with no cards yet ^relnot


## Doing

- [ ] Parse CSV files: check it off and the epic progress grows #size/L ^parsec


## Done

**Complete**
- [x] Design the import screen #size/S ^design




***

## Archive

- [x] Spike: archived cards count as done ^spike1

%% kanban-starlane:epics
```
{
"csvimp":{"color":"green","cards":["mapcol","parsec","design","spike1"]},
"relnot":{"color":"purple","cards":[]}
}
```
%%

%% kanban-starlane:settings
```
{"kanban-starlane":"board","quick-actions":["done","date","epic"]}
```
%%
