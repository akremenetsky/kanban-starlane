import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import {
  card,
  cls,
  expectEventually,
  lane,
  openBoard,
  resetWorkspace,
  settingRow,
  waitForFile,
} from '../helpers';

const BOARD = 'Boards/Sizes.md';

function boardMd(settings: Record<string, unknown> = {}) {
  const json = JSON.stringify({ 'kanban-starlane': 'board', ...settings });
  return `---\n\nkanban-starlane: board\n\n---\n\n## Todo\n\n- [ ] Parser #size/M #work\n- [ ] Docs #size/S\n- [ ] Unsized\n\n\n## Done\n\n- [x] Old task\n\n\n\n\n%% kanban-starlane:settings\n\`\`\`\n${json}\n\`\`\`\n%%`;
}

async function createBoard(settings: Record<string, unknown> = {}) {
  await browser.executeObsidian(
    async ({ app }, p, content) => {
      await app.vault.create(p, content);
    },
    BOARD,
    boardMd(settings)
  );
  await openBoard(BOARD);
}

const sizeChip = async (title: string) =>
  (await card(0, title)).$(`${cls('item-footer')} [data-chip="size"]`);
const laneTotal = (index: number) => lane(index).$(cls('lane-size-total'));

async function pickMenuItem(title: string) {
  const item = await browser.$(`.menu-item-title=${title}`);
  await item.waitForDisplayed();
  await item.click();
}

describe('card size', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('shows the size in the footer and the list total in the header', async function () {
    await createBoard();

    await expectEventually(async () => (await sizeChip('Parser #work')).getText(), 'M');
    expect(await (await sizeChip('Docs')).getText()).toBe('S');
    expect(await (await card(0, 'Unsized')).$(cls('item-footer')).isExisting()).toBe(false);

    // M = 3, S = 2.
    expect(await laneTotal(0).getText()).toBe('5');
    const tooltip = await laneTotal(0).getAttribute('aria-label');
    expect(tooltip).toContain('S × 1 = 2');
    expect(tooltip).toContain('M × 1 = 3');
    expect(await laneTotal(1).isExisting()).toBe(false);

    // A click shows the same breakdown, also where there are no tooltips (phones).
    await laneTotal(0).click();
    const breakdown = browser.$(cls('lane-size-breakdown'));
    await breakdown.waitForDisplayed();
    expect(await breakdown.getText()).toContain('M × 1 = 3');
  });

  it('changes the size from the chip', async function () {
    await createBoard();

    await (await sizeChip('Docs')).click();
    await browser.$(cls('size-picker')).waitForDisplayed();
    const option = await browser
      .$$(`${cls('size-picker')} button`)
      .find(async (b) => (await b.getText()) === 'L');
    await option.click();

    await waitForFile(BOARD, (md) => /- \[ \] Docs #size\/L( \^\w+)?\n/.test(md));
    await expectEventually(() => laneTotal(0).getText(), '8');
  });

  it('sets a size from the card menu', async function () {
    await createBoard();

    await (await card(0, 'Unsized')).click({ button: 'right' });
    await pickMenuItem('Size');
    await pickMenuItem('XL');

    await waitForFile(BOARD, (md) => /- \[ \] Unsized #size\/XL( \^\w+)?\n/.test(md));
    await expectEventually(async () => (await sizeChip('Unsized')).getText(), 'XL');
  });

  it('sets a size from the quick action panel', async function () {
    await createBoard({ 'quick-actions': ['size'] });

    const el = await card(0, 'Unsized');
    await el.moveTo();
    await el.$(`${cls('item-actions')} [data-action="size"]`).click();
    await pickMenuItem('XS');

    await waitForFile(BOARD, (md) => /- \[ \] Unsized #size\/XS( \^\w+)?\n/.test(md));
  });

  it('leaves size tags as plain tags when card sizes are off', async function () {
    await createBoard();
    await expectEventually(async () => (await sizeChip('Docs')).isExisting(), true);

    await browser.executeObsidianCommand('kanban-starlane:open-board-settings');
    await browser.$('.modal').waitForExist();
    const toggle = await (await settingRow('Card sizes')).$('.checkbox-container');
    await toggle.scrollIntoView({ block: 'center' });
    await toggle.waitForStable();
    await toggle.click();
    await waitForFile(BOARD, (md) => md.includes('"show-card-size":false'));
    await browser.keys('Escape');

    await card(0, 'Docs #size/S');
    expect(await laneTotal(0).isExisting()).toBe(false);
  });
});
