---

kanban-starlane: board
cssclasses:
  - wide

---

## Backlog (5)

- [ ] Simple card
- [ ] Card with #tag and #another/nested
- [ ] Due @{2024-03-05} at @@{10:30}
- [ ] Daily note date @[[2024-03-06]]
- [/] In progress (custom status)
- [x] Done with block id ^abc123
- [ ] Multi line card
    second line
    - nested bullet
- [ ] Link to [[Some Note]]
- [ ] Embed ![[image.png]]
- [ ] Markdown link [label](Other%20Note.md)
- [ ] `inline code` and **bold** and ~~strike~~
- [ ] 


## Lane<br>with break



## Empty lane



## Done

**Complete**
- [x] Finished one
- [x] Finished two


***

## Archive

- [x] Archived card
- [x] Another archived card ^zzz999

%% kanban-starlane:settings
```
{"kanban-starlane":"board","list-collapse":[false,true,false,false],"lane-width":300,"show-checkboxes":true}
```
%%