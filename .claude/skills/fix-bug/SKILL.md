---
name: fix-bug
description: Workflow for fixing a bug in Kanban Starlane — reproduce with a failing unit or e2e test, fix the root cause, keep the regression test, document. Use when the product owner reports broken behaviour or a test/CI failure points to a product bug.
---

# Fix a bug

1. **Reproduce.** Get exact steps and the board markdown if the bug depends on file
   content (ask the product owner for a copy of the note with private text replaced).
   Try it in `test-vault/` with `npm run dev`.
2. **Write a failing test** that captures the bug:
   - parsing/serialization/state → `tests/unit/` with `loadBoard(md)`;
   - UI/workspace/Obsidian → `tests/e2e/specs/`.
   Confirm it fails for the reported reason.
3. **Find the root cause.** Check whether the behaviour is listed in
   `docs/dev/known-issues.md` or pinned by an existing test — if so, the fix is a deliberate
   behaviour change: update that test and the doc.
4. **Fix** in the right layer (see `docs/dev/architecture.md`). Don't bundle refactors.
5. **Verify**: the new test passes, `npm run check` green, e2e green if UI-related.
6. **Document**: `CHANGELOG.md` → *Unreleased* → *Fixed*; update `known-issues.md`.
7. **Commit** on a `fix/<name>` branch: `Fix <symptom>` + a body explaining the cause.
8. **Report** to the product owner in Russian: cause, fix, how to verify.
