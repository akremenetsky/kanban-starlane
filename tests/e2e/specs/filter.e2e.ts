/**
 * Filter bar: tags of Boards/Tagged.md; boards of Boards/Linked.md, which shows lanes of
 * Boards/Work.md.
 */
import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import {
  cardTitles,
  cls,
  expectEventually,
  openBoard,
  readFile,
  resetWorkspace,
} from '../helpers';

const TAGGED = 'Boards/Tagged.md';
const LINKED = 'Boards/Linked.md';

const filterButton = () => browser.$('.view-action[aria-label="Filter"]');

/** Pick a suggestion of the focused filter input by its label. */
async function pickSuggestion(label: string) {
  let item: WebdriverIO.Element | undefined;
  await browser.waitUntil(
    async () => {
      item = await browser
        .$$('.suggestion-container .suggestion-item')
        .find(
          async (el) => (await el.$(cls('filter-suggestion-label')).getText()).trim() === label
        );
      return !!item;
    },
    { timeoutMsg: `no suggestion "${label}"` }
  );
  await item!.click();
}

/** Card names without their tags. */
async function names(laneIndex: number): Promise<string[]> {
  return (await cardTitles(laneIndex)).map((title) => title.split(' ')[0]);
}

async function chips(): Promise<string[]> {
  return browser.$$(cls('filter-chip-label')).map(async (el) => (await el.getText()).trim());
}

/** Replace the board's settings JSON before opening it. */
async function setBoardSettings(path: string, json: string) {
  await browser.executeObsidian(
    async ({ app }, p, settings) => {
      const file = app.vault.getFileByPath(p);
      await app.vault.process(file, (md) =>
        md.replace(/\n\{"kanban-starlane".*\}\n/, `\n${settings}\n`)
      );
    },
    path,
    json
  );
}

describe('filter', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('shows the cards with any of the selected tags and resets on a second click', async function () {
    const original = await readFile(TAGGED);
    await openBoard(TAGGED);
    await expectEventually(() => names(0), ['Alpha', 'Beta', 'Gamma', 'Delta']);

    await filterButton().click();
    await browser.$(cls('filter-bar')).waitForExist();
    expect(await filterButton().getAttribute('class')).toContain('is-active');

    await pickSuggestion('#work');
    // Nested tags match their parent; #workshop-like prefixes do not.
    await expectEventually(() => names(0), ['Alpha', 'Gamma']);

    await browser.$(cls('filter-input-tags')).click();
    await pickSuggestion('#home');
    await expectEventually(chips, ['#work', '#home']);
    await expectEventually(() => names(0), ['Alpha', 'Beta', 'Gamma']);
    // Tags ignore case: #Home matches #home.
    await expectEventually(() => names(1), ['Epsilon']);

    await browser.$$(cls('filter-chip-remove'))[0].click();
    await expectEventually(() => names(0), ['Beta']);

    await filterButton().click();
    await browser.$(cls('filter-bar')).waitForExist({ reverse: true });
    expect(await filterButton().getAttribute('class')).not.toContain('is-active');
    await expectEventually(() => names(0), ['Alpha', 'Beta', 'Gamma', 'Delta']);

    // The filter never touches the file.
    expect(await readFile(TAGGED)).toBe(original);
  });

  it('filters by source board on a board with linked lists', async function () {
    await openBoard(LINKED);
    await expectEventually(() => cardTitles(0), ['D1_A_0', 'D1_A_1', 'D2_A_0', 'D2_A_1']);

    await filterButton().click();
    await browser.$(cls('filter-input-boards')).click();
    await pickSuggestion('Work');

    await expectEventually(() => cardTitles(0), ['D2_A_0', 'D2_A_1']);
    // Lane C has only own cards, so it collapses.
    await expectEventually(
      async () =>
        (await browser.$$(cls('lane-wrapper'))[2].getAttribute('class')).includes(
          'collapse-horizontal'
        ),
      true
    );
  });

  it('filters the rows of the table view by tag', async function () {
    await openBoard(TAGGED);
    await browser.executeObsidianCommand('kanban-starlane:view-table');
    await browser.$(cls('table-wrapper')).waitForExist();
    const rows = () => browser.$$(`${cls('table-wrapper')} tbody tr`).length;
    await expectEventually(rows, 5);

    await filterButton().click();
    await pickSuggestion('#home');

    await expectEventually(rows, 2);
  });

  it('adds a clicked tag to the filter when tags search the board', async function () {
    await setBoardSettings(TAGGED, '{"kanban-starlane":"board","tag-action":"kanban"}');
    await openBoard(TAGGED);
    await expectEventually(async () => (await cardTitles(0)).length, 4);

    await browser.$(`${cls('lane')} a.tag[href="#home"]`).click();

    await expectEventually(chips, ['#home']);
    await expectEventually(() => names(0), ['Beta']);
  });

  it('has no filter button when the setting is off', async function () {
    await setBoardSettings(TAGGED, '{"kanban-starlane":"board","show-filter":false}');
    await openBoard(TAGGED);
    await browser.$('.view-action[aria-label="Search..."]').waitForExist();

    expect(await filterButton().isExisting()).toBe(false);
  });
});
