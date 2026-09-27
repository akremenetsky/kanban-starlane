import { convertLegacyBoard, isLegacyBoard } from 'src/parsers/legacy';
import { describe, expect, it } from 'vitest';

import { board } from '../../setup/fixtures';
import { loadBoard, summarize } from '../../setup/harness';

const legacy = [
  '---',
  '',
  'kanban-plugin: board',
  'tags: [x]',
  '',
  '---',
  '',
  '## Todo',
  '',
  '- [ ] mentions kanban-plugin: in text',
  '',
  '***',
  '',
  '## Архивировать', // ru locale string written by obsidian-kanban
  '',
  '- [x] old',
  '',
  '%% kanban:settings',
  '```',
  '{"kanban-plugin":"list","lane-width":300}',
  '```',
  '%%',
].join('\n');

describe('legacy obsidian-kanban boards', () => {
  it('detects legacy boards', () => {
    expect(isLegacyBoard(legacy)).toBe(true);
    expect(isLegacyBoard(board('kanban-starlane: board', '## L'))).toBe(false);
    expect(isLegacyBoard('# just a note\n\nkanban-plugin: board')).toBe(false);
  });

  it('rewrites only the identifiers', () => {
    const out = convertLegacyBoard(legacy);

    expect(out).toContain('\nkanban-starlane: board\n');
    expect(out).toContain('- [ ] mentions kanban-plugin: in text');
    expect(out).toContain('%% kanban-starlane:settings');
    expect(out).toContain('{"kanban-starlane":"list","lane-width":300}');
    expect(isLegacyBoard(out)).toBe(false);
    expect(convertLegacyBoard(out)).toBe(out);
  });

  it('reads a converted board including a localized archive heading', async () => {
    const { board: b, toMarkdown } = await loadBoard(convertLegacyBoard(legacy));
    const s = summarize(b);

    expect(s.lanes.map((l) => l.title)).toEqual(['Todo']);
    expect(s.archive).toEqual(['old']);
    // the frontmatter value wins over the one in the settings footer
    expect(s.settings).toMatchObject({ 'kanban-starlane': 'board', 'lane-width': 300 });
    expect(toMarkdown()).toContain('## Archive\n');
  });

  it('accepts the legacy settings marker and writes the new one', async () => {
    const md = board('kanban-starlane: board', '## L').replace(
      '%% kanban-starlane:settings',
      '%% kanban:settings'
    );
    const { toMarkdown } = await loadBoard(md);
    expect(toMarkdown()).toContain('%% kanban-starlane:settings');
  });

  it('accepts a localized **Complete** marker', async () => {
    const { board: b } = await loadBoard(
      board('kanban-starlane: board', '## Done\n\n**Fertiggestellt**\n- [x] a')
    );
    expect(summarize(b).lanes[0].complete).toBe(true);
  });
});

describe('legacy settings import', () => {
  it('renames the legacy view key and keeps the rest', async () => {
    const { mapLegacySettings } = await import('src/plugin/migration');
    expect(mapLegacySettings({ 'kanban-plugin': 'list', 'lane-width': 300 })).toEqual({
      'kanban-starlane': 'list',
      'lane-width': 300,
    });
  });
});
