import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import {
  cardTitles,
  cls,
  expectEventually,
  lane,
  openBoard,
  resetWorkspace,
  waitForFile,
} from '../helpers';

const BOARD = 'Boards/Tag dates.md';

function boardMd(cards: string, settings = '{"kanban-starlane":"board","date-syntax":"tag"}') {
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

async function today(format: string): Promise<string> {
  return browser.executeObsidian(({ obsidian }, f) => obsidian.moment().format(f), format);
}

async function startNewCard(text: string) {
  await lane(0).$(cls('new-item-button')).click();
  const input = await lane(0).$(`${cls('item-form')} .cm-content`);
  await input.waitForExist();
  await input.click();
  await browser.keys(text);
}

// The picked date or time lands in the editor asynchronously; Enter before that is lost.
async function editorText(): Promise<string> {
  return browser.execute(
    (sel) => document.querySelector(sel)?.textContent ?? '',
    `${cls('item-form')} .cm-content`
  );
}

// While the suggestion popover is open it takes Enter.
async function suggestionClosed() {
  await browser.$('.suggestion-container').waitForExist({ reverse: true });
}

async function clickFirstCardMenuItem(menuItem: string) {
  await lane(0).$(cls('item')).$(cls('item-postfix-button')).click();
  const item = await browser.$(`.menu-item-title=${menuItem}`);
  await item.waitForDisplayed();
  await item.click();
}

/** The query of the global search view, or '' when it was never opened. */
async function searchQuery(): Promise<string> {
  return browser.executeObsidian(({ app }) => {
    const view = app.workspace.getLeavesOfType('search')[0]?.view as unknown as
      { getQuery?: () => string } | undefined;
    return view?.getQuery?.() ?? '';
  });
}

/**
 * The first element matching `selector` that has a layout box; hidden leftovers of earlier
 * popovers are skipped. Checked in the page: WebdriverIO's `isDisplayed` sometimes reports a
 * calendar or suggestion on screen as hidden.
 */
async function visible(selector: string) {
  let index = -1;
  await browser.waitUntil(
    async () => {
      index = await browser.execute(
        (sel) =>
          [...document.querySelectorAll(sel)].findIndex(
            (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
          ),
        selector
      );
      return index >= 0;
    },
    { timeoutMsg: `nothing visible matches ${selector}` }
  );
  return browser.$$(selector)[index];
}

/**
 * Clicks day `day` of the month the open calendar shows and returns it as `YY-MM-DD`. The
 * calendar opens on the card's date, so "today" is not always on screen.
 */
async function pickDay(day = 20): Promise<string> {
  const calendar = await visible('.flatpickr-calendar');
  const cell = await calendar
    .$$('.flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)')
    .find(async (el) => (await el.getText()).trim() === String(day));
  const picked = await browser.executeObsidian(
    ({ obsidian }, el) =>
      obsidian.moment((el as unknown as { dateObj: Date }).dateObj).format('YY-MM-DD'),
    cell
  );
  await cell.click();
  return picked;
}

/** The settings row (in the open modal) whose name is `name`. */
async function settingRow(name: string) {
  const rows = await browser.$$('.modal .setting-item').getElements();
  for (const row of rows) {
    const label = await row.$('.setting-item-name');
    if ((await label.isExisting()) && (await label.getText()) === name) return row;
  }
  throw new Error(`no setting named "${name}"`);
}

describe('tag dates', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('shows a tag date as the card date once the board setting is switched', async function () {
    await createBoard(boardMd('- [ ] Task #26-10-14 #work', '{"kanban-starlane":"board"}'));
    await openBoard(BOARD);
    // Rendered as an ordinary tag first, so the absence of a date below means something.
    await expectEventually(async () => (await cardTitles(0))[0], 'Task #26-10-14 #work');
    expect(await lane(0).$(cls('item-metadata-date')).isExisting()).toBe(false);

    await browser.executeObsidianCommand('kanban-starlane:open-board-settings');
    await browser.$('.modal').waitForExist();
    const select = await (await settingRow('Date syntax')).$('select');
    await select.scrollIntoView({ block: 'center' });
    await select.waitForStable();
    await select.selectByAttribute('value', 'tag');
    await waitForFile(BOARD, (md) => md.includes('"date-syntax":"tag"'));
    await browser.keys('Escape');

    const date = lane(0).$(cls('item-metadata-date'));
    await date.waitForExist();
    const itemText = await lane(0).$(cls('item')).getText();
    expect(itemText).not.toContain('#26-10-14');
    expect(itemText).toContain('#work');
  });

  it('writes the date typed with the trigger as a tag', async function () {
    await createBoard(boardMd('- [ ] Existing'));
    await openBoard(BOARD);
    await expectEventually(async () => (await cardTitles(0)).length, 1);

    await startNewCard('Call @');
    const expected = await pickDay();
    await expectEventually(editorText, `Call #${expected} `);
    await suggestionClosed();
    await browser.keys('Enter');

    await waitForFile(BOARD, (md) => md.includes(`- [ ] Call #${expected}`));
  });

  it('puts the time typed with the time trigger into the tag date', async function () {
    await createBoard(boardMd('- [ ] Existing'));
    await openBoard(BOARD);
    await expectEventually(async () => (await cardTitles(0)).length, 1);

    // The typed time leaves one suggestion: Enter picks it wherever the mouse is (a hovered
    // suggestion becomes the selected one).
    await startNewCard('Meet #26-10-14 @@00:00');
    await visible('.suggestion-container .suggestion-item');
    await browser.keys('Enter');
    await expectEventually(editorText, 'Meet #26-10-14-00-00-00 ');
    await suggestionClosed();
    await browser.keys('Enter');

    await waitForFile(BOARD, (md) => /- \[ \] Meet #26-10-14-00-00-00/.test(md));
  });

  it('switches from the date picker to time suggestions when the time trigger is typed', async function () {
    await createBoard(boardMd('- [ ] Existing'));
    await openBoard(BOARD);
    await expectEventually(async () => (await cardTitles(0)).length, 1);

    // A slow typist: the date picker opens on the first `@` before the second one is typed.
    await startNewCard('Meet @');
    await visible('.flatpickr-calendar');
    await browser.keys('@00:00');
    await visible('.suggestion-container .suggestion-item');
    await expectEventually(
      () =>
        browser.execute(() =>
          [...document.querySelectorAll('.flatpickr-calendar')].some(
            (el) => el.getClientRects().length > 0
          )
        ),
      false
    );
  });

  it('replaces the date of a card that has one when the trigger is typed', async function () {
    await createBoard(boardMd('- [ ] Existing'));
    await openBoard(BOARD);
    await expectEventually(async () => (await cardTitles(0)).length, 1);

    await startNewCard('Call #26-10-14-09-30-00 @');
    const expected = await pickDay();
    await expectEventually(editorText, `Call #${expected}-09-30-00 `);
    await suggestionClosed();
    await browser.keys('Enter');

    await waitForFile(BOARD, (md) => md.includes(`- [ ] Call #${expected}-09-30-00`));
  });

  it('adds today with the time when the card has no date', async function () {
    await createBoard(boardMd('- [ ] Existing'));
    await openBoard(BOARD);
    await expectEventually(async () => (await cardTitles(0)).length, 1);

    await startNewCard('Ping @@00:00');
    await visible('.suggestion-container .suggestion-item');
    await browser.keys('Enter');
    const expected = await today('YY-MM-DD');
    await expectEventually(editorText, `Ping #${expected}-00-00-00 `);
    await suggestionClosed();
    await browser.keys('Enter');

    await waitForFile(BOARD, (md) => md.includes(`- [ ] Ping #${expected}-00-00-00`));
  });

  it('changes the date in place from the card and keeps the time', async function () {
    await createBoard(
      boardMd(
        '- [ ] Task #26-10-14-09-30-00 #work',
        '{"kanban-starlane":"board","date-syntax":"tag","move-dates":true}'
      )
    );
    await openBoard(BOARD);
    const date = lane(0).$(cls('item-metadata-date'));
    await date.waitForExist();

    await date.click();
    const expected = await pickDay();
    await waitForFile(BOARD, (md) => md.includes(`- [ ] Task #${expected}-09-30-00 #work`));
  });

  it('removes the time from the card menu', async function () {
    await createBoard(boardMd('- [ ] Task #26-10-14-09-30-00'));
    await openBoard(BOARD);
    await lane(0).$(cls('item-metadata-time')).waitForExist();

    await clickFirstCardMenuItem('Remove time');

    await waitForFile(BOARD, (md) => /- \[ \] Task #26-10-14( \^\w+)?\n/.test(md));
  });

  it('removes the date from the card menu', async function () {
    await createBoard(boardMd('- [ ] Task #26-10-14 #work'));
    await openBoard(BOARD);
    await lane(0).$(cls('item-metadata-date')).waitForExist();

    await clickFirstCardMenuItem('Remove date');

    await waitForFile(BOARD, (md) => /- \[ \] Task #work( \^\w+)?\n/.test(md));
  });

  it('shows the tag date as written once the board setting is on', async function () {
    await createBoard(boardMd('- [ ] Task #26-10-14-09-30-00 #work'));
    await openBoard(BOARD);
    await lane(0).$(cls('item-metadata-time')).waitForExist();

    await browser.executeObsidianCommand('kanban-starlane:open-board-settings');
    await browser.$('.modal').waitForExist();
    const toggle = await (await settingRow('Show date tags as written')).$('.checkbox-container');
    await toggle.scrollIntoView({ block: 'center' });
    await toggle.waitForStable();
    await toggle.click();
    await waitForFile(BOARD, (md) => md.includes('"date-tags-as-written":true'));
    await browser.keys('Escape');

    const tag = lane(0).$(`${cls('item-title')} ${cls('date-tag')} a.tag`);
    await tag.waitForExist();
    expect(await tag.getText()).toBe('#26-10-14-09-30-00');
    expect(await tag.getAttribute('href')).toBe('#26-10-14-09-30-00');
    expect(await lane(0).$(cls('item-metadata-time')).isExisting()).toBe(false);
  });

  it('opens the date picker from a tag date shown as written', async function () {
    await createBoard(
      boardMd(
        '- [ ] Task #26-10-14-09-30-00 #work',
        '{"kanban-starlane":"board","date-syntax":"tag","date-tags-as-written":true}'
      )
    );
    await openBoard(BOARD);
    const tag = lane(0).$(`${cls('date-tag')} a.tag`);
    await tag.waitForExist();

    await tag.click();
    const expected = await pickDay();
    await waitForFile(BOARD, (md) => md.includes(`- [ ] Task #${expected}-09-30-00 #work`));
    // The click must not also run the tag search an ordinary tag opens.
    expect(await searchQuery()).not.toContain('26-10-14');
  });

  it('shows the tag date as written in the card footer', async function () {
    await createBoard(
      boardMd(
        '- [ ] Task #26-10-14 #work',
        '{"kanban-starlane":"board","date-syntax":"tag","date-tags-as-written":true,"move-dates":true}'
      )
    );
    await openBoard(BOARD);
    const tag = lane(0).$(`${cls('item-metadata')} ${cls('date-tag')} a.tag`);
    await tag.waitForExist();
    expect(await tag.getText()).toBe('#26-10-14');

    await tag.click();
    const expected = await pickDay();
    await waitForFile(BOARD, (md) => md.includes(`- [ ] Task #${expected} #work`));
  });

  it('opens the date picker from a tag date highlighted by the board search', async function () {
    await createBoard(
      boardMd(
        '- [ ] Task #26-10-14 #work',
        '{"kanban-starlane":"board","date-syntax":"tag","date-tags-as-written":true}'
      )
    );
    await openBoard(BOARD);
    await lane(0)
      .$(`${cls('date-tag')} a.tag`)
      .waitForExist();

    await browser.$('.view-action[aria-label="Search..."]').click();
    const input = browser.$(cls('filter-input'));
    await input.waitForExist();
    await input.setValue('26-10');
    // The search wraps the matching text in a <mark>, which then receives the click.
    const mark = lane(0).$(`${cls('date-tag')} a.tag mark`);
    await mark.waitForExist();
    await mark.click();
    const expected = await pickDay();
    await waitForFile(BOARD, (md) => md.includes(`- [ ] Task #${expected} #work`));
  });
});
