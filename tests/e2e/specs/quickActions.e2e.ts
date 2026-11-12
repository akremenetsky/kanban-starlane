import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import {
  card,
  cardTitles,
  cls,
  expectEventually,
  lane,
  openBoard,
  pickDay,
  resetWorkspace,
  settingRow,
  waitForFile,
} from '../helpers';

const BOARD = 'Boards/Basic.md';

/** The panel's buttons on a card, by `data-action` (the menu button as `more`). */
async function panelActions(laneIndex: number, title: string) {
  const el = await card(laneIndex, title);
  return el
    .$$(`${cls('item-actions')} > *`)
    .map(async (b) => (await b.getAttribute('data-action')) ?? 'more');
}

async function clickAction(laneIndex: number, title: string, action: string) {
  const el = await card(laneIndex, title);
  await el.moveTo();
  await el.$(`${cls('item-actions')} [data-action="${action}"]`).click();
}

describe('quick actions', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('shows the default actions and the card menu on hover, not in the title row', async function () {
    await openBoard(BOARD);
    const el = await card(0, 'First card');
    const panel = el.$(cls('item-actions'));
    expect(await panel.getCSSProperty('opacity')).toMatchObject({ value: 0 });

    await el.moveTo();
    await expectEventually(async () => (await panel.getCSSProperty('opacity')).value, 1);
    expect(await panelActions(0, 'First card')).toEqual(['done', 'date', 'next-lane', 'more']);
    expect(
      await el.$(`${cls('item-title-wrapper')} ${cls('item-postfix-button')}`).isExisting()
    ).toBe(false);
  });

  it('marks a card as done and moves it to the next list', async function () {
    await openBoard(BOARD);

    await clickAction(0, 'First card', 'done');
    await waitForFile(BOARD, (md) => md.includes('- [x] First card'));

    await clickAction(0, 'Second card #tag', 'next-lane');
    await waitForFile(BOARD, (md) =>
      /## Doing \(2\)\n\n- \[ \] Second card #tag( \^\w+)?\n/.test(md)
    );
    await expectEventually(async () => (await cardTitles(1))[0], 'Second card #tag');
  });

  it('cannot move a card of the last list further, until a list is added', async function () {
    await openBoard(BOARD);
    const nextLane = async () => (await card(2, 'Finished card')).$('[data-action="next-lane"]');
    expect(await (await nextLane()).getAttribute('disabled')).not.toBeNull();

    await browser.$('.view-action[aria-label="Add a list"]').click();
    const input = await browser.$(
      `${cls('lane-input-wrapper')} > ${cls('lane-input')} .cm-content`
    );
    await input.waitForExist();
    await input.click();
    await browser.keys('Later');
    await browser.keys('Enter');
    await waitForFile(BOARD, (md) => md.includes('## Later'));

    // Cards are memoized; the button must still follow the number of lists.
    await expectEventually(async () => (await nextLane()).getAttribute('disabled'), null);
  });

  it('sets the date from the panel', async function () {
    await openBoard(BOARD);

    await clickAction(0, 'First card', 'date');
    const picked = await pickDay(20);

    await waitForFile(BOARD, (md) => md.includes(`- [ ] First card @{20${picked}}`));
  });

  it('cancels editing with the menu button while the panel is hidden', async function () {
    await openBoard(BOARD);
    const el = await card(0, 'First card');
    await el.$(cls('item-title')).doubleClick();
    await lane(0)
      .$(`${cls('item-input')} .cm-content`)
      .waitForExist();

    expect(await el.$(cls('item-actions')).isExisting()).toBe(false);
    await el.$(`${cls('item-postfix-button')}[aria-label="Cancel"]`).click();
    await lane(0).$(cls('item-input')).waitForExist({ reverse: true });
  });

  it('follows the board settings, up to five actions', async function () {
    await openBoard(BOARD);
    await browser.executeObsidianCommand('kanban-starlane:open-board-settings');
    await browser.$('.modal').waitForExist();

    const toggle = async (name: string) => {
      const box = await (await settingRow(name)).$('.checkbox-container');
      await box.scrollIntoView({ block: 'center' });
      await box.waitForStable();
      return box;
    };

    await (await toggle('Mark as done')).click();
    await (await toggle('Archive card')).click();
    await (await toggle('Duplicate card')).click();
    await (await toggle('Move to list')).click();
    await waitForFile(BOARD, (md) =>
      md.includes('"quick-actions":["date","next-lane","move-to-lane","archive","duplicate"]')
    );
    // Five are on: the rest cannot be switched on.
    expect(await (await toggle('Open or create note')).getAttribute('class')).toContain(
      'is-disabled'
    );
    await browser.keys('Escape');

    await expectEventually(
      () => panelActions(0, 'First card'),
      ['date', 'next-lane', 'move-to-lane', 'archive', 'duplicate', 'more']
    );
  });

  it('resets a board back to the global quick actions', async function () {
    await browser.executeObsidian(async ({ app }) => {
      const file = app.vault.getFileByPath('Boards/Basic.md');
      await app.vault.process(file, (md) =>
        md.replace('"show-checkboxes":true', '"show-checkboxes":true,"quick-actions":["archive"]')
      );
    });
    await openBoard(BOARD);
    await expectEventually(() => panelActions(0, 'First card'), ['archive', 'more']);

    await browser.executeObsidianCommand('kanban-starlane:open-board-settings');
    await browser.$('.modal').waitForExist();
    const intro = await browser
      .$$('.modal .setting-item')
      .find(async (row) =>
        (await row.$('.setting-item-description').getText()).startsWith('Buttons shown on a card')
      );
    const reset = await intro.$('.extra-setting-button');
    await reset.scrollIntoView({ block: 'center' });
    await reset.waitForStable();
    await reset.click();

    await waitForFile(BOARD, (md) => !md.includes('quick-actions'));
    await browser.keys('Escape');
    await expectEventually(
      () => panelActions(0, 'First card'),
      ['done', 'date', 'next-lane', 'more']
    );
  });
});
