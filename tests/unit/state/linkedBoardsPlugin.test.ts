/** Wiring of linked boards in the plugin: loading boards in the background and renames. */
import KanbanPlugin from 'src/plugin/KanbanPlugin';
import { updateBoardsLinkingTo } from 'src/plugin/linkedBoards';
import { retargetLinkedFile } from 'src/state/linkedLanes';
import { describe, expect, it } from 'vitest';

import { board } from '../../setup/fixtures';
import { createFakeApp } from '../../setup/harness';

const boardFm = { frontmatter: { 'kanban-starlane': 'board' } };
const linkingSettings =
  '{"kanban-starlane":"board","linked-lanes":{"A":{"sources":[{"file":"Work.md","lane":"A"}]}}}';

function fakePlugin(contents: Record<string, string>) {
  const app = createFakeApp({
    contents,
    files: Object.fromEntries(Object.keys(contents).map((p) => [p, boardFm])),
  });
  const plugin = Object.create(KanbanPlugin.prototype) as KanbanPlugin;
  Object.assign(plugin, { app, settings: {}, stateManagers: new Map() });
  return { app, plugin };
}

describe('updateBoardsLinkingTo', () => {
  it('follows a renamed linked board', async () => {
    const { app, plugin } = fakePlugin({
      'Home.md': board('kanban-starlane: board', '## A\n\n- [ ] own', linkingSettings),
      'Work.md': board('kanban-starlane: board', '## A'),
    });

    await updateBoardsLinkingTo(plugin, 'Work.md', (l) =>
      retargetLinkedFile(l, 'Work.md', 'Areas/Work.md')
    );

    expect(app.vault.contents.get('Home.md')).toContain('"file":"Areas/Work.md"');
    expect(plugin.stateManagers.size).toBe(0); // released again
  });

  it('does not rewrite boards the change does not affect', async () => {
    // Not in the canonical layout (no blank lines): any save would reformat it.
    const untidy =
      '---\nkanban-starlane: board\n---\n## A\n- [ ] mentions Work.md in a card\n' +
      `%% kanban-starlane:settings\n\`\`\`\n{"kanban-starlane":"board"}\n\`\`\`\n%%`;
    const { app, plugin } = fakePlugin({
      'Untidy.md': untidy,
      'Work.md': board('kanban-starlane: board', '## A'),
    });

    await updateBoardsLinkingTo(plugin, 'Work.md', (l) =>
      retargetLinkedFile(l, 'Work.md', 'Areas/Work.md')
    );

    expect(app.vault.writes).toEqual([]);
    expect(app.vault.contents.get('Untidy.md')).toBe(untidy);
  });
});

describe('retainBoard', () => {
  it('loads a board without a view and shares it between users', async () => {
    const { plugin } = fakePlugin({ 'Work.md': board('kanban-starlane: board', '## A') });
    const file = plugin.app.vault.getAbstractFileByPath('Work.md') as any;

    const [a, b] = await Promise.all([plugin.retainBoard(file), plugin.retainBoard(file)]);

    expect(a).toBe(b);
    expect(a.state.children.map((l) => l.data.title)).toEqual(['A']);
    a.release();
    expect(plugin.stateManagers.size).toBe(1);
    b.release();
    expect(plugin.stateManagers.size).toBe(0);
  });
});
