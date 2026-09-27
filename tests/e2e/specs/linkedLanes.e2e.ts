/**
 * Linked lanes: Boards/Linked.md (D1) shows lanes A and B of Boards/Work.md (D2).
 */
import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import {
  card,
  cardTitles,
  cls,
  dragCard,
  expectEventually,
  lane,
  openBoard,
  readFile,
  resetWorkspace,
  waitForFile,
} from '../helpers';

const D1 = 'Boards/Linked.md';
const D2 = 'Boards/Work.md';

/** Pick an option in the link modal (selectByAttribute does not fire `change` there). */
async function chooseOption(value: string) {
  return browser.execute(
    (sel, v) => {
      const select = Array.from(document.querySelectorAll<HTMLSelectElement>(`${sel} select`)).find(
        (s) => Array.from(s.options).some((o) => o.value === v) && s.options.length > 1
      );
      if (!select) return false;
      select.value = v;
      select.dispatchEvent(new Event('change'));
      return true;
    },
    cls('link-lanes-modal'),
    value
  );
}

describe('linked lanes', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('shows the cards of the linked board with its color', async function () {
    await openBoard(D1);

    await expectEventually(() => cardTitles(0), ['D1_A_0', 'D1_A_1', 'D2_A_0', 'D2_A_1']);
    const linked = await lane(0).$$(`${cls('item')}${cls('item-linked')}`);
    expect(linked.length).toBe(2);
    expect(await linked[0].getCSSProperty('border-bottom-color')).toMatchObject({
      parsed: { hex: '#e5484d' },
    });
  });

  it('writes changes of a linked card to its own board', async function () {
    await openBoard(D1);
    await expectEventually(async () => (await cardTitles(0)).length, 4);

    await (await card(0, 'D2_A_0')).$('input[type=checkbox]').click();

    await waitForFile(D2, (md) => md.includes('- [x] D2_A_0'));
    expect(await readFile(D1)).not.toContain('D2_A_0');
  });

  it('moves a linked card to another linked lane in its own board', async function () {
    await openBoard(D1);
    await expectEventually(async () => (await cardTitles(0)).length, 4);

    await dragCard(await card(0, 'D2_A_1'), await lane(1).$(cls('lane-items')), 'above');

    await waitForFile(D2, (md) => /## B\n\n- \[ \] D2_A_1/.test(md));
    await expectEventually(() => cardTitles(1), ['D2_A_1']);
  });

  it('updates the linked board when it is open next to this one', async function () {
    await openBoard(D1);
    await expectEventually(async () => (await cardTitles(0)).length, 4);
    await browser.executeObsidian(async ({ app }, p) => {
      await app.workspace.getLeaf('split').openFile(app.vault.getFileByPath(p));
    }, D2);
    // Lanes of both views: D1 A, B, C then D2 A, B, C.
    await expectEventually(() => cardTitles(3), ['D2_A_0', 'D2_A_1']);

    await (await card(0, 'D2_A_0')).$('input[type=checkbox]').click();

    await expectEventually(() => lane(3).$('input[type=checkbox]').isSelected(), true);
    await waitForFile(D2, (md) => md.includes('- [x] D2_A_0'));
  });

  it('keeps a free order and writes the linked board only when its order changes', async function () {
    await openBoard(D1);
    await expectEventually(async () => (await cardTitles(0)).length, 4);
    const before = await readFile(D2);

    // Own cards only: D1_A_1, D1_A_0, D2_A_0, D2_A_1 — D2 stays as it is.
    await dragCard(await card(0, 'D1_A_1'), await card(0, 'D1_A_0'), 'above');
    await waitForFile(D1, (md) => md.includes('- [ ] D1_A_1\n- [ ] D1_A_0'));
    expect(await readFile(D2)).toBe(before);

    // D2_A_1 to the top: D2 now has D2_A_1 before D2_A_0.
    await dragCard(await card(0, 'D2_A_1'), await card(0, 'D1_A_1'), 'above');
    await waitForFile(D2, (md) => /- \[ \] D2_A_1 \^\w+\n- \[ \] D2_A_0/.test(md));
    await expectEventually(() => cardTitles(0), ['D2_A_1', 'D1_A_1', 'D1_A_0', 'D2_A_0']);

    // The order survives reopening the board. Wait for the (debounced) save first: closing a
    // board and reopening it at once can read a half-written file (see known-issues.md).
    await waitForFile(D1, (md) => /"order":\["Boards\/Work\.md#\^\w+","self","self"/.test(md));
    await resetWorkspace();
    await openBoard(D1);
    await expectEventually(() => cardTitles(0), ['D2_A_1', 'D1_A_1', 'D1_A_0', 'D2_A_0']);
  });

  it('does not drop a linked card into a lane that does not show its board', async function () {
    await openBoard(D1);
    await expectEventually(async () => (await cardTitles(0)).length, 4);
    const [d1, d2] = [await readFile(D1), await readFile(D2)];

    await dragCard(await card(0, 'D2_A_0'), await card(2, 'D1_C_0'), 'below');

    await browser.pause(1500);
    expect(await readFile(D1)).toBe(d1);
    expect(await readFile(D2)).toBe(d2);
    await expectEventually(() => cardTitles(2), ['D1_C_0']);
  });

  it('names the board of a linked card in its menu and opens it', async function () {
    await openBoard(D1);
    await expectEventually(async () => (await cardTitles(0)).length, 4);

    await (await card(0, 'D1_A_0')).$(cls('item-postfix-button')).click();
    await browser.$('.menu').waitForDisplayed();
    expect(await browser.$$('.menu-item-title*=From board').length).toBe(0);
    await browser.keys('Escape');

    await (await card(0, 'D2_A_0')).$(cls('item-postfix-button')).click();
    const item = await browser.$('.menu-item-title=From board: Work');
    await item.waitForDisplayed();
    await item.click();

    await browser.waitUntil(async () =>
      browser.executeObsidian(({ app }) => app.workspace.getActiveFile()?.path === 'Boards/Work.md')
    );
  });

  it('links a lane through the lane menu', async function () {
    await openBoard(D1);
    await expectEventually(async () => (await cardTitles(2)).length, 1);

    await lane(2).$(cls('lane-settings-button')).click();
    const item = await browser.$('.menu-item-title=Show cards from other boards');
    await item.waitForDisplayed();
    await item.click();

    const modal = await browser.$(cls('link-lanes-modal'));
    await modal.waitForDisplayed();
    expect(await chooseOption(D2)).toBe(true);
    // Choosing a board re-renders the modal and loads that board's lists.
    await browser.waitUntil(() => chooseOption('C'));
    await (await modal.$('button.mod-cta')).click();

    await waitForFile(D1, (md) =>
      md.includes('"C":{"sources":[{"file":"Boards/Work.md","lane":"C"}]}')
    );
  });
});
