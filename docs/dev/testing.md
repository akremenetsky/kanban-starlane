# Testing

| Command | What it runs | Time |
|---|---|---|
| `npm test` | Unit tests (Vitest, jsdom, fake Obsidian API) | ~2 s |
| `npm run test:e2e` | Build + e2e tests in real Obsidian (pinned version) | ~20 s (first run downloads Obsidian) |
| `E2E_VERSIONS=all npm run test:e2e` | e2e on `minAppVersion` and the pinned version | ~40 s |
| `E2E_OBSIDIAN=latest npm run test:e2e` | e2e on the newest Obsidian release | ~20 s |
| `npm run check` | typecheck + lint + format check + unit tests | ~15 s |

Rule of thumb: **every behaviour change comes with a test that fails without it.**
Format and state logic → unit test. Anything that needs Obsidian's UI, workspace, real
markdown rendering or DOM events → e2e test.

## Unit tests (`tests/unit/`)

- `vitest.config.mts` aliases `obsidian` and `obsidian-daily-notes-interface` to fakes in
  `tests/setup/fakes/`. The fakes implement only what the code touches: extend them when a
  test hits a missing function, keep behaviour faithful (moment and YAML use real libraries).
- `tests/setup/globals.ts` polyfills Obsidian's prototype extensions (`Array#first/last/remove`,
  `el.createDiv`, `activeWindow`, ...).
- `tests/setup/harness.ts` → `loadBoard(md, options)` runs the **real** `StateManager` and
  parser against a fake `App`. Options: vault `files` (for links and linked metadata),
  `vaultConfig`, enabled `plugins`, `globalSettings`. Returns `board`, `stateManager`,
  `view` (captures saved data) and `toMarkdown()`.
  `summarize(board)` gives an id-free view for assertions.
- `tests/setup/fixtures.ts` → `board(frontmatter, body, settingsJson)` builds a board file in
  canonical layout; `readFixture()` reads `tests/fixtures/`.
- Timezone is pinned to UTC. Use `vi.useFakeTimers({ toFake: ['Date'] })` for "now".

### Fixtures

`tests/fixtures/boards/*.md` must round-trip byte-for-byte. They are excluded from prettier
and editorconfig whitespace rules — edit them only via `npm run test:update-fixtures` (which
rewrites them from the serializer output) and review the diff.

## End-to-end tests (`tests/e2e/`)

- `wdio.conf.mts` + [wdio-obsidian-service](https://github.com/jesse-r-s-hines/wdio-obsidian-service).
  Obsidian is downloaded to `.obsidian-cache/`. On Linux tests run under `xvfb-run`
  (no window); `E2E_HEADED=1` shows the window.
- **Parallel windows.** Two workers run at once (`E2E_MAX_INSTANCES`) on one xvfb screen, so
  their Obsidian windows cover each other. Old Obsidian (installer 1.5.8) marks a covered
  window hidden and stops rendering in it, and its test times out ("checking for animations
  on an inactive tab", DOM never updating); `wdio.conf.mts` passes
  `--disable-backgrounding-occluded-windows` to prevent that.
- **Obsidian versions.** Pull requests run on `minAppVersion` and on the version pinned in
  `PINNED_OBSIDIAN` (`wdio.conf.mts`), so a new Obsidian release cannot fail unrelated pull
  requests. The scheduled *E2E on latest Obsidian* workflow (`.github/workflows/e2e-latest.yml`,
  daily and on demand) runs the suite on the newest release. When it fails, fix the plugin or
  the tests on a branch, then bump `PINNED_OBSIDIAN` in the same pull request; when it is green
  on a newer release, bump the pin in a small pull request. GitHub disables scheduled workflows
  after 60 days without commits; re-enable it in the Actions tab.
- The vault is `tests/e2e/vaults/basic/`, copied fresh for each run. Call
  `resetWorkspace()` and `obsidianPage.resetVault()` in `beforeEach`.
- Helpers in `tests/e2e/helpers.ts`: `openBoard`, `laneTitles`, `cardTitles`, `lane(i)`,
  `readFile`, `waitForFile`, `expectEventually`, `cls('name')` for plugin CSS classes.
- Rendering is asynchronous: never assert on text right after an action; use
  `expectEventually` / `waitForFile` / `waitUntil`.
- Modals animate in; call `waitForStable()` before clicking inside them.
- Failures save a screenshot to `tests/e2e/.artifacts/` — open it, it usually explains
  the failure in seconds.
- Run one file: `npm run test:e2e -- --spec tests/e2e/specs/board.e2e.ts`.

Drag and drop: real pointer drags work in e2e with WebdriverIO pointer actions — see
`dragCard()` in `specs/linkedLanes.e2e.ts` (scroll the card into view and `waitForStable()`
first, then move in steps with pauses: the engine starts a drag after 5 px and throttles
moves per frame). On slow CI runners a drag is sometimes not picked up (seen on the oldest
Obsidian), so tests that check a file afterwards use `dragCardUntil()`, which retries the drag.
Only linked lanes use it so far; tree operations are unit-tested in
`tests/unit/helpers/boardTree.test.ts`.

## Manual testing

`npm run dev` builds in watch mode into `test-vault/` (see `test-vault/README.md`).
Set `OBSIDIAN_PLUGIN_DIR=/path/to/vault/.obsidian/plugins/kanban-starlane` to also install
into another vault.
