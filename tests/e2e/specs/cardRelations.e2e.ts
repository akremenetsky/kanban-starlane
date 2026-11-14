import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import {
  card,
  cls,
  expectEventually,
  openBoard,
  resetWorkspace,
  settingRow,
  waitForFile,
} from '../helpers';

const BOARD = 'Boards/Relations.md';

const RELATIONS =
  '\n\n%% kanban-starlane:relations\n```\n{\n"aaaaaa":[{"type":"blocks","card":"bbbbbb"}]\n}\n```\n%%';

function boardMd({ relations = true, settings = {} as Record<string, unknown> } = {}) {
  const json = JSON.stringify({ 'kanban-starlane': 'board', ...settings });
  return (
    `---\n\nkanban-starlane: board\n\n---\n\n## Todo\n\n` +
    `- [ ] Design ^aaaaaa\n- [ ] Build ^bbbbbb\n- [ ] Docs\n\n\n## Done\n\n- [x] Old task\n\n\n\n` +
    (relations ? RELATIONS : '') +
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

const chipOf = async (title: string, chip: string) =>
  (await card(0, title)).$(`[data-chip="${chip}"]`);

async function pickMenuItem(title: string) {
  const item = await browser.$(`.menu-item-title=${title}`);
  await item.waitForDisplayed();
  await item.click();
}

async function openPopover(title: string, chip: string) {
  await (await chipOf(title, chip)).click();
  const popover = browser.$(cls('relations'));
  await popover.waitForDisplayed();
  return popover;
}

describe('card relations', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('marks a blocked card and lists relations on both cards', async function () {
    await createBoard();

    await expectEventually(async () => (await chipOf('Build', 'blocked')).getText(), 'Blocked');
    expect(await (await chipOf('Build', 'relations')).getText()).toBe('1');
    expect(await (await chipOf('Design', 'relations')).getText()).toBe('1');
    expect(await (await chipOf('Design', 'blocked')).isExisting()).toBe(false);
    expect(await (await card(0, 'Docs')).$(cls('item-footer')).isExisting()).toBe(false);

    const popover = await openPopover('Design', 'relations');
    expect(await popover.getText()).toContain('Blocks');
    expect(await popover.getText()).toContain('Build');
  });

  it('scrolls to the related card on click', async function () {
    await createBoard();

    const popover = await openPopover('Build', 'blocked');
    await popover.$(`${cls('relation-card')}=Design`).click();

    const design = await card(0, 'Design');
    await expectEventually(
      async () => (await design.getAttribute('class')).includes('item-flash'),
      true
    );
  });

  it('unblocks when the blocking card is done', async function () {
    await createBoard();
    await expectEventually(async () => (await chipOf('Build', 'blocked')).isExisting(), true);

    const design = await card(0, 'Design');
    await design.moveTo();
    await design.$(`${cls('item-actions')} [data-action="done"]`).click();

    await expectEventually(async () => (await chipOf('Build', 'blocked')).isExisting(), false);
    expect(await (await chipOf('Build', 'relations')).getText()).toBe('1');
  });

  it('adds a relation from the card menu', async function () {
    await createBoard({ relations: false });

    await (await card(0, 'Docs')).click({ button: 'right' });
    await pickMenuItem('Add relation');
    await pickMenuItem('Blocked by');

    const input = browser.$('.prompt-input');
    await input.waitForDisplayed();
    await input.setValue('Build');
    await browser.$('.suggestion-item.is-selected').waitForDisplayed();
    await browser.keys('Enter');

    const md = await waitForFile(BOARD, (md) => md.includes('kanban-starlane:relations'));
    const docsId = /- \[ \] Docs \^(\w+)\n/.exec(md)?.[1];
    expect(docsId).toBeTruthy();
    expect(md).toContain(`"bbbbbb":[{"type":"blocks","card":"${docsId}"}]`);
    await expectEventually(async () => (await chipOf('Docs', 'blocked')).isExisting(), true);
  });

  it('removes a relation from the popover', async function () {
    await createBoard();

    const popover = await openPopover('Design', 'relations');
    await popover.$(cls('relation-remove')).click();

    await waitForFile(BOARD, (md) => !md.includes('kanban-starlane:relations'));
    await expectEventually(async () => (await chipOf('Build', 'blocked')).isExisting(), false);
  });

  it('adds a relation from the quick action panel', async function () {
    await createBoard({ relations: false, settings: { 'quick-actions': ['relate'] } });

    const el = await card(0, 'Design');
    await el.moveTo();
    await el.$(`${cls('item-actions')} [data-action="relate"]`).click();
    await pickMenuItem('Relates to');
    const input = browser.$('.prompt-input');
    await input.waitForDisplayed();
    await input.setValue('Docs');
    await browser.$('.suggestion-item.is-selected').waitForDisplayed();
    await browser.keys('Enter');

    await waitForFile(BOARD, (md) => /"aaaaaa":\[\{"type":"relates-to","card":"\w+"\}\]/.test(md));
  });

  it('hides relations when they are switched off, keeping the file', async function () {
    await createBoard();
    await expectEventually(async () => (await chipOf('Build', 'blocked')).isExisting(), true);

    await browser.executeObsidianCommand('kanban-starlane:open-board-settings');
    await browser.$('.modal').waitForExist();
    const toggle = await (await settingRow('Card relations')).$('.checkbox-container');
    await toggle.scrollIntoView({ block: 'center' });
    await toggle.waitForStable();
    await toggle.click();
    const md = await waitForFile(BOARD, (md) => md.includes('"show-card-relations":false'));
    await browser.keys('Escape');

    expect(md).toContain('kanban-starlane:relations');
    await expectEventually(async () => (await chipOf('Build', 'blocked')).isExisting(), false);
    expect(await (await chipOf('Build', 'relations')).isExisting()).toBe(false);
  });
});
