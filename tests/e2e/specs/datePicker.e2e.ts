import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import {
  cardTitles,
  cls,
  expectEventually,
  lane,
  openBoard,
  resetWorkspace,
  waitForFile,
} from '../helpers';

const BOARD = 'Boards/Basic.md';

describe('date picker', () => {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('builds the calendar and puts the picked day on the card', async function () {
    await openBoard(BOARD);
    await expectEventually(async () => (await cardTitles(0)).length, 2);

    await lane(0).$(cls('item')).$(cls('item-postfix-button')).click();
    const item = await browser.$('.menu-item-title=Add date');
    await item.waitForDisplayed();
    await item.click();

    const calendar = await browser.$('.flatpickr-calendar');
    await calendar.waitForDisplayed();
    // Seven weekday names, the month arrows and a grid of days are all built by script.
    await expectEventually(async () => (await calendar.$$('.flatpickr-weekday')).length, 7);
    expect(await calendar.$('.flatpickr-prev-month svg').isExisting()).toBe(true);
    expect(await calendar.$('.flatpickr-next-month svg').isExisting()).toBe(true);

    await calendar.$('.flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)').click();

    await waitForFile(BOARD, (md) => /- \[ \] First card .*@\{\d{4}-\d{2}-\d{2}\}/.test(md));
  });
});
