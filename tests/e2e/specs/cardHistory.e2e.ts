import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import {
  card,
  cardTitles,
  cls,
  dragCard,
  expectEventually,
  openBoard,
  readFile,
  resetWorkspace,
  waitForFile,
} from '../helpers';

async function openHistory(laneIndex: number, title: string) {
  await (await card(laneIndex, title)).$(cls('item-postfix-button')).click();
  const item = await browser.$('.menu-item-title=History');
  await item.waitForDisplayed();
  await item.click();
  await browser.$(cls('card-history-modal')).waitForDisplayed();
}

async function historyLines(): Promise<string[]> {
  return browser.$$(cls('card-history-text')).map((el) => el.getText());
}

describe('card history', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  afterEach(async function () {
    await browser.executeObsidian(({ app }) => app.workspace.leftSplit.expand());
  });

  it('records a checked card and shows it in the card menu', async function () {
    await openBoard('Boards/Basic.md');
    await expectEventually(() => cardTitles(0), ['First card', 'Second card #tag']);

    await (await card(0, 'First card')).$('input[type=checkbox]').click();

    const md = await waitForFile('Boards/Basic.md', (md) =>
      md.includes('%% kanban-starlane:history')
    );
    expect(md).toMatch(/- \[x\] First card \^[a-z0-9]{6}\n/);
    expect(md).toContain('"type":"checked","mark":"x"');

    await openHistory(0, 'First card');
    await expectEventually(historyLines, ['Marked as done']);
    expect(await browser.$(cls('card-history-summary')).getText()).toBe(
      'List «Todo» since an unknown time'
    );
  });

  it('shows that a card has no history yet', async function () {
    await openBoard('Boards/Basic.md');
    await expectEventually(async () => (await cardTitles(0)).length, 2);

    await openHistory(0, 'First card');

    expect(await browser.$(cls('card-history-empty')).isDisplayed()).toBe(true);
    expect(await readFile('Boards/Basic.md')).not.toContain('kanban-starlane:history');
  });

  it('records changes of a linked card in its own board', async function () {
    await openBoard('Boards/Linked.md');
    await expectEventually(async () => (await cardTitles(0)).length, 4);

    await (await card(0, 'D2_A_1')).$('input[type=checkbox]').click();

    const work = await waitForFile('Boards/Work.md', (md) =>
      md.includes('%% kanban-starlane:history')
    );
    expect(work).toMatch(/- \[x\] D2_A_1 \^[a-z0-9]{6}\n/);
    expect(work).toContain('"type":"checked","mark":"x"');
    expect(await readFile('Boards/Linked.md')).not.toContain('kanban-starlane:history');

    await openHistory(0, 'D2_A_1');
    await expectEventually(historyLines, ['Marked as done']);
  });

  it('takes the history along when a card is dragged to another board', async function () {
    await openBoard('Boards/Basic.md');
    await expectEventually(async () => (await cardTitles(0)).length, 2);
    await (await card(0, 'First card')).$('input[type=checkbox]').click();
    await waitForFile('Boards/Basic.md', (md) => md.includes('"type":"checked"'));

    // Two boards side by side need room: keep the first lane of each pane on screen.
    await browser.executeObsidian(async ({ app }) => {
      app.workspace.leftSplit.collapse();
      await app.workspace.getLeaf('split').openFile(app.vault.getFileByPath('Boards/Work.md'));
    });
    // Lanes of both views: Basic Todo, Doing, Done, then Work A, B, C.
    await expectEventually(() => cardTitles(3), ['D2_A_0', 'D2_A_1']);

    await dragCard(await card(0, 'First card'), await card(3, 'D2_A_0'), 'above');

    const work = await waitForFile('Boards/Work.md', (md) =>
      md.includes('"board":"Boards/Basic.md"')
    );
    expect(work).toMatch(/## A\n\n- \[x\] First card \^[a-z0-9]{6}\n- \[ \] D2_A_0\n/);
    expect(work).toContain('"type":"checked","mark":"x"},{');
    expect(work).toContain('"type":"moved","board":"Boards/Basic.md","from":"Todo","to":"A"');
    await waitForFile(
      'Boards/Basic.md',
      (md) => !md.includes('First card') && !md.includes('kanban-starlane:history')
    );
  });
});
