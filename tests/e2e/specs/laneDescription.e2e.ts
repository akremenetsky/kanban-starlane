import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import {
  cls,
  expectEventually,
  lane,
  laneTitles,
  openBoard,
  readFile,
  resetWorkspace,
  waitForFile,
} from '../helpers';

const BOARD = 'Boards/Described.md';

async function descriptionText(laneIndex: number) {
  const els = await lane(laneIndex).$$(cls('lane-description-text'));
  if (els.length === 0) return null;
  return (await els[0].getText()).trim();
}

// Double-click plain text: the description also has a link, and a click that lands on it
// opens the note instead (where the centre of the block falls depends on fonts and version).
async function editDescription(laneIndex: number) {
  await lane(laneIndex).$(cls('lane-description-text')).$('strong').doubleClick();
  await browser.$(`${cls('lane-description')} .cm-content`).waitForExist();
}

async function typeInEditor(selector: string, text: string) {
  const input = await browser.$(`${selector} .cm-content`);
  await input.waitForExist();
  await input.click();
  await browser.keys(text);
}

describe('lane description', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('is shown under the title only for lanes that have one', async function () {
    await openBoard(BOARD);

    await expectEventually(() => descriptionText(0), 'Work for this week\nSee Plain note');
    expect(await descriptionText(1)).toBe(null);
    await browser.saveScreenshot('tests/e2e/.artifacts/lane-description.png');
  });

  it('is added from the lane menu', async function () {
    await openBoard(BOARD);

    await lane(1).$(cls('lane-settings-button')).click();
    const item = await browser.$('.menu-item-title=Add description');
    await item.waitForDisplayed();
    await item.click();

    await typeInEditor(`${cls('lane-description')}`, 'All shipped work');
    await browser.keys('Enter');

    await waitForFile(BOARD, (md) =>
      md.includes('## Done\n\nAll shipped work\n\n- [x] Finished card')
    );
    await expectEventually(() => descriptionText(1), 'All shipped work');
  });

  it('is edited by double-click and removed when cleared', async function () {
    await openBoard(BOARD);
    await expectEventually(async () => (await descriptionText(0)) !== null, true);

    await editDescription(0);
    await browser.keys(['Control', 'a']);
    await browser.keys('Delete');
    await browser.keys('Enter');

    await waitForFile(BOARD, (md) => md.includes('## Todo\n\n- [ ] First card'));
    await expectEventually(() => descriptionText(0), null);
  });

  it('Esc cancels an edit, clicking elsewhere saves it', async function () {
    await openBoard(BOARD);
    await expectEventually(async () => (await descriptionText(0)) !== null, true);

    await editDescription(0);
    await browser.keys(['Control', 'a']);
    await browser.keys('Discarded');
    await browser.keys('Escape');
    await expectEventually(() => descriptionText(0), 'Work for this week\nSee Plain note');

    await editDescription(0);
    await browser.keys(['Control', 'a']);
    await browser.keys('Kept');
    await lane(1).$(cls('item-title')).click();

    await waitForFile(BOARD, (md) => md.includes('## Todo\n\nKept\n\n- [ ] First card'));
    expect(await readFile(BOARD)).not.toContain('Discarded');
  });

  it('can be given when a lane is created', async function () {
    await openBoard(BOARD);

    await browser.$('.view-action[aria-label="Add a list"]').click();
    await typeInEditor(`${cls('lane-input-wrapper')} > ${cls('lane-input')}`, 'Review');
    await typeInEditor(cls('lane-description-input'), 'Waiting for feedback');
    await browser.keys('Enter');

    await waitForFile(BOARD, (md) => md.includes('## Review\n\nWaiting for feedback\n'));
    await expectEventually(async () => (await laneTitles()).includes('Review'), true);
    await expectEventually(() => descriptionText(2), 'Waiting for feedback');
  });
});
