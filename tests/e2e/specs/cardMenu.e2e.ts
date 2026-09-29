import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import {
  cardTitles,
  cls,
  expectEventually,
  lane,
  openBoard,
  readFile,
  resetWorkspace,
  waitForFile,
} from '../helpers';

const BOARD = 'Boards/Note from card.md';

async function createBoard(md: string) {
  await browser.executeObsidian(
    async ({ app }, p, content) => {
      await app.vault.create(p, content);
    },
    BOARD,
    md
  );
}

// By position: how the date and tags render in the title depends on settings.
async function clickFirstCardMenuItem(menuItem: string) {
  await lane(0).$(cls('item')).$(cls('item-postfix-button')).click();
  const item = await browser.$(`.menu-item-title=${menuItem}`);
  await item.waitForDisplayed();
  await item.click();
}

// Record what the plugin copies instead of reading the OS clipboard, which is shared with
// the other test windows and needs focus.
async function captureClipboard() {
  await browser.execute(() => {
    (window as any).__copied = undefined;
    navigator.clipboard.writeText = async (text: string) => {
      (window as any).__copied = text;
    };
  });
}

async function clipboardText(): Promise<string> {
  return browser.execute(() => (window as any).__copied);
}

describe('card menu', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('creates a note from the card text and keeps date and tags on the card', async function () {
    await createBoard(
      '---\n\nkanban-starlane: board\n\n---\n\n## Todo\n\n- [ ] Prepare the demo @{2026-10-15} #sales\n\n'
    );
    await openBoard(BOARD);
    await expectEventually(async () => (await cardTitles(0)).length, 1);

    await clickFirstCardMenuItem('New note from card');

    // Card history appends a block id to the edited card.
    await waitForFile(BOARD, (md) =>
      /- \[ \] \[\[Prepare the demo\]\] @\{2026-10-15\} #sales( \^\w+)?\n/.test(md)
    );
    expect(
      await browser.executeObsidian(({ app }) => !!app.vault.getFileByPath('Prepare the demo.md'))
    ).toBe(true);
    expect(await readFile(BOARD)).not.toContain('<span');
  });

  it('copies a link to the card, adding a block id when it has none', async function () {
    await createBoard('---\n\nkanban-starlane: board\n\n---\n\n## Todo\n\n- [ ] Plain card\n\n');
    await openBoard(BOARD);
    await expectEventually(async () => (await cardTitles(0)).length, 1);

    await captureClipboard();
    await clickFirstCardMenuItem('Copy link to card');

    const md = await waitForFile(BOARD, (md) => /- \[ \] Plain card \^\w{6}\n/.test(md));
    const id = md.match(/Plain card \^(\w{6})/)[1];
    await expectEventually(clipboardText, `[[Note from card#^${id}]]`);
  });

  it('copies a link to a card that already has a block id', async function () {
    await createBoard(
      '---\n\nkanban-starlane: board\n\n---\n\n## Todo\n\n- [ ] Card with id ^abc123\n\n'
    );
    await openBoard(BOARD);
    await expectEventually(async () => (await cardTitles(0)).length, 1);

    await captureClipboard();
    await clickFirstCardMenuItem('Copy link to card');

    await expectEventually(clipboardText, '[[Note from card#^abc123]]');
  });
});
