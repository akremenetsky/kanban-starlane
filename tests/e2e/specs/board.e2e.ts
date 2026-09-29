import { browser, expect } from '@wdio/globals';
import { VIEW_ICON } from 'src/constants';
import { obsidianPage } from 'wdio-obsidian-service';

import {
  activeViewType,
  cardTitles,
  cls,
  expectEventually,
  lane,
  laneTitles,
  openBoard,
  openFile,
  resetWorkspace,
  waitForFile,
} from '../helpers';

describe('board view', function () {
  beforeEach(async function () {
    await resetWorkspace();
    await obsidianPage.resetVault();
  });

  it('opens board files in the kanban view', async function () {
    await openBoard('Boards/Basic.md');

    expect(await activeViewType()).toBe('kanban-starlane');
    await expectEventually(laneTitles, ['Todo', 'Doing', 'Done']);
    await expectEventually(() => cardTitles(0), ['First card', 'Second card #tag']);
  });

  it('opens normal notes in the markdown view', async function () {
    await openFile('Notes/Plain note.md');
    expect(await activeViewType()).toBe('markdown');
  });

  it('does not claim obsidian-kanban boards', async function () {
    await openFile('Boards/Legacy.md');
    expect(await activeViewType()).toBe('markdown');
  });

  it('adds a card and saves it to the file', async function () {
    await openBoard('Boards/Basic.md');

    await lane(0).$(cls('new-item-button')).click();
    const input = await browser.$(`${cls('item-input')} .cm-content`);
    await input.waitForExist();
    await input.click();
    await browser.keys('Brand new card');
    await browser.keys('Enter');

    await waitForFile('Boards/Basic.md', (md) => md.includes('- [ ] Brand new card'));
    await expectEventually(async () => (await cardTitles(0)).includes('Brand new card'), true);
  });

  it('toggles a card checkbox', async function () {
    await openBoard('Boards/Basic.md');

    await lane(0)
      .$(`${cls('item')} input[type=checkbox]`)
      .click();

    await waitForFile('Boards/Basic.md', (md) => md.includes('- [x] First card'));
  });

  it('switches to the markdown view and back', async function () {
    await openBoard('Boards/Basic.md');

    await browser.executeObsidianCommand('kanban-starlane:toggle-kanban-view');
    await browser.waitUntil(async () => (await activeViewType()) === 'markdown');

    await browser.executeObsidianCommand('kanban-starlane:toggle-kanban-view');
    await browser.waitUntil(async () => (await activeViewType()) === 'kanban-starlane');
  });

  it('uses a board icon that exists in this Obsidian version', async function () {
    // An unknown Lucide name renders as an empty space in menus (e.g. "New kanban board").
    const iconExists = await browser.executeObsidian(
      ({ obsidian }, name) => !!obsidian.getIcon(name),
      VIEW_ICON
    );
    expect(iconExists).toBe(true);
  });
});
