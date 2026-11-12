import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import {
  cls,
  expectEventually,
  lane,
  openBoard,
  pickDay,
  readFile,
  resetWorkspace,
  settingRow,
  waitForFile,
} from '../helpers';

const BOARD = 'Boards/Date position.md';

function boardMd(settings: Record<string, unknown> = {}) {
  const json = JSON.stringify({ 'kanban-starlane': 'board', ...settings });
  return `---\n\nkanban-starlane: board\n\n---\n\n## Todo\n\n- [ ] Call Ann @{2026-10-14} @@{09:30}\n- [ ] No date\n\n\n\n\n%% kanban-starlane:settings\n\`\`\`\n${json}\n\`\`\`\n%%`;
}

async function createBoard(md: string) {
  await browser.executeObsidian(
    async ({ app }, p, content) => {
      await app.vault.create(p, content);
    },
    BOARD,
    md
  );
  await openBoard(BOARD);
  await lane(0).$(cls('item')).waitForExist();
}

const firstCard = () => lane(0).$(cls('item'));
const dateChip = () => firstCard().$(`${cls('item-footer')} [data-chip="date"]`);
const dateInText = () => firstCard().$(`${cls('item-title')} ${cls('date')}`);

async function openSettings() {
  await browser.executeObsidianCommand('kanban-starlane:open-board-settings');
  await browser.$('.modal').waitForExist();
  const select = await (await settingRow('Date position')).$('select');
  await select.scrollIntoView({ block: 'center' });
  await select.waitForStable();
  return select;
}

describe('date position', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('shows the date as a footer chip by default, with the relative date', async function () {
    await createBoard(boardMd({ 'show-relative-date': true }));

    await dateChip().waitForExist();
    expect(await dateChip().$(cls('item-metadata-date')).isExisting()).toBe(true);
    expect(await dateChip().$(cls('item-metadata-time')).getText()).toBe('09:30');
    expect(await dateChip().$(cls('item-chip-note')).isExisting()).toBe(true);
    expect(await dateInText().isExisting()).toBe(false);
    // The relative date is shown once, in the chip, not on the line below the text.
    expect(await firstCard().$$(cls('item-metadata-date-relative')).length).toBe(1);
    // Nothing to show: the card without a date gets no footer.
    expect(await lane(0).$$(cls('item-footer')).length).toBe(1);
  });

  it('changes the date from the footer chip', async function () {
    await createBoard(boardMd());

    await dateChip().$(cls('item-metadata-date')).click();
    const picked = await pickDay(20);

    // The board's date format is YYYY-MM-DD; pickDay returns YY-MM-DD.
    await waitForFile(BOARD, (md) => md.includes(`- [ ] Call Ann @{20${picked}} @@{09:30}`));
  });

  it('keeps the date in the card text, in the footer or in both', async function () {
    await createBoard(boardMd({ 'date-position': 'body', 'show-relative-date': true }));
    await dateInText().waitForExist();
    expect(await dateChip().isExisting()).toBe(false);
    expect(
      await firstCard()
        .$(`${cls('item-metadata')} ${cls('item-metadata-date-relative')}`)
        .isExisting()
    ).toBe(true);

    const select = await openSettings();
    await select.selectByAttribute('value', 'both');
    await waitForFile(BOARD, (md) => md.includes('"date-position":"both"'));
    await browser.keys('Escape');

    await dateChip().waitForExist();
    await dateInText().waitForExist();
  });

  it('shows the legacy move-dates value and replaces it when changed', async function () {
    await createBoard(boardMd({ 'move-dates': false }));
    await dateInText().waitForExist();

    const select = await openSettings();
    expect(await select.getValue()).toBe('body');
    await select.selectByAttribute('value', 'footer');

    const md = await waitForFile(BOARD, (md) => md.includes('"date-position":"footer"'));
    expect(md).not.toContain('move-dates');
    await browser.keys('Escape');
    await expectEventually(() => dateInText().isExisting(), false);
    await dateChip().waitForExist();
    expect(await readFile(BOARD)).toContain('- [ ] Call Ann @{2026-10-14} @@{09:30}');
  });

  it('resets a board back to the global date position', async function () {
    await createBoard(boardMd({ 'date-position': 'body' }));
    await dateInText().waitForExist();

    await openSettings();
    const reset = await (await settingRow('Date position')).$('.extra-setting-button');
    await reset.click();

    await waitForFile(BOARD, (md) => !md.includes('date-position'));
    await browser.keys('Escape');
    await dateChip().waitForExist();
  });
});
