# tests

Full guide: `docs/dev/testing.md`.

- Unit: `loadBoard(md, opts)` from `setup/harness.ts` runs the real StateManager + parser on a
  fake Obsidian API (`setup/fakes/`). Build inputs with `board()` from `setup/fixtures.ts`.
  Extend the fakes when needed; keep them faithful to Obsidian.
- `fixtures/` and `e2e/vaults/` are byte-exact: never format them, never let an editor add
  newlines. Regenerate board fixtures with `npm run test:update-fixtures`.
- e2e: `beforeEach` → `resetWorkspace()` + `obsidianPage.resetVault()`; assert with
  `expectEventually`/`waitForFile` (rendering is async); `waitForStable()` before clicking in
  modals; failure screenshots land in `e2e/.artifacts/`.
- A bug fix starts with a failing test that reproduces it.
