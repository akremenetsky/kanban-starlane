import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import { card, cls, expectEventually, lane, openBoard, resetWorkspace } from '../helpers';

const BOARD = 'Boards/Zones.md';

const NOTE = 'Notes/Zones owner.md';
// A linked note's frontmatter key listed in metadata-keys gives the card a metadata table.
const settings = JSON.stringify({
  'kanban-starlane': 'board',
  'metadata-keys': [
    { metadataKey: 'owner', label: 'Owner', shouldHideLabel: false, containsMarkdown: false },
  ],
});
const md = `---\n\nkanban-starlane: board\n\n---\n\n## Todo\n\n- [ ] Plain\n- [ ] [[Zones owner]]\n\n\n\n\n%% kanban-starlane:settings\n\`\`\`\n${settings}\n\`\`\`\n%%`;

/** Class names of the content wrapper's children, without the prefix. */
async function parts(index: number) {
  await card(0, 'Plain');
  const wrapper = await lane(0).$$(cls('item'))[index].$(cls('item-content-wrapper'));
  return browser.execute(
    (el) =>
      [...el.children]
        .map((child) => child.className.replace('kanban-starlane__', ''))
        // The quick action panel floats over the card; it is not part of the layout.
        .filter((name) => name !== 'item-actions'),
    wrapper
  );
}

async function titleBorder(index: number) {
  const wrapper = await lane(0).$$(cls('item'))[index].$(cls('item-title-wrapper'));
  return (await wrapper.getCSSProperty('border-bottom-width')).value;
}

describe('card zones', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
    await browser.executeObsidian(
      async ({ app }, notePath, boardPath, content) => {
        await app.vault.create(notePath, '---\nowner: Ann\n---\n');
        await app.vault.create(boardPath, content);
      },
      NOTE,
      BOARD,
      md
    );
  });

  // No feature registers chips yet: cards must look exactly as before the zones existed.
  it('adds no header or footer to cards without chips', async function () {
    await openBoard(BOARD);

    expect(await parts(0)).toEqual(['item-title-wrapper']);
    expect(await titleBorder(0)).toBe('0px');

    await expectEventually(() => parts(1), ['item-title-wrapper', 'item-metadata-wrapper']);
    expect(await titleBorder(1)).toBe('1px');

    expect(await browser.$$(`${cls('item-header')}, ${cls('item-footer')}`).length).toBe(0);
  });
});
