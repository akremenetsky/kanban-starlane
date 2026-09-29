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
});
