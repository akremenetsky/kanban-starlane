import { moment } from 'obsidian';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { board } from '../../setup/fixtures';
import { loadBoard, summarize } from '../../setup/harness';

afterEach(() => {
  vi.useRealTimers();
});

describe('archiveCompletedCards', () => {
  const md = board(
    'kanban-starlane: board',
    '## Todo\n\n- [ ] open\n- [x] done\n- [/] in progress\n\n## Done\n\n**Complete**\n- [ ] in complete lane'
  );

  it('moves checked cards and every card of a Complete lane to the archive', async () => {
    const { stateManager } = await loadBoard(md);
    await stateManager.archiveCompletedCards();
    const s = summarize(stateManager.state);

    expect(s.lanes.map((l) => l.items)).toEqual([['open', 'in progress'], []]);
    expect(s.archive).toEqual(['done', 'in complete lane']);
  });

  it('saves the result to the view', async () => {
    const { stateManager, view } = await loadBoard(md);
    await stateManager.archiveCompletedCards();

    expect(view.data).toContain('## Archive\n\n- [x] done');
  });

  it('prefixes the archive date when archive-with-date is set', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2024-05-06T07:08:00Z'));

    const { stateManager } = await loadBoard(md, {
      globalSettings: { 'archive-with-date': true },
    });
    await stateManager.archiveCompletedCards();

    expect(summarize(stateManager.state).archive[0]).toBe('2024-05-06 07:08 done');
  });

  it('appends the archive date after the title with a separator', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2024-05-06T07:08:00Z'));

    const { stateManager } = await loadBoard(md, {
      globalSettings: {
        'archive-with-date': true,
        'append-archive-date': true,
        'archive-date-separator': '|',
      },
    });
    await stateManager.archiveCompletedCards();

    expect(summarize(stateManager.state).archive[0]).toBe('done | 2024-05-06 07:08');
  });
});

describe('re-parsing an open board', () => {
  it('keeps ids of unchanged cards and lanes when the file changes', async () => {
    const md = board(
      'kanban-starlane: board',
      '## A\n\n- [ ] one\n- [ ] two\n\n## B\n\n- [ ] three'
    );
    const { stateManager, view } = await loadBoard(md);
    const before = stateManager.state;

    view.data = md.replace('- [ ] two', '- [ ] two edited');
    await stateManager.reparseBoardFromMd();
    const after = stateManager.state;

    expect(summarize(after).lanes[0].items).toEqual(['one', 'two edited']);
    expect(after.children[0].id).toBe(before.children[0].id);
    expect(after.children[0].children[0].id).toBe(before.children[0].children[0].id);
    expect(after.children[1].children[0].id).toBe(before.children[1].children[0].id);
  });

  it('picks up added lanes and cards', async () => {
    const md = board('kanban-starlane: board', '## A\n\n- [ ] one');
    const { stateManager, view } = await loadBoard(md);

    view.data = md.replace('- [ ] one', '- [ ] one\n- [ ] new\n\n## C\n\n- [ ] c1');
    await stateManager.reparseBoardFromMd();

    expect(summarize(stateManager.state).lanes.map((l) => l.items)).toEqual([
      ['one', 'new'],
      ['c1'],
    ]);
  });
});

describe('settings resolution', () => {
  it('board settings override global settings, which override defaults', async () => {
    const md = board(
      'kanban-starlane: board',
      '## L',
      '{"kanban-starlane":"board","date-format":"DD/MM"}'
    );
    const { stateManager } = await loadBoard(md, {
      globalSettings: { 'date-format': 'YYYY', 'time-format': 'hh:mm A' },
    });

    expect(stateManager.getSetting('date-format')).toBe('DD/MM');
    expect(stateManager.getSetting('time-format')).toBe('hh:mm A');
    expect(stateManager.getSetting('date-trigger')).toBe('@');
    expect(stateManager.getSetting('show-add-list')).toBe(true);
  });

  it('merges global and board metadata keys', async () => {
    const key = (k: string) => ({
      metadataKey: k,
      label: k,
      shouldHideLabel: false,
      containsMarkdown: false,
    });
    const md = board(
      'kanban-starlane: board',
      '## L',
      JSON.stringify({ 'kanban-starlane': 'board', 'metadata-keys': [key('b')] })
    );
    const { stateManager } = await loadBoard(md, {
      globalSettings: { 'metadata-keys': [key('a')] },
    });

    expect(stateManager.getSetting('metadata-keys').map((k) => k.metadataKey)).toEqual(['a', 'b']);
  });

  it('re-parses cards when a parse-affecting setting changes', async () => {
    const md = board('kanban-starlane: board', '## L\n\n- [ ] Task #tag');
    const { stateManager } = await loadBoard(md);
    expect(stateManager.state.children[0].children[0].data.title).toContain('#tag');

    stateManager.setState(
      {
        ...stateManager.state,
        data: {
          ...stateManager.state.data,
          settings: { ...stateManager.state.data.settings, 'move-tags': true },
        },
      },
      false
    );

    expect(stateManager.state.children[0].children[0].data.title).toBe('Task');
  });
});

describe('creating and editing cards', () => {
  it('getNewItem parses content like a card in the file', async () => {
    const { stateManager } = await loadBoard(board('kanban-starlane: board', '## L'));
    const item = stateManager.getNewItem('New #t @{2024-01-02}', ' ');

    expect(item.data.titleRaw).toBe('New #t @{2024-01-02}');
    expect(item.data.metadata.tags).toEqual(['#t']);
    expect(item.data.metadata.date?.format('YYYY-MM-DD')).toBe('2024-01-02');
  });

  it('updateItemContent keeps the block id and id', async () => {
    const { stateManager } = await loadBoard(
      board('kanban-starlane: board', '## L\n\n- [ ] a ^blk1')
    );
    const item = stateManager.state.children[0].children[0];
    const updated = stateManager.updateItemContent(item, 'b\nsecond line');

    expect(updated.id).toBe(item.id);
    expect(updated.data.blockId).toBe('blk1');
    expect(updated.data.titleRaw).toBe('b\nsecond line');
  });

  it('keeps parsed dates as moments', async () => {
    const { stateManager } = await loadBoard(board('kanban-starlane: board', '## L'));
    const item = stateManager.getNewItem('x @{2024-01-02}', ' ');
    expect(moment.isMoment(item.data.metadata.date)).toBe(true);
  });
});

describe('regressions', () => {
  it('drops inline metadata removed from a card while the board is open', async () => {
    const md = board('kanban-starlane: board', '## L\n\n- [ ] Task [status:: open]');
    const plugins = { dataview: { api: undefined as unknown } };
    const { stateManager, view } = await loadBoard(md, { plugins });
    expect(stateManager.state.children[0].children[0].data.metadata.inlineMetadata).toHaveLength(1);

    view.data = md.replace(' [status:: open]', '');
    await stateManager.reparseBoardFromMd();

    expect(stateManager.state.children[0].children[0].data.metadata.inlineMetadata).toBeUndefined();
  });
});
