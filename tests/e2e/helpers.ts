/**
 * Shared e2e helpers. Selectors use the plugin's CSS classes (`kanban-starlane__*`).
 */
import { browser } from '@wdio/globals';

export const cls = (name: string) => `.kanban-starlane__${name}`;

/** Open a vault file in the active leaf and wait for the board to render. */
export async function openBoard(path: string) {
  // Open by file, not by link text: a file created a moment ago may not be in the metadata
  // cache yet, and openLinkText then silently opens nothing.
  await browser.waitUntil(
    () => browser.executeObsidian(({ app }, p) => !!app.vault.getFileByPath(p), path),
    { timeoutMsg: `${path} is not in the vault` }
  );
  await browser.executeObsidian(async ({ app }, p) => {
    await app.workspace.getLeaf(false).openFile(app.vault.getFileByPath(p));
  }, path);
  try {
    await browser.$(cls('board')).waitForExist({ timeout: 10000 });
  } catch (e) {
    // Say what opened instead, so a rare CI failure can be told apart from a slow render.
    const state = await browser.executeObsidian(({ app }) => {
      const view = app.workspace.getLeaf(false)?.view;
      return JSON.stringify({ type: view?.getViewType(), state: view?.getState() });
    });
    throw new Error(`${path} did not open as a board: ${state}`, { cause: e });
  }
}

export async function openFile(path: string) {
  await browser.executeObsidian(async ({ app }, p) => {
    await app.workspace.openLinkText(p, '', false);
  }, path);
}

export async function activeViewType(): Promise<string | undefined> {
  return browser.executeObsidian(({ app }) => app.workspace.getLeaf(false)?.view.getViewType());
}

export async function laneTitles(): Promise<string[]> {
  return browser.$$(cls('lane-title-text')).map((el) => el.getText());
}

export function lane(index: number) {
  return browser.$$(cls('lane'))[index];
}

export async function cardTitles(laneIndex: number): Promise<string[]> {
  return lane(laneIndex)
    .$$(cls('item-title'))
    .map(async (el) => (await el.getText()).trim());
}

/** Close modals and every tab so each test starts from an empty workspace. */
export async function resetWorkspace() {
  for (let i = 0; i < 5 && (await browser.$$('.modal-container').length) > 0; i++) {
    await browser.keys('Escape');
  }
  await browser.executeObsidian(({ app }) => {
    app.workspace.iterateRootLeaves((leaf) => leaf.detach());
  });
}

/** Current file content on disk (via the vault adapter). */
export async function readFile(path: string): Promise<string> {
  return browser.executeObsidian(({ app }, p) => app.vault.adapter.read(p), path);
}

/** Wait until the file on disk satisfies `predicate` (saves are debounced). */
export async function waitForFile(
  path: string,
  predicate: (md: string) => boolean,
  timeout = 5000
) {
  let last = '';
  try {
    await browser.waitUntil(
      async () => {
        last = await readFile(path);
        return predicate(last);
      },
      { timeout }
    );
  } catch {
    // waitUntil's own message is built before the wait, so it cannot show the content.
    throw new Error(`file ${path} never matched; last content:\n${last}`);
  }
  return last;
}

/**
 * Poll `read` until it deep-equals `expected`. Card and lane titles are rendered
 * asynchronously by Obsidian's markdown renderer, so never assert on them directly.
 */
export async function expectEventually<T>(read: () => Promise<T>, expected: T, timeout = 5000) {
  let last: T | undefined;
  try {
    await browser.waitUntil(
      async () => {
        last = await read();
        return JSON.stringify(last) === JSON.stringify(expected);
      },
      { timeout }
    );
  } catch {
    // waitUntil's own message is built before the wait, so it cannot show the last value.
    throw new Error(`expected ${JSON.stringify(expected)}, last value ${JSON.stringify(last)}`);
  }
}

/** The card of a lane with this title; waits for it, as titles render asynchronously. */
export async function card(laneIndex: number, title: string) {
  let found: WebdriverIO.Element | undefined;
  await browser.waitUntil(
    async () => {
      found = await lane(laneIndex)
        .$$(cls('item'))
        .find(async (el) => (await el.$(cls('item-title')).getText()).trim() === title);
      return !!found;
    },
    { timeoutMsg: `no card "${title}" in lane ${laneIndex}` }
  );
  return found!;
}

/** Drag a card with real pointer events and drop it on `target` (above or below its middle). */
export async function dragCard(
  source: WebdriverIO.Element,
  target: WebdriverIO.Element,
  where: 'above' | 'below'
) {
  // Cards render asynchronously; pressing on a card that is still being replaced does nothing.
  await source.scrollIntoView({ block: 'center', inline: 'center' });
  await source.waitForStable();
  await target.waitForStable();
  const { height } = await target.getSize();
  const dy = Math.round(height / 4) * (where === 'above' ? -1 : 1);

  await browser
    .action('pointer', { parameters: { pointerType: 'mouse' } })
    .move({ origin: source })
    .down({ button: 0 })
    .pause(50)
    .move({ origin: source, x: 0, y: 12, duration: 100 })
    .pause(100)
    .move({ origin: target, x: 0, y: dy, duration: 400 })
    .pause(400)
    .up({ button: 0 })
    .perform();
}

/**
 * Drag a card until `settled` holds. A drag that starts while Obsidian is still busy (CI runners
 * are slow, mostly on the oldest Obsidian) is sometimes not picked up at all, so retry a few
 * times; the card and the target are looked up again for every attempt.
 */
export async function dragCardUntil(
  source: () => Promise<WebdriverIO.Element>,
  target: () => Promise<WebdriverIO.Element>,
  where: 'above' | 'below',
  settled: () => Promise<boolean>,
  attempts = 3
) {
  for (let attempt = 1; ; attempt++) {
    await dragCard(await source(), await target(), where);
    try {
      await browser.waitUntil(settled, { timeout: 3000 });
      return;
    } catch (error) {
      if (attempt >= attempts) throw error;
    }
  }
}

/**
 * The first element matching `selector` that has a layout box; hidden leftovers of earlier
 * popovers are skipped. Checked in the page: WebdriverIO's `isDisplayed` sometimes reports a
 * calendar or suggestion on screen as hidden.
 */
export async function visible(selector: string) {
  let index = -1;
  await browser.waitUntil(
    async () => {
      index = await browser.execute(
        (sel) =>
          [...document.querySelectorAll(sel)].findIndex(
            (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
          ),
        selector
      );
      return index >= 0;
    },
    { timeoutMsg: `nothing visible matches ${selector}` }
  );
  return browser.$$(selector)[index];
}

/**
 * Clicks day `day` of the month the open calendar shows and returns it as `YY-MM-DD`. The
 * calendar opens on the card's date, so "today" is not always on screen.
 */
export async function pickDay(day = 20): Promise<string> {
  const calendar = await visible('.flatpickr-calendar');
  const cell = await calendar
    .$$('.flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)')
    .find(async (el) => (await el.getText()).trim() === String(day));
  const picked = await browser.executeObsidian(
    ({ obsidian }, el) =>
      obsidian.moment((el as unknown as { dateObj: Date }).dateObj).format('YY-MM-DD'),
    cell
  );
  await cell.click();
  return picked;
}

/** The settings row (in the open modal) whose name is `name`. */
export async function settingRow(name: string) {
  const rows = await browser.$$('.modal .setting-item').getElements();
  for (const row of rows) {
    const label = await row.$('.setting-item-name');
    if ((await label.isExisting()) && (await label.getText()) === name) return row;
  }
  throw new Error(`no setting named "${name}"`);
}
