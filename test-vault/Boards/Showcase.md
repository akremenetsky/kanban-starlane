---

kanban-starlane: board

---

## 📥 Backlog

- [ ] Design the new pricing page #design @{2026-10-05}
- [ ] Write the public API docs #docs
- [ ] Research competitor onboarding flows #research
- [ ] Plan the Q4 roadmap #planning


## ⚙️ In Progress (4)

- [ ] Fix the login redirect bug [[Website]] #bug @{2026-09-28}
- [ ] Build the onboarding checklist #feature @{2026-10-02}
- [ ] Refactor the notifications service #infra


## 👀 Review

- [ ] Ship dark mode #feature @{2026-10-08}
- [ ] Prepare the release notes #docs
- [ ] Accessibility pass on the settings page #design


## 🚀 Launch

- [ ] Announce v2.0 on the blog #marketing @{2026-10-12}
- [ ] Update the pricing page copy #marketing


## 📦 Done

**Complete**
- [x] Kick-off meeting @{2026-09-15}
- [x] Set up the CI pipeline #infra @{2026-09-18}
- [x] Migrate to the new hosting #infra @{2026-09-22}
- [x] Finalize the brand palette #design @{2026-09-24}




%% kanban-starlane:settings
```
{"kanban-starlane":"board","board-color":"#0090ff","show-checkboxes":true,"move-tags":true,"move-dates":true,"show-relative-date":true,"metadata-keys":[{"metadataKey":"status","label":"Status","shouldHideLabel":false,"containsMarkdown":false},{"metadataKey":"owner","label":"Owner","shouldHideLabel":false,"containsMarkdown":false}],"tag-colors":[{"tagKey":"#bug","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(220, 38, 38, 1)"},{"tagKey":"#feature","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(48, 164, 108, 1)"},{"tagKey":"#design","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(171, 74, 186, 1)"},{"tagKey":"#docs","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(9, 105, 218, 1)"},{"tagKey":"#research","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(230, 126, 34, 1)"},{"tagKey":"#infra","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(107, 114, 128, 1)"},{"tagKey":"#planning","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(107, 114, 128, 1)"},{"tagKey":"#marketing","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(247, 107, 21, 1)"},{"tagKey":"#qa","color":"rgba(255, 255, 255, 1)","backgroundColor":"rgba(18, 165, 148, 1)"}],"linked-lanes":{"⚙️ In Progress":{"sources":[{"file":"Boards/Design.md","lane":"Doing"},{"file":"Boards/QA.md","lane":"Testing"}],"order":["self","Boards/Design.md#^desdoing1","Boards/QA.md#^qatest1","self","Boards/Design.md#^desdoing2","self","Boards/Design.md#^desdoing3","Boards/QA.md#^qatest3"]},"👀 Review":{"sources":[{"file":"Boards/QA.md","lane":"Sign-off"},{"file":"Boards/Marketing.md","lane":"Ready"}],"order":["self","Boards/QA.md#^qasign1","Boards/Marketing.md#^mktready1","self","Boards/QA.md#^qasign2","Boards/Marketing.md#^mktready2","self"]},"🚀 Launch":{"sources":[{"file":"Boards/Marketing.md","lane":"Scheduled"},{"file":"Boards/Design.md","lane":"Polish"}],"order":["self","Boards/Marketing.md#^mktsched1","Boards/Design.md#^despolish1","self","Boards/Marketing.md#^mktsched2","Boards/Design.md#^despolish2"]}}}
```
%%