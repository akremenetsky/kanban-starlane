import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import { card, cls, expectEventually, openBoard, resetWorkspace, waitForFile } from '../helpers';

const BOARD = 'Boards/Highlight.md';
const RED = 'rgba(233, 49, 71, 1)';

function plainBoardMd(cards: string) {
  return `---\n\nkanban-starlane: board\n\n---\n\n## Todo\n\n${cards}\n\n\n\n\n%% kanban-starlane:settings\n\`\`\`\n{"kanban-starlane":"board"}\n\`\`\`\n%%`;
}

function boardMd(highlight: boolean, cards = '- [ ] Plain\n- [ ] Fix sync #urgent') {
  const tagColor = JSON.stringify({
    tagKey: '#urgent',
    color: '',
    backgroundColor: RED,
    ...(highlight ? { highlight: true } : {}),
  });
  const settings = `{"kanban-starlane":"board","tag-colors":[${tagColor}]}`;
  return `---\n\nkanban-starlane: board\n\n---\n\n## Todo\n\n${cards}\n\n\n\n\n%% kanban-starlane:settings\n\`\`\`\n${settings}\n\`\`\`\n%%`;
}

async function createBoard(md: string) {
  await browser.executeObsidian(
    async ({ app }, p, content) => {
      await app.vault.create(p, content);
    },
    BOARD,
    md
  );
}

/** Opens the card's Mark as submenu and picks `tag`; returns whether it was checked. */
async function markAs(title: string, tag: string) {
  await (await card(0, title)).$(cls('item-postfix-button')).click();
  const parent = await browser.$('.menu-item-title=Mark as');
  await parent.waitForDisplayed();
  await parent.click();
  const item = await browser.$(`.menu-item-title=${tag}`);
  await item.waitForDisplayed();
  const checked = (await item.parentElement().getAttribute('class')).includes('mod-checked');
  await item.click();
  return checked;
}

async function isHighlighted(title: string) {
  const el = await card(0, title);
  return (await el.getAttribute('class')).includes('kanban-starlane__item-highlighted');
}

describe('card highlight by tag', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('marks cards with a highlighting tag with a stripe of its color', async function () {
    await createBoard(boardMd(true));
    await openBoard(BOARD);

    await expectEventually(() => isHighlighted('Fix sync #urgent'), true);
    expect(await isHighlighted('Plain')).toBe(false);

    const stripe = await (await card(0, 'Fix sync #urgent')).getCSSProperty('border-left-color');
    expect(stripe.parsed.hex).toBe('#e93147');
  });

  it('switches the highlight from the tag colors setting', async function () {
    await createBoard(boardMd(false));
    await openBoard(BOARD);
    await card(0, 'Fix sync #urgent');
    expect(await isHighlighted('Fix sync #urgent')).toBe(false);

    await browser.executeObsidianCommand('kanban-starlane:open-board-settings');
    await browser.$('.modal').waitForExist();
    const toggle = await browser.$('.modal .checkbox-container[aria-label="Highlight card"]');
    await toggle.scrollIntoView({ block: 'center' });
    await toggle.waitForStable();
    await toggle.click();
    await waitForFile(BOARD, (md) => md.includes('"highlight":true'));
    await expectEventually(() => isHighlighted('Fix sync #urgent'), true);

    await toggle.click();
    await waitForFile(BOARD, (md) => md.includes('"tag-colors"') && !md.includes('highlight'));
    await expectEventually(() => isHighlighted('Fix sync #urgent'), false);
  });

  it('does not add the ready-made tags to a vault that already had boards', async function () {
    // The test vault has boards and no saved plugin data: an update, not a new install.
    await createBoard(plainBoardMd('- [ ] Fix sync #urgent'));
    await openBoard(BOARD);
    await card(0, 'Fix sync #urgent');

    const tagColors = await browser.executeObsidian(async ({ app }) => {
      const plugin = (app as any).plugins.plugins['kanban-starlane'];
      await plugin.initialSettingsSaved;
      return plugin.settings['tag-colors'] ?? null;
    });
    expect(tagColors).toBeNull();
    expect(await isHighlighted('Fix sync #urgent')).toBe(false);
  });

  it('gives a vault without boards the ready-made tags', async function () {
    const tags = await browser.executeObsidian(async ({ app }) => {
      for (const file of app.vault.getMarkdownFiles()) await app.vault.delete(file);
      const plugin = (app as any).plugins.plugins['kanban-starlane'];
      plugin.settings = {};
      await plugin.saveInitialSettings();
      const result = (plugin.settings['tag-colors'] ?? []).map(
        (c: { tagKey: string; highlight?: boolean }) => `${c.tagKey}:${c.highlight}`
      );
      await plugin.updateSettings({});
      return result;
    });

    expect(tags).toEqual(['#urgent:true', '#important:true']);
  });

  it('marks and unmarks a card from the card menu', async function () {
    // Card history gives the card a block id, so it may end with ` ^id`.
    await createBoard(boardMd(true, '- [ ] Plain'));
    await openBoard(BOARD);

    expect(await markAs('Plain', '#urgent')).toBe(false);
    await waitForFile(BOARD, (md) => /- \[ \] Plain #urgent( \^\w+)?\n/.test(md));
    await expectEventually(() => isHighlighted('Plain #urgent'), true);

    expect(await markAs('Plain #urgent', '#urgent')).toBe(true);
    await waitForFile(BOARD, (md) => /- \[ \] Plain( \^\w+)?\n/.test(md));
    await expectEventually(() => isHighlighted('Plain'), false);
  });
});
