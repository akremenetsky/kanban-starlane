import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import { openBoard, readFile, resetWorkspace, waitForFile } from '../helpers';

/** The settings row (in the open modal) whose name is `name`. */
async function settingRow(name: string) {
  const rows = await browser.$$('.modal .setting-item').getElements();
  for (const row of rows) {
    const label = await row.$('.setting-item-name');
    if ((await label.isExisting()) && (await label.getText()) === name) return row;
  }
  throw new Error(`no setting named "${name}"`);
}

async function clickIn(name: string, selector: string) {
  const el = (await settingRow(name)).$(selector);
  await el.scrollIntoView({ block: 'center' });
  // The modal scales in with an animation; clicks land on the wrong element until it settles.
  await el.waitForStable();
  await el.click();
}

describe('board settings modal', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('saves several quick changes to the board file', async function () {
    await openBoard('Boards/Basic.md');
    await browser.executeObsidianCommand('kanban-starlane:open-board-settings');
    await browser.$('.modal').waitForExist();

    await clickIn('Hide card counts in list titles', '.checkbox-container');
    await clickIn('Move tags to card footer', '.checkbox-container');

    const md = await waitForFile(
      'Boards/Basic.md',
      (md) => md.includes('"hide-card-count":true') && md.includes('"move-tags":true')
    );
    expect(md).toContain('"show-checkboxes":true');
  });

  it('reset removes the board override', async function () {
    await openBoard('Boards/Basic.md');
    await browser.executeObsidianCommand('kanban-starlane:open-board-settings');
    await browser.$('.modal').waitForExist();

    await clickIn('Display card checkbox', '.extra-setting-button');

    await waitForFile('Boards/Basic.md', (md) => !md.includes('show-checkboxes'));
    expect(await readFile('Boards/Basic.md')).toContain('%% kanban-starlane:settings');
  });

  it('header buttons follow their settings', async function () {
    await openBoard('Boards/Basic.md');
    const addListButton = browser.$('.view-action[aria-label="Add a list"]');
    await addListButton.waitForExist();

    await browser.executeObsidianCommand('kanban-starlane:open-board-settings');
    await clickIn('Add a list', '.checkbox-container');

    await addListButton.waitForExist({ reverse: true, timeout: 5000 });
  });
});
