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
  await browser.$(cls('board')).waitForExist({ timeout: 10000 });
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
  await browser.waitUntil(
    async () => {
      last = await read();
      return JSON.stringify(last) === JSON.stringify(expected);
    },
    {
      timeout,
      timeoutMsg: `expected ${JSON.stringify(expected)}, last value ${JSON.stringify(last)}`,
    }
  );
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
