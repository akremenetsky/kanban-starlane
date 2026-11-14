import { moveEntity, removeEntity } from 'src/dnd/util/data';
import { Board, Item } from 'src/model/types';
import { StateManager } from 'src/state/StateManager';
import { getBoardModifiers } from 'src/state/boardModifiers';
import {
  RELATION_KINDS,
  activeBlockers,
  addRelation,
  removeRelation,
  resolveRelations,
} from 'src/state/cardRelations';
import { describe, expect, it } from 'vitest';

import { board, readFixture } from '../../setup/fixtures';
import { loadBoard } from '../../setup/harness';

const md = board(
  'kanban-starlane: board',
  '## Todo\n\n- [ ] one\n- [ ] two\n- [ ] three\n\n## Done\n\n**Complete**\n- [x] four'
);

const card = (b: Board, lane: number, index: number): Item =>
  lane < 0 ? b.data.archive[index] : b.children[lane].children[index];

/** Relations of a card as `label → title` strings, for readable assertions. */
function summary(b: Board, item: Item) {
  return resolveRelations(b, item).map(
    (r) =>
      `${r.outgoing ? '' : '<'}${r.type} ${r.other.data.title}${r.archived ? ' (archived)' : ''}`
  );
}

const blocks = { type: 'blocks', outgoing: true } as const;
const blockedBy = { type: 'blocks', outgoing: false } as const;

function modifiers(stateManager: StateManager) {
  return getBoardModifiers({} as any, stateManager);
}

describe('card relations: file format', () => {
  it('reads the relations block and resolves both sides', async () => {
    const { board: b } = await loadBoard(readFixture('boards/card-relations.md'));

    expect(summary(b, card(b, 0, 0))).toEqual([
      'blocks Export to CSV',
      'relates-to Old spike (archived)',
      '<blocks Design the importer',
    ]);
    expect(summary(b, card(b, 0, 1))).toEqual(['<blocks Import from Trello']);
    // relates-to reads the same from both sides.
    expect(summary(b, card(b, -1, 0))).toEqual(['relates-to Import from Trello']);
    expect(summary(b, card(b, 0, 2))).toEqual([]);
  });

  it('keeps a relations block of the wrong shape as it is', async () => {
    const md = readFixture('boards/card-relations.md').replace(
      /"d4s1gn":\[.*\]\n/,
      '"d4s1gn":"not relations"\n'
    );
    const { board: b, toMarkdown } = await loadBoard(md);

    expect(b.data.relations).toBeUndefined();
    expect(b.data.relationsRaw).toContain('"not relations"');
    expect(toMarkdown()).toBe(md);
  });

  it('never reads the relations block as settings or lane text', async () => {
    const md = readFixture('boards/card-relations.md')
      .replace(/\n\n%% kanban-starlane:settings[\s\S]*$/, '')
      .replace(/\n\n\*\*\*\n\n## Archive\n\n- \[x\] Old spike \^s9p1ke/, '');
    const { board: b, toMarkdown } = await loadBoard(md);

    expect(b.data.errors).toEqual([]);
    expect(Object.keys(b.data.settings)).toEqual(['kanban-starlane']);
    expect(b.children[1].data.description).toBeUndefined();
    expect(toMarkdown()).toContain(
      '%%\n\n%% kanban-starlane:settings\n```\n{"kanban-starlane":"board"}'
    );
  });

  it('skips relations to missing cards and of unknown types, and keeps them in the file', async () => {
    const md = readFixture('boards/card-relations.md').replace(
      '"d4s1gn":[{"type":"blocks","card":"m7p2q1"}]',
      '"d4s1gn":[{"type":"blocks","card":"gone00"},{"type":"mentors","card":"m7p2q1"}]'
    );
    const { board: b, toMarkdown } = await loadBoard(md);

    expect(summary(b, card(b, 1, 0))).toEqual([]);
    expect(summary(b, card(b, 0, 0))).toEqual([
      'blocks Export to CSV',
      'relates-to Old spike (archived)',
    ]);
    expect(toMarkdown()).toBe(md);
  });

  it('writes the block between history and settings', async () => {
    const { stateManager, view } = await loadBoard(md);
    // A new card gets history, so both blocks are written.
    modifiers(stateManager).appendItems([0, 3], [stateManager.getNewItem('new', ' ')]);
    const b = stateManager.state;
    stateManager.setState(addRelation(b, card(b, 0, 0), blocks, card(b, 0, 1)));

    const one = card(stateManager.state, 0, 0).data.blockId;
    const two = card(stateManager.state, 0, 1).data.blockId;
    expect(view.data).toMatch(
      new RegExp(
        '\\n%%\\n\\n%% kanban-starlane:relations\\n```\\n\\{\\n' +
          `"${one}":\\[\\{"type":"blocks","card":"${two}"\\}\\]` +
          '\\n\\}\\n```\\n%%\\n\\n%% kanban-starlane:settings'
      )
    );
    expect(view.data.indexOf('kanban-starlane:history')).toBeLessThan(
      view.data.indexOf('kanban-starlane:relations')
    );
  });
});

describe('card relations: editing', () => {
  it('stores an incoming kind on the other card', async () => {
    const { board: b } = await loadBoard(md);
    const next = addRelation(b, card(b, 0, 0), blockedBy, card(b, 0, 1));

    const one = card(next, 0, 0);
    const two = card(next, 0, 1);
    expect(next.data.relations).toEqual({
      [two.data.blockId!]: [{ type: 'blocks', card: one.data.blockId }],
    });
    expect(summary(next, one)).toEqual(['<blocks two']);
    expect(summary(next, two)).toEqual(['blocks one']);
  });

  it('gives block ids that are free on the board and keeps existing ones', async () => {
    const { board: b } = await loadBoard(
      board('kanban-starlane: board', '## Todo\n\n- [ ] one ^aaaaaa\n- [ ] two')
    );
    const next = addRelation(b, card(b, 0, 0), blocks, card(b, 0, 1));

    expect(card(next, 0, 0).data.blockId).toBe('aaaaaa');
    expect(card(next, 0, 1).data.blockId).toMatch(/^[a-z0-9]{6}$/);
    expect(card(next, 0, 1).data.blockId).not.toBe('aaaaaa');
  });

  it('does not add the same relation twice, nor a card to itself', async () => {
    const { board: b } = await loadBoard(md);
    const once = addRelation(b, card(b, 0, 0), blocks, card(b, 0, 1));
    const relatesTo = { type: 'relates-to', outgoing: true } as const;

    expect(addRelation(once, card(once, 0, 0), blocks, card(once, 0, 1))).toBe(once);
    expect(addRelation(once, card(once, 0, 1), blockedBy, card(once, 0, 0))).toBe(once);
    expect(addRelation(b, card(b, 0, 0), blocks, card(b, 0, 0))).toBe(b);

    const related = addRelation(once, card(once, 0, 0), relatesTo, card(once, 0, 1));
    expect(addRelation(related, card(related, 0, 1), relatesTo, card(related, 0, 0))).toBe(related);
  });

  it('removes a relation and drops the empty entry', async () => {
    const { board: b } = await loadBoard(md);
    const next = addRelation(b, card(b, 0, 0), blocks, card(b, 0, 1));
    const [r] = resolveRelations(next, card(next, 0, 1));

    const removed = removeRelation(next, r.owner, r.relation);
    expect(removed.data.relations).toEqual({});
    expect(summary(removed, card(removed, 0, 0))).toEqual([]);
  });

  it('offers every type from both sides, relates-to once', () => {
    expect(RELATION_KINDS.map((k) => `${k.outgoing ? '' : '<'}${k.type}`)).toEqual([
      'blocks',
      '<blocks',
      'relates-to',
      'duplicates',
      '<duplicates',
      'causes',
      '<causes',
      'depends-on',
      '<depends-on',
    ]);
  });
});

describe('card relations: blocked state', () => {
  it('a card is blocked while its blocker is open', async () => {
    const { stateManager } = await loadBoard(md);
    let b = stateManager.state;
    b = addRelation(b, card(b, 0, 0), blocks, card(b, 0, 1));
    stateManager.setState(b);

    expect(
      activeBlockers(stateManager.state, card(stateManager.state, 0, 1)).map((i) => i.data.title)
    ).toEqual(['one']);
    // The blocking card itself is not blocked.
    expect(activeBlockers(stateManager.state, card(stateManager.state, 0, 0))).toEqual([]);
  });

  it('a done or archived blocker does not block', async () => {
    const { stateManager } = await loadBoard(md);
    let b = stateManager.state;
    b = addRelation(b, card(b, 1, 0), blocks, card(b, 0, 1));
    b = addRelation(b, card(b, 0, 2), blocks, card(b, 0, 0));
    stateManager.setState(b);

    // "four" is checked.
    expect(activeBlockers(stateManager.state, card(stateManager.state, 0, 1))).toEqual([]);

    modifiers(stateManager).archiveItem([0, 2]);
    const s = stateManager.state;
    expect(activeBlockers(s, card(s, 0, 0))).toEqual([]);
    expect(summary(s, card(s, 0, 0))).toEqual(['<blocks three (archived)']);
  });
});

describe('card relations: cards leaving the board', () => {
  it('deleting a card deletes its relations on both sides', async () => {
    const { stateManager, view } = await loadBoard(md);
    let b = stateManager.state;
    b = addRelation(b, card(b, 0, 0), blocks, card(b, 0, 1));
    b = addRelation(b, card(b, 0, 2), blocks, card(b, 0, 0));
    b = addRelation(b, card(b, 0, 1), blocks, card(b, 0, 2));
    stateManager.setState(b);

    stateManager.setState((board) => removeEntity(board, [0, 0]));

    const s = stateManager.state;
    expect(summary(s, card(s, 0, 0))).toEqual(['blocks three']);
    expect(Object.keys(s.data.relations!)).toHaveLength(1);
    expect(view.data).toContain('kanban-starlane:relations');
  });

  it('a duplicate does not inherit relations', async () => {
    const { stateManager } = await loadBoard(md);
    const b = stateManager.state;
    stateManager.setState(addRelation(b, card(b, 0, 0), blocks, card(b, 0, 1)));

    modifiers(stateManager).duplicateEntity([0, 0]);

    // The copy is inserted before the original.
    const s = stateManager.state;
    expect(summary(s, card(s, 0, 1))).toEqual(['blocks two']);
    expect(summary(s, card(s, 0, 0))).toEqual([]);
  });

  it('keeps relations of a card that stays, with card history off', async () => {
    const { stateManager } = await loadBoard(
      board(
        'kanban-starlane: board',
        '## Todo\n\n- [ ] one\n- [ ] two\n\n## Done\n\n- [ ] three',
        '{"kanban-starlane":"board","card-history":false}'
      )
    );
    const b = stateManager.state;
    stateManager.setState(addRelation(b, card(b, 0, 0), blocks, card(b, 0, 1)));

    const item = card(stateManager.state, 0, 0);
    modifiers(stateManager).updateItem([0, 0], stateManager.updateItemContent(item, 'one edited'));
    stateManager.setState((board) => moveEntity(board, [0, 0], [1, 0]));

    const s = stateManager.state;
    expect(summary(s, card(s, 1, 0))).toEqual(['blocks two']);
  });

  it('keeps the block id and history of a card that got its id after the menu opened', async () => {
    const { stateManager } = await loadBoard(md);
    const stale = card(stateManager.state, 0, 0);
    // An edit gives the card a block id and a history entry.
    modifiers(stateManager).updateItem([0, 0], stateManager.updateItemContent(stale, 'one!'));
    const id = card(stateManager.state, 0, 0).data.blockId;
    expect(id).toBeTruthy();

    modifiers(stateManager).addRelation(stale, blocks, card(stateManager.state, 0, 1));

    const s = stateManager.state;
    expect(card(s, 0, 0).data.blockId).toBe(id);
    expect(s.data.history?.[id!]).toHaveLength(1);
    expect(summary(s, card(s, 0, 0))).toEqual(['blocks two']);
  });

  it('a re-read of the file never drops relations', async () => {
    const fixture = readFixture('boards/card-relations.md');
    const { stateManager } = await loadBoard(fixture);

    // The card was removed by hand in the file: the relation is just not shown.
    stateManager.setState(
      stateManager.getParsedBoard(fixture.replace('- [ ] Export to CSV ^k3f9a2\n', '')),
      false
    );
    expect(stateManager.state.data.relations?.m7p2q1).toHaveLength(2);
  });
});
