import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import { card, expectEventually, openBoard, resetWorkspace, waitForFile } from '../helpers';

const BOARD = 'Boards/Highlight.md';
const RED = 'rgba(233, 49, 71, 1)';

function boardMd(highlight: boolean) {
  const tagColor = JSON.stringify({
    tagKey: '#urgent',
    color: '',
    backgroundColor: RED,
    ...(highlight ? { highlight: true } : {}),
  });
  const settings = `{"kanban-starlane":"board","tag-colors":[${tagColor}]}`;
  return `---\n\nkanban-starlane: board\n\n---\n\n## Todo\n\n- [ ] Plain\n- [ ] Fix sync #urgent\n\n\n\n\n%% kanban-starlane:settings\n\`\`\`\n${settings}\n\`\`\`\n%%`;
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
});
