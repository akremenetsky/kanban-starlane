---
name: implement-feature
description: End-to-end workflow for implementing a feature or behaviour change requested by the product owner in Kanban Starlane — clarify, branch, test-first, implement, verify in unit/e2e/test vault, document, commit, report. Use for any new functionality or UX change.
---

# Implement a feature

## 1. Understand the request
- Restate the feature in one or two sentences. Identify what users will see and whether
  anything new is written into board files.
- Ask the product owner (in Russian) only about **product** decisions that change user-visible
  behaviour or the file format and cannot be inferred. Batch questions; offer a recommended
  option. Decide technical questions yourself.
- Check `docs/dev/known-issues.md` and `CHANGELOG.md` for related context.

## 2. Plan
- Locate the code with `AGENTS.md` → "Where things go" and `docs/dev/architecture.md`.
- If the board format changes, also follow `change-board-format`. New settings: `add-setting`.
- Prefer small, additive changes; keep existing command ids, CSS classes and setting keys.

## 3. Branch
`git switch -c feature/<short-name>` from an up-to-date `main` (don't push).

## 4. Tests first
- Format/state logic → unit tests in `tests/unit/` using `loadBoard()` and `board()`.
- UI/Obsidian behaviour → e2e spec in `tests/e2e/specs/` (see `e2e-testing`).
- Watch them fail for the right reason.

## 5. Implement
- Follow `AGENTS.md` code conventions (no global `app`, `t()` for text + `ru.ts`, `c()` for
  classes, immutable board updates via `boardModifiers`).
- Keep commits small and focused (tests + code for one step per commit is fine).

## 6. Verify
- `npm run check` (must be green).
- `npm run test:e2e` if UI, view, plugin, settings UI, DnD or styles changed.
- Add or update a sample in `test-vault/` that shows the feature, so the product owner can
  try it (`npm run dev`, open `test-vault` in Obsidian).

## 7. Document
- `CHANGELOG.md` → *Unreleased* (user-facing wording).
- `docs/dev/board-format.md` / `architecture.md` / `decisions.md` when relevant.
- `docs/user-guide/` if there is a user-facing page to update.

## 8. Review and commit
- Review your own diff (Claude Code: run the `reviewer` subagent). Fix findings.
- Final `npm run check`, commit with a message explaining *what and why*.

## 9. Report (in Russian)
What was done, how to try it in the test vault (exact note and steps), decisions you took,
open questions, and anything you noticed but did not change.
