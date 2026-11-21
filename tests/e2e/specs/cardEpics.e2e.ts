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

const BOARD = 'Boards/Epics.md';

const EPICS =
  '\n\n%% kanban-starlane:epics\n```\n{\n"eeeeee":{"color":"green","cards":["aaaaaa","bbbbbb"]}\n}\n```\n%%';

function boardMd({ epics = true, settings = {} as Record<string, unknown> } = {}) {
  const json = JSON.stringify({ 'kanban-starlane': 'board', ...settings });
  return (
    `---\n\nkanban-starlane: board\n\n---\n\n## Todo\n\n` +
    `- [ ] Importer ^eeeeee\n- [ ] Parse #size/M ^aaaaaa\n- [ ] Docs #size/S\n\n\n` +
    `## Done\n\n- [x] Design #size/L ^bbbbbb\n\n\n\n` +
    (epics ? EPICS : '') +
    `\n\n%% kanban-starlane:settings\n\`\`\`\n${json}\n\`\`\`\n%%`
  );
}

async function createBoard(opts?: Parameters<typeof boardMd>[0]) {
  await browser.executeObsidian(
    async ({ app }, p, content) => {
      await app.vault.create(p, content);
    },
    BOARD,
    boardMd(opts)
  );
  await openBoard(BOARD);
}

const chipOf = async (laneIndex: number, title: string, chip: string) =>
  (await card(laneIndex, title)).$(`[data-chip="${chip}"]`);

async function pickMenuItem(title: string) {
  const item = await browser.$(`.menu-item-title=${title}`);
  await item.waitForDisplayed();
  await item.click();
}

async function pickCard(query: string) {
  const input = browser.$('.prompt-input');
  await input.waitForDisplayed();
  await input.setValue(query);
  await browser.$('.suggestion-item.is-selected').waitForDisplayed();
  await browser.keys('Enter');
}

describe('epics', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('shows the epic on its cards and the progress on the epic card', async function () {
    await createBoard();

    await expectEventually(async () => (await chipOf(0, 'Parse', 'epic')).getText(), 'Importer');
    expect(await (await chipOf(1, 'Design', 'epic')).getText()).toBe('Importer');
    expect(await (await chipOf(0, 'Docs', 'epic')).isExisting()).toBe(false);
    expect(await (await chipOf(0, 'Importer', 'epic-card')).isExisting()).toBe(true);
    // One of two done; by weight L 5 of M 3 + L 5.
    expect(await (await chipOf(0, 'Importer', 'epic-progress')).getText()).toBe('1 / 2 · 5 / 8');

    const importer = await card(0, 'Importer');
    expect(await importer.$(cls('item-epic')).isExisting()).toBe(true);
  });

  it('updates the progress when a card of the epic is done', async function () {
    await createBoard();
    await expectEventually(
      async () => (await chipOf(0, 'Importer', 'epic-progress')).getText(),
      '1 / 2 · 5 / 8'
    );

    const parse = await card(0, 'Parse');
    await parse.moveTo();
    await parse.$(`${cls('item-actions')} [data-action="done"]`).click();

    await expectEventually(
      async () => (await chipOf(0, 'Importer', 'epic-progress')).getText(),
      '2 / 2 · 8 / 8'
    );
  });

  it('makes a card an epic and adds a card to it from the card menu', async function () {
    await createBoard({ epics: false });

    await (await card(0, 'Parse')).click({ button: 'right' });
    await pickMenuItem('Epic');
    await pickMenuItem('Make epic');
    // An epic has no size: the size tag goes, and the lane total counts only Docs.
    let md = await waitForFile(BOARD, (md) => md.includes('kanban-starlane:epics'));
    expect(md).toContain('- [ ] Parse ^aaaaaa\n');
    expect(md).toContain('"aaaaaa":{"color":"blue","cards":[]}');
    await expectEventually(async () => (await lane(0)).$(cls('lane-size-total')).getText(), '2');

    await (await card(0, 'Docs')).click({ button: 'right' });
    await pickMenuItem('Epic');
    await pickMenuItem('Add to epic');
    await pickCard('Parse');

    md = await waitForFile(BOARD, (md) => /"aaaaaa":\{"color":"blue","cards":\["\w+"\]\}/.test(md));
    expect(md).toMatch(/- \[ \] Docs #size\/S \^\w+\n/);
    await expectEventually(async () => (await chipOf(0, 'Docs', 'epic')).getText(), 'Parse');
  });

  it('adds cards and changes the colour from the epic popover', async function () {
    await createBoard();

    await (await chipOf(0, 'Importer', 'epic-progress')).click();
    const popover = browser.$(cls('epic'));
    await popover.waitForDisplayed();
    await popover.$('[data-color="purple"]').click();
    await waitForFile(BOARD, (md) => md.includes('"eeeeee":{"color":"purple"'));

    await popover.$(`${cls('relations-add')}*=Add cards`).click();
    await pickCard('Docs');
    await waitForFile(BOARD, (md) =>
      /"eeeeee":\{"color":"purple","cards":\["aaaaaa","bbbbbb","\w+"\]\}/.test(md)
    );
    await expectEventually(async () => (await chipOf(0, 'Docs', 'epic')).getText(), 'Importer');
  });

  it('takes a card out of its epic from its chip', async function () {
    await createBoard();

    await (await chipOf(0, 'Parse', 'epic')).click();
    const popover = browser.$(cls('epic'));
    await popover.waitForDisplayed();
    await popover.$(`${cls('relations-add')}*=Remove from epic`).click();

    await waitForFile(BOARD, (md) => md.includes('"cards":["bbbbbb"]'));
    await expectEventually(async () => (await chipOf(0, 'Parse', 'epic')).isExisting(), false);
    expect(await (await chipOf(0, 'Importer', 'epic-progress')).getText()).toBe('1 / 1 · 5 / 5');
  });

  it('hides epics when they are switched off, keeping the file', async function () {
    await createBoard();
    await expectEventually(async () => (await chipOf(0, 'Parse', 'epic')).isExisting(), true);

    await browser.executeObsidianCommand('kanban-starlane:open-board-settings');
    await browser.$('.modal').waitForExist();
    const toggle = await (await settingRow('Epics')).$('.checkbox-container');
    await toggle.scrollIntoView({ block: 'center' });
    await toggle.waitForStable();
    await toggle.click();
    const md = await waitForFile(BOARD, (md) => md.includes('"show-card-epics":false'));
    await browser.keys('Escape');

    expect(md).toContain('kanban-starlane:epics');
    await expectEventually(async () => (await chipOf(0, 'Parse', 'epic')).isExisting(), false);
    expect(await (await chipOf(0, 'Importer', 'epic-progress')).isExisting()).toBe(false);
  });
});
