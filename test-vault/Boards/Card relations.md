---

kanban-starlane: board

---

## Backlog

- [ ] Import from Trello: blocked until the parser is done ^imp0rt
- [ ] Export to CSV: depends on the import ^exp0rt
- [ ] Right-click a card → Add relation to link it to another card
- [ ] Click the number in the footer to see a card's relations ^h1nts1


## Doing

- [ ] JSON parser: check it off and the import is no longer blocked ^pars3r


## Done

**Complete**
- [x] Data schema: a done blocker does not block ^sch3ma




%% kanban-starlane:relations
```
{
"pars3r":[{"type":"blocks","card":"imp0rt"}],
"exp0rt":[{"type":"depends-on","card":"imp0rt"}],
"sch3ma":[{"type":"blocks","card":"pars3r"}],
"h1nts1":[{"type":"relates-to","card":"exp0rt"}]
}
```
%%

%% kanban-starlane:settings
```
{"kanban-starlane":"board"}
```
%%