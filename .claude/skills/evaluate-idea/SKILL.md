---
name: evaluate-idea
description: Analyse a product idea from the product owner before any implementation — can existing features already do it, conflicts with current behaviour, effort and risk, demand in other kanban tools and Obsidian plugins, file-format impact, maintenance cost, smaller alternatives. Produces a per-criterion report and a summary table with a recommendation. Use when the product owner shares an idea, asks "is it worth doing", "evaluate", "оцени идею", "проанализируй идею" — not when they ask to build it.
---

# Evaluate a product idea

The goal is a decision, not code. **Do not create a branch, edit `src/` or write tests.**
Reading code, running the plugin in `test-vault/` and searching the web are all fine.

## 1. Restate the idea
- One or two sentences: what the user does, what they see, what problem it solves.
- Name the **underlying need** separately from the proposed solution ("wants to see overdue
  cards at a glance" vs "add a red badge"). Criteria 1 and 9 are judged against the need.
- If the idea is ambiguous in a way that changes the whole evaluation, ask the product owner
  (in Russian, batched, with your assumed reading as the default). Otherwise state your
  assumptions and proceed.

## 2. Gather context
- Current behaviour: `docs/user-guide/` (what users already have), `src/settings/` (existing
  options), `docs/dev/decisions.md` (was this considered or rejected before?),
  `docs/dev/known-issues.md`, `CHANGELOG.md`.
- Code touched: locate it via `AGENTS.md` → "Where things go" and `docs/dev/architecture.md`.
- Demand signals:
  - this repo's issues: `gh issue list -R akremenetsky/kanban-starlane --search "<words>" --state all`;
  - upstream: `gh api -X GET search/issues -f q="repo:community-archive/obsidian-kanban is:issue <words>" -f sort=reactions`
    (upstream moved from `mgmeyers/` to `community-archive/`) — count issues
    and reactions (`gh issue view <n> -R community-archive/obsidian-kanban --json reactionGroups,comments`);
  - the Obsidian forum (forum.obsidian.md) and the community plugin list.
- Other tools (web search): Trello, GitHub Projects, Jira, Linear, Notion, Planka, Wekan,
  Focalboard; in Obsidian — Obsidian Bases, Projects, Tasks, Dataview, Make.md, other kanban
  plugins. Note how each one solves the need, not only whether the feature exists.

## 3. Evaluate each criterion
For every criterion: findings with evidence (file paths, links, issue numbers), then a
rating from the scale. Say "unknown" rather than guessing; list what would resolve it.

1. **Already solvable.** Can the need be met with existing plugin features, settings, plain
   markdown, Obsidian core (search, Bases, templates, CSS snippets) or a popular plugin
   (Tasks, Dataview, Templater)? Try it in `test-vault/` when cheap. If yes, write the exact
   recipe — it may be the answer, or a docs page instead of a feature.
   *Scale:* fully / partially / no.
2. **Conflicts and risks with existing features.** Interaction with: linked lanes, archive,
   card history, dates (trigger and tag syntax), inline/linked metadata, table/list views,
   drag & drop, search/filter, pop-out windows, several views of one file, mobile, Tasks and
   Dataview integrations, settings inheritance (global → board). Also hotkeys and command ids.
   *Scale:* none / minor / serious / blocking.
3. **Effort.** Which layers change (`parsers`, `state`, `components`, `dnd`, `settings`,
   `integrations`), rough size (S ≤ 1 day, M ≤ 1 week, L > 1 week of agent work), whether it
   needs a refactor first, what tests are needed (unit, e2e). Name the hardest part.
   *Scale:* S / M / L / needs a rework.
4. **Usefulness and demand.** Who benefits (every user / a segment / one person), how often,
   evidence from issues, reactions, forum threads, and how common the feature is in other
   tools. A feature everywhere suggests users expect it; absent everywhere — check why.
   *Scale:* high / medium / low.
5. **Board file impact.** Does it write anything new into board files or linked notes? Read
   `change-board-format`: is it backward compatible, readable as plain markdown, does it
   survive opening the board with upstream obsidian-kanban or without the plugin? Any
   migration? Unchanged boards must stay byte-identical.
   *Scale:* none / additive and safe / risky.
6. **UX and complexity cost.** New settings, buttons, menu items; discoverability; does it
   make the common path harder? Is it consistent with how the plugin works today? Respect
   "no visible service data on cards".
   *Scale:* simplifies / neutral / adds noticeable complexity.
7. **Maintenance and platform risk.** Reliance on Obsidian internals or other plugins' APIs
   (break on updates), performance on large boards, mobile, the community review scanner,
   ongoing support burden.
   *Scale:* low / medium / high.
8. **Alternatives and MVP.** A smaller version that delivers most of the value; different
   approaches (setting vs command vs view vs docs recipe); what to postpone.
   *Output:* the recommended scope in one or two sentences.
9. **Open questions** for the product owner — product decisions that must be made before
   building (behaviour, defaults, what is written to files).

## 4. Report (in Russian, in chat)
Structure:

```
## Идея
<restatement, underlying need, assumptions>

## 1. Можно ли решить существующими средствами
...
## 2. Конфликты и риски
...
(one section per criterion 1–8, each ending with «**Оценка:** …»)

## Открытые вопросы
...

## Сводная таблица
| # | Критерий | Оценка | Кратко |
|---|---|---|---|
| 1 | Решается существующими средствами | частично | … |
| 2 | Конфликты с существующим | незначительные | … |
| 3 | Сложность | M | … |
| 4 | Полезность и спрос | высокая | … |
| 5 | Влияние на формат файлов | нет | … |
| 6 | UX и сложность интерфейса | нейтрально | … |
| 7 | Поддержка и риски платформы | низкие | … |
| 8 | Рекомендуемый объём (MVP) | — | … |

## Вердикт
<one of: делать / делать в урезанном виде (MVP) / решить документацией или рецептом /
отложить / не делать> — and why, in two or three sentences.
```

- Keep each section short: evidence and conclusion, no padding. Links to issues and
  competitors' docs, `file:line` for code.
- If the verdict is "build", end by offering to start with `implement-feature`; do not
  start on your own.
- If the analysis found a reusable recipe or a reason the idea was rejected, offer to record
  it (`docs/user-guide/faq.md` or `docs/dev/decisions.md`).
