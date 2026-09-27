---
name: e2e-testing
description: How to write, run and debug Kanban Starlane end-to-end tests in real Obsidian with WebdriverIO and wdio-obsidian-service (helpers, async rendering, modals, screenshots, versions). Use when adding UI behaviour or when an e2e test fails.
---

# E2E testing

## Run
- `npm run test:e2e` — builds `dist/`, runs all specs in the latest Obsidian (headless via xvfb).
- `npm run test:e2e -- --spec tests/e2e/specs/<file>.e2e.ts` — one spec.
- `E2E_VERSIONS=all` — also the minimum supported Obsidian. `E2E_HEADED=1` — show the window.
- First run downloads Obsidian into `.obsidian-cache/` (git-ignored).

## Write
- Specs: `tests/e2e/specs/<area>.e2e.ts`, Mocha BDD. Vault: `tests/e2e/vaults/basic/`
  (add notes there; keep them canonical — they are excluded from prettier).
- Start each test clean:
  ```ts
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });
  ```
- Helpers (`tests/e2e/helpers.ts`): `openBoard(path)`, `openFile(path)`, `activeViewType()`,
  `laneTitles()`, `cardTitles(i)`, `lane(i)`, `cls('item')`, `readFile(path)`,
  `waitForFile(path, predicate)`, `expectEventually(read, expected)`.
- Run plugin commands with `browser.executeObsidianCommand('kanban-starlane:<id>')`; run code
  inside Obsidian with `browser.executeObsidian(({ app }, arg) => ..., arg)`.
- Assert on files for persistence (`waitForFile`) and on DOM for UI.

## Pitfalls
- Rendering is async → never `expect(await cardTitles(0))` right after an action; use
  `expectEventually`.
- Modals animate → `await el.waitForStable()` before `click()`; scroll into view first.
- Leftover modals/tabs from a previous test cause "element click intercepted" → make sure
  `resetWorkspace()` is in `beforeEach`.
- `$$()` returns a chainable array: use `.map(...)`/`.getElements()`, not `Promise.all(els.map)`.
- WebdriverIO text selectors (`.cls=Text`) can't be combined with descendant selectors; filter
  rows in code (see `settingRow()` in `settings.e2e.ts`).

## Debug
1. Open the screenshot in `tests/e2e/.artifacts/<suite>-<test>.png`.
2. Re-run the single spec with `E2E_HEADED=1`.
3. Check `tests/e2e/.artifacts/wdio*.log` for console errors from the plugin.
