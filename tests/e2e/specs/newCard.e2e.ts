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

const BOARD = 'Boards/Basic.md';

async function startNewCard(text: string) {
  await lane(0).$(cls('new-item-button')).click();
  const input = await lane(0).$(`${cls('item-form')} .cm-content`);
  await input.waitForExist();
  await input.click();
  await browser.keys(text);
}

// A neutral spot that is not part of any form: the lane title row of another lane.
async function clickOutside() {
  await lane(2).$(cls('lane-title')).click();
}

describe('new card form', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('saves the typed text as a card when clicking outside the form', async function () {
    await openBoard(BOARD);
    await startNewCard('Typed but not submitted');

    await clickOutside();

    await waitForFile(BOARD, (md) => md.includes('Typed but not submitted'));
    await expectEventually(
      () => cardTitles(0),
      ['First card', 'Second card #tag', 'Typed but not submitted']
    );
    expect((await lane(0).$$(cls('item-form'))).length).toBe(0);
  });

  it('closes an empty form without adding a card', async function () {
    await openBoard(BOARD);
    const before = await readFile(BOARD);
    await lane(0).$(cls('new-item-button')).click();
    await lane(0)
      .$(`${cls('item-form')} .cm-content`)
      .waitForExist();

    await clickOutside();

    await expectEventually(async () => (await lane(0).$$(cls('item-form'))).length, 0);
    expect(await readFile(BOARD)).toBe(before);
  });

  it('discards the text on Escape', async function () {
    await openBoard(BOARD);
    const before = await readFile(BOARD);
    await startNewCard('Do not keep me');

    await browser.keys('Escape');

    await expectEventually(async () => (await lane(0).$$(cls('item-form'))).length, 0);
    expect(await readFile(BOARD)).toBe(before);
  });
});
