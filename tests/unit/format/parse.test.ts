/**
 * Characterization tests for markdown -> Board parsing.
 * They pin the behaviour inherited from obsidian-kanban 2.0.51; change them only on purpose.
 */
import { describe, expect, it } from 'vitest';

import { board, readFixture } from '../../setup/fixtures';
import { loadBoard, summarize } from '../../setup/harness';

describe('lanes', () => {
  it('parses lane titles, WIP limits and <br> line breaks', async () => {
    const { board: b } = await loadBoard(
      board('kanban-starlane: board', '## Todo (3)\n\n## Two<br>lines\n\n## Plain (x)')
    );

    expect(summarize(b).lanes.map(({ title, maxItems }) => ({ title, maxItems }))).toEqual([
      { title: 'Todo', maxItems: 3 },
      { title: 'Two\nlines', maxItems: 0 },
      { title: 'Plain (x)', maxItems: 0 },
    ]);
  });

  it('marks a lane complete when it starts with **Complete**', async () => {
    const { board: b } = await loadBoard(
      board('kanban-starlane: board', '## Done\n\n**Complete**\n- [x] a\n\n## Open\n\n- [ ] b')
    );

    expect(summarize(b).lanes.map((l) => l.complete)).toEqual([true, false]);
  });

  it('ignores content that is not under a heading', async () => {
    const { board: b } = await loadBoard(
      board(
        'kanban-starlane: board',
        'stray paragraph\n\n- [ ] stray item\n\n## Lane\n\n- [ ] kept'
      )
    );

    expect(summarize(b).lanes).toEqual([
      { title: 'Lane', maxItems: 0, complete: false, items: ['kept'] },
    ]);
  });

  it('treats "## Archive" after a thematic break as the archive', async () => {
    const { board: b } = await loadBoard(
      board('kanban-starlane: board', '## Lane\n\n- [ ] a\n\n***\n\n## Archive\n\n- [x] old')
    );

    expect(summarize(b).lanes.map((l) => l.title)).toEqual(['Lane']);
    expect(summarize(b).archive).toEqual(['old']);
  });

  it('treats "## Archive" without a thematic break as a normal lane', async () => {
    const { board: b } = await loadBoard(board('kanban-starlane: board', '## Archive\n\n- [x] a'));

    expect(summarize(b).lanes.map((l) => l.title)).toEqual(['Archive']);
    expect(summarize(b).archive).toEqual([]);
  });
});

describe('cards', () => {
  it('parses check state and custom status characters', async () => {
    const { board: b } = await loadBoard(
      board('kanban-starlane: board', '## L\n\n- [ ] open\n- [x] done\n- [/] doing\n- [-] dropped')
    );

    const items = b.children[0].children.map((i) => [i.data.checked, i.data.checkChar]);
    expect(items).toEqual([
      [false, ' '],
      [true, 'x'],
      [true, '/'],
      [true, '-'],
    ]);
  });

  it('strips the block id from the title and keeps it on the item', async () => {
    const { board: b } = await loadBoard(
      board('kanban-starlane: board', '## L\n\n- [ ] card ^a1b2')
    );
    const item = b.children[0].children[0];

    expect(item.data.titleRaw).toBe('card');
    expect(item.data.blockId).toBe('a1b2');
  });

  it('strips the block id of a multi-line card from the rendered title', async () => {
    const { board: b } = await loadBoard(
      board('kanban-starlane: board', '## L\n\n- [ ] card ^a1b2\n\tsecond line')
    );
    const item = b.children[0].children[0];

    expect(item.data.title).toBe('card\nsecond line');
    expect(item.data.titleRaw).toBe('card\nsecond line');
    expect(item.data.blockId).toBe('a1b2');
  });

  it('dedents multi-line cards (spaces and tabs)', async () => {
    const { board: b } = await loadBoard(
      board('kanban-starlane: board', '## L\n\n- [ ] one\n    two\n- [ ] three\n\tfour')
    );

    expect(summarize(b).lanes[0].items).toEqual(['one\ntwo', 'three\nfour']);
  });

  it('parses an empty task as an empty title', async () => {
    const { board: b } = await loadBoard(board('kanban-starlane: board', '## L\n\n- [ ] '));
    expect(summarize(b).lanes[0].items).toEqual(['']);
  });

  it('collects tags, sorted', async () => {
    const { board: b } = await loadBoard(
      board('kanban-starlane: board', '## L\n\n- [ ] a #zeta and #alpha/beta')
    );

    expect(b.children[0].children[0].data.metadata.tags).toEqual(['#alpha/beta', '#zeta']);
  });

  it('collects tags at the start of a continuation line', async () => {
    const { board: b } = await loadBoard(
      board('kanban-starlane: board', '## L\n\n- [ ] a\n\t#one\n- [ ] b\n    #two and#not')
    );

    expect(b.children[0].children.map((i) => i.data.metadata.tags)).toEqual([['#one'], ['#two']]);
  });

  it('renders a card with a block id and a tag on the next line', async () => {
    const md = board(
      'kanban-starlane: board',
      '## L\n\n- [ ] Легкое планирование ^mmwuwm\n\t#compute'
    );

    for (const moveTags of [false, true]) {
      const settings = `{"kanban-starlane":"board","move-tags":${moveTags}}`;
      const { board: b, view } = await loadBoard(
        md.replace('{"kanban-starlane":"board"}', settings)
      );
      const item = b.children[0].children[0];

      expect(item.data.title).toBe(
        moveTags ? 'Легкое планирование' : 'Легкое планирование\n#compute'
      );
      expect(item.data.metadata.tags).toEqual(['#compute']);
      expect(view.data).toContain('- [ ] Легкое планирование ^mmwuwm\n\t#compute\n');
    }
  });

  it('parses dates and times with the default triggers and formats', async () => {
    const { board: b } = await loadBoard(
      board(
        'kanban-starlane: board',
        '## L\n\n- [ ] a @{2024-03-05} @@{10:30}\n- [ ] b @[[2024-03-06]]'
      )
    );
    const [a, c] = b.children[0].children;

    expect(a.data.metadata.dateStr).toBe('2024-03-05');
    expect(a.data.metadata.timeStr).toBe('10:30');
    expect(a.data.metadata.time?.toISOString()).toBe('2024-03-05T10:30:00.000Z');
    expect(c.data.metadata.dateStr).toBe('2024-03-06');
  });

  it('honours custom date/time triggers and formats from board settings', async () => {
    const md = board(
      'kanban-starlane: board',
      '## L\n\n- [ ] a !{05.03.2024} !!{9pm}',
      '{"kanban-starlane":"board","date-trigger":"!","time-trigger":"!!","date-format":"DD.MM.YYYY","time-format":"ha"}'
    );
    const { board: b } = await loadBoard(md);
    const item = b.children[0].children[0];

    expect(item.data.metadata.dateStr).toBe('05.03.2024');
    expect(item.data.metadata.date?.format('YYYY-MM-DD')).toBe('2024-03-05');
    expect(item.data.metadata.time?.format('HH:mm')).toBe('21:00');
  });

  it('resolves wiki links against the vault', async () => {
    const { board: b } = await loadBoard(
      board('kanban-starlane: board', '## L\n\n- [ ] see [[Note]]'),
      {
        files: { 'Note.md': {} },
      }
    );

    expect(b.children[0].children[0].data.metadata.file?.path).toBe('Note.md');
  });

  it('does not fail on a markdown embed of a missing file', async () => {
    const { board: b } = await loadBoard(
      board('kanban-starlane: board', '## L\n\n- [ ] see ![img](Missing.md)')
    );

    expect(b.data.errors).toEqual([]);
    expect(summarize(b).lanes[0].items).toEqual(['see ![img](Missing.md)']);
  });

  it('keeps only the last link/embed as the card file (inherited quirk)', async () => {
    const { board: b } = await loadBoard(
      board('kanban-starlane: board', '## L\n\n- [ ] [[Note]] and ![[pic.png]]'),
      { files: { 'Note.md': {}, 'pic.png': {} } }
    );

    expect(b.children[0].children[0].data.metadata.fileAccessor).toMatchObject({
      target: 'pic.png',
      isEmbed: true,
    });
  });
});

describe('move-* settings', () => {
  const body = '## L\n\n- [ ] Task #tag @{2024-03-05}';

  it('keeps tags and dates in the rendered title by default', async () => {
    const { board: b } = await loadBoard(board('kanban-starlane: board', body));
    const { title } = b.children[0].children[0].data;

    expect(title).toContain('#tag');
    expect(title).toContain('data-date=');
  });

  it('removes tags and dates from the rendered title when moved to the footer', async () => {
    const { board: b } = await loadBoard(
      board(
        'kanban-starlane: board',
        body,
        '{"kanban-starlane":"board","move-tags":true,"move-dates":true}'
      )
    );
    const { title, titleRaw } = b.children[0].children[0].data;

    expect(title).toBe('Task');
    expect(titleRaw).toBe('Task #tag @{2024-03-05}');
  });
});

describe('settings and frontmatter', () => {
  it('reads settings from the footer code block', async () => {
    const { board: b } = await loadBoard(readFixture('boards/full-featured.md'), {
      files: { 'Some Note.md': {}, 'image.png': {} },
    });

    expect(b.data.settings).toMatchObject({
      'kanban-starlane': 'board',
      'lane-width': 300,
      'show-checkboxes': true,
    });
  });

  it('treats the legacy "basic" view as "board"', async () => {
    const { board: b } = await loadBoard(board('kanban-starlane: basic', '## L'));
    expect(b.data.settings['kanban-starlane']).toBe('board');
  });

  it('moves setting keys found in frontmatter into the settings footer on save', async () => {
    const md = '---\nkanban-starlane: board\nlane-width: 300\ncustom: kept\n---\n\n## L\n';
    const { toMarkdown } = await loadBoard(md);
    const out = toMarkdown();

    expect(out).toContain('custom: kept');
    expect(out).not.toMatch(/^lane-width:/m);
    expect(out).toContain('"lane-width":300');
  });

  it('reports malformed frontmatter as a board error', async () => {
    const { board: b } = await loadBoard('--\nkanban-starlane: board\n---\n\n## L\n');
    expect(b.data.errors.length).toBeGreaterThan(0);
  });

  it('reports malformed settings JSON as a board error', async () => {
    const { board: b } = await loadBoard(board('kanban-starlane: board', '## L', '{not json'));
    expect(b.data.errors.length).toBeGreaterThan(0);
  });
});

describe('serialization', () => {
  it('indents multi-line cards with tabs when the vault uses tabs', async () => {
    const md = board('kanban-starlane: board', '## L\n\n- [ ] one\n    two');
    const { toMarkdown } = await loadBoard(md, { vaultConfig: { useTab: true } });

    expect(toMarkdown()).toContain('- [ ] one\n\ttwo');
  });

  it('writes lane <br> breaks and WIP limits back', async () => {
    const { toMarkdown } = await loadBoard(board('kanban-starlane: board', '## A<br>B (2)'));
    expect(toMarkdown()).toContain('## A<br>B (2)');
  });
});

describe('card history block', () => {
  it('reads the history by block id and keeps lanes and archive intact', async () => {
    const { board: b } = await loadBoard(readFixture('boards/card-history.md'));

    expect(summarize(b).lanes.map((l) => l.items)).toEqual([
      ['Write report', 'No history yet'],
      [],
    ]);
    expect(summarize(b).archive).toEqual(['Old card']);
    expect(Object.keys(b.data.history)).toEqual(['k3f9a2', 'm1x2c3']);
    expect(b.data.history.k3f9a2[1]).toEqual({ at: '2026-09-25T18:10:00+03:00', type: 'edited' });
  });

  it('keeps an unreadable history block as it is', async () => {
    const md = readFixture('boards/card-history.md').replace('"k3f9a2":[', '"k3f9a2":[[');
    const { board: b, toMarkdown } = await loadBoard(md);

    expect(b.data.errors).toEqual([]);
    expect(b.data.history).toBeUndefined();
    expect(toMarkdown()).toBe(md);
  });

  it('keeps a history block of the wrong shape as it is', async () => {
    const md = readFixture('boards/card-history.md').replace(
      /"m1x2c3":\[.*\]\n/,
      '"m1x2c3":"not events"\n'
    );
    const { board: b, toMarkdown } = await loadBoard(md);

    expect(b.data.history).toBeUndefined();
    expect(b.data.historyRaw).toContain('"not events"');
    expect(toMarkdown()).toBe(md);
  });

  it('never reads the history block as settings', async () => {
    const md = readFixture('boards/card-history.md').replace(
      /\n\n%% kanban-starlane:settings[\s\S]*$/,
      ''
    );
    const { board: b, toMarkdown } = await loadBoard(md);

    expect(b.data.errors).toEqual([]);
    expect(Object.keys(b.data.settings)).toEqual(['kanban-starlane']);
    expect(toMarkdown()).toContain(
      '\n%% kanban-starlane:settings\n```\n{"kanban-starlane":"board"}\n```\n%%'
    );
  });

  it('keeps the history when the file is re-read', async () => {
    const md = readFixture('boards/card-history.md');
    const { stateManager, view } = await loadBoard(md);

    view.data = md.replace('"type":"edited"}', '"type":"edited"},{"at":"x","type":"edited"}');
    await stateManager.reparseBoardFromMd();

    expect(stateManager.state.data.history.k3f9a2).toHaveLength(3);
    expect(stateManager.state.data.history.m1x2c3).toHaveLength(3);
  });
});
