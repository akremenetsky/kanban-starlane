import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

import {
  activeViewType,
  expectEventually,
  laneTitles,
  openFile,
  readFile,
  resetWorkspace,
} from '../helpers';

describe('migration from obsidian-kanban', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('converts the active legacy board and opens it', async function () {
    await openFile('Boards/Legacy.md');
    expect(await activeViewType()).toBe('markdown');

    await browser.executeObsidianCommand('kanban-starlane:convert-legacy-board');

    await browser.waitUntil(async () => (await activeViewType()) === 'kanban-starlane');
    await expectEventually(laneTitles, ['Old lane']);

    const md = await readFile('Boards/Legacy.md');
    expect(md).toContain('kanban-starlane: board');
    expect(md).toContain('%% kanban-starlane:settings');
  });

  it('converts all legacy boards after confirmation', async function () {
    await browser.executeObsidianCommand('kanban-starlane:convert-all-legacy-boards');
    const confirm = browser.$('.modal button.mod-cta');
    await confirm.waitForStable();
    await confirm.click();

    await browser.waitUntil(async () =>
      (await readFile('Boards/Legacy.md')).includes('kanban-starlane: board')
    );
    // Starlane boards are left untouched.
    expect(await readFile('Boards/Basic.md')).not.toContain('kanban-plugin');
  });
});
