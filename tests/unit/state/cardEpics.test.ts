import { removeEntity } from 'src/dnd/util/data';
import { Board, Item } from 'src/model/types';
import { StateManager } from 'src/state/StateManager';
import { getBoardModifiers } from 'src/state/boardModifiers';
import {
  addToEpic,
  boardEpics,
  epicOfCard,
  epicOfMember,
  epicProgress,
  markEpic,
  nextEpicColor,
  removeFromEpic,
  setEpicColor,
  unmarkEpic,
} from 'src/state/cardEpics';
import { addRelation } from 'src/state/cardRelations';
import { describe, expect, it } from 'vitest';

import { board, readFixture } from '../../setup/fixtures';
import { loadBoard } from '../../setup/harness';

const md = board(
  'kanban-starlane: board',
  '## Todo\n\n- [ ] one\n- [ ] two #size/M\n- [ ] three\n\n## Done\n\n**Complete**\n- [x] four'
);

const weights = { XS: 1, S: 2, M: 3, L: 5, XL: 8 };

const card = (b: Board, lane: number, index: number): Item =>
  lane < 0 ? b.data.archive[index] : b.children[lane].children[index];

/** Titles of an epic's members, for readable assertions. */
function members(b: Board, epic: Item) {
  return epicOfCard(b, epic)?.members.map(
    (m) => `${m.item.data.title}${m.archived ? ' (archived)' : ''}`
  );
}

function modifiers(stateManager: StateManager) {
  return getBoardModifiers({} as any, stateManager);
}

describe('epics: file format', () => {
  it('reads the epics block and resolves epic and members', async () => {
    const { board: b } = await loadBoard(readFixture('boards/card-epics.md'));
    const epic = card(b, 0, 0);

    expect(epicOfCard(b, epic)?.color).toBe('green');
    expect(members(b, epic)).toEqual([
      'Parse CSV',
      'Map fields',
      'Design the importer',
      'Old spike (archived)',
    ]);
    expect(epicOfMember(b, card(b, 0, 1))?.item).toBe(epic);
    expect(epicOfMember(b, card(b, 0, 3))).toBeUndefined();
    expect(epicOfCard(b, card(b, 0, 1))).toBeUndefined();
  });

  it('counts checked and archived cards as done, by number and by weight', async () => {
    const { board: b } = await loadBoard(readFixture('boards/card-epics.md'));

    expect(epicProgress(epicOfCard(b, card(b, 0, 0))!, weights)).toEqual({
      done: 2,
      total: 4,
      weightDone: 5,
      weightTotal: 10,
      bySize: { M: { done: 0, total: 1 }, S: { done: 0, total: 1 }, L: { done: 1, total: 1 } },
    });
  });

  it('keeps an epics block of the wrong shape as it is', async () => {
    const md = readFixture('boards/card-epics.md').replace('"cards":[', '"cards":"no",[');
    const { board: b, toMarkdown } = await loadBoard(md);

    expect(b.data.epics).toBeUndefined();
    expect(b.data.epicsRaw).toContain('"cards":"no"');
    expect(toMarkdown()).toBe(md);
    expect(markEpic(b, card(b, 0, 3))).toBe(b);
  });

  it('never reads the epics block as settings or lane text', async () => {
    const md = readFixture('boards/card-epics.md')
      .replace(/\n\n%% kanban-starlane:settings[\s\S]*$/, '')
      .replace(/\n\n\*\*\*\n\n## Archive\n\n- \[x\] Old spike \^s9p1ke/, '');
    const { board: b, toMarkdown } = await loadBoard(md);

    expect(b.data.errors).toEqual([]);
    expect(Object.keys(b.data.settings)).toEqual(['kanban-starlane']);
    expect(b.children[1].data.description).toBeUndefined();
    expect(toMarkdown()).toContain('%%\n\n%% kanban-starlane:settings');
  });

  it('skips missing cards, a second epic of a card and epics as members, and keeps the file', async () => {
    const md = readFixture('boards/card-epics.md').replace(
      '"cards":["k3f9a2","m7p2q1","d4s1gn","s9p1ke"]}',
      '"cards":["gone00","k3f9a2"]},\n"m7p2q1":{"color":"nope","cards":["k3f9a2","ep1mpt","d4s1gn"]}'
    );
    const { board: b, toMarkdown } = await loadBoard(md);

    expect(members(b, card(b, 0, 0))).toEqual(['Parse CSV']);
    expect(members(b, card(b, 0, 2))).toEqual(['Design the importer']);
    // An unknown colour is shown as the first one.
    expect(epicOfCard(b, card(b, 0, 2))?.color).toBe('blue');
    expect(toMarkdown()).toBe(md);
  });

  it('writes the block after relations and before settings', async () => {
    const { stateManager, view } = await loadBoard(md);
    let b = stateManager.state;
    b = addRelation(b, card(b, 0, 0), { type: 'blocks', outgoing: true }, card(b, 0, 2));
    b = markEpic(b, card(b, 0, 0));
    b = addToEpic(b, card(b, 0, 0), card(b, 0, 2));
    stateManager.setState(b);

    const epic = card(stateManager.state, 0, 0).data.blockId;
    const member = card(stateManager.state, 0, 2).data.blockId;
    expect(view.data).toContain(
      `%%\n\n%% kanban-starlane:epics\n\`\`\`\n{\n"${epic}":{"color":"blue","cards":["${member}"]}\n}\n\`\`\`\n%%\n\n%% kanban-starlane:settings`
    );
    expect(view.data.indexOf('kanban-starlane:relations')).toBeLessThan(
      view.data.indexOf('kanban-starlane:epics')
    );
  });
});

describe('epics: editing', () => {
  it('marks an epic: a block id, the next colour, no members', async () => {
    const { board: b } = await loadBoard(md);
    const next = markEpic(b, card(b, 0, 0));
    const id = card(next, 0, 0).data.blockId!;

    expect(id).toMatch(/^[a-z0-9]{6}$/);
    expect(next.data.epics).toEqual({ [id]: { color: 'blue', cards: [] } });
    expect(markEpic(next, card(next, 0, 0))).toBe(next);
  });

  it('gives each new epic the least used colour', async () => {
    const { board: b } = await loadBoard(md);
    let next = markEpic(b, card(b, 0, 0));
    next = markEpic(next, card(next, 0, 1));
    expect(boardEpics(next).map((e) => e.color)).toEqual(['blue', 'green']);

    next = setEpicColor(next, card(next, 0, 0), 'green');
    expect(nextEpicColor(next)).toBe('blue');
  });

  it('a card is in one epic: adding it to another moves it', async () => {
    const { board: b } = await loadBoard(md);
    let next = markEpic(b, card(b, 0, 0));
    next = markEpic(next, card(next, 0, 1));
    next = addToEpic(next, card(next, 0, 0), card(next, 0, 2));
    next = addToEpic(next, card(next, 0, 1), card(next, 0, 2));

    expect(members(next, card(next, 0, 0))).toEqual([]);
    expect(members(next, card(next, 0, 1))).toEqual(['three']);
    expect(addToEpic(next, card(next, 0, 1), card(next, 0, 2))).toBe(next);
  });

  it('an epic never joins an epic, nor itself; making a member an epic takes it out', async () => {
    const { board: b } = await loadBoard(md);
    let next = markEpic(b, card(b, 0, 0));
    next = addToEpic(next, card(next, 0, 0), card(next, 0, 1));

    expect(addToEpic(next, card(next, 0, 0), card(next, 0, 0))).toBe(next);
    const other = markEpic(next, card(next, 0, 2));
    expect(addToEpic(other, card(other, 0, 0), card(other, 0, 2))).toBe(other);

    const promoted = markEpic(next, card(next, 0, 1));
    expect(members(promoted, card(promoted, 0, 0))).toEqual([]);
    expect(epicOfCard(promoted, card(promoted, 0, 1))).toBeDefined();
  });

  it('removes a member, removes an epic, changes the colour', async () => {
    const { board: b } = await loadBoard(md);
    let next = markEpic(b, card(b, 0, 0));
    next = addToEpic(next, card(next, 0, 0), card(next, 0, 2));

    const removed = removeFromEpic(next, card(next, 0, 2));
    expect(members(removed, card(removed, 0, 0))).toEqual([]);

    const colored = setEpicColor(next, card(next, 0, 0), 'purple');
    expect(epicOfCard(colored, card(colored, 0, 0))?.color).toBe('purple');

    const plain = unmarkEpic(next, card(next, 0, 0));
    expect(plain.data.epics).toEqual({});
    expect(epicOfMember(plain, card(plain, 0, 2))).toBeUndefined();
  });

  it('making a sized card an epic removes its size tag', async () => {
    const { stateManager, view } = await loadBoard(md);
    modifiers(stateManager).markEpic([0, 1], card(stateManager.state, 0, 1));

    const epic = card(stateManager.state, 0, 1);
    expect(epic.data.metadata.size).toBeUndefined();
    expect(epicOfCard(stateManager.state, epic)).toBeDefined();
    expect(view.data).toContain(`- [ ] two ^${epic.data.blockId}\n`);
  });
});

describe('epics: cards leaving the board', () => {
  it('deleting a member or an epic removes it from the block', async () => {
    const { stateManager } = await loadBoard(md);
    let b = stateManager.state;
    b = markEpic(b, card(b, 0, 0));
    b = addToEpic(b, card(b, 0, 0), card(b, 0, 1));
    b = addToEpic(b, card(b, 0, 0), card(b, 0, 2));
    stateManager.setState(b);

    stateManager.setState((board) => removeEntity(board, [0, 1]));
    const s = stateManager.state;
    expect(members(s, card(s, 0, 0))).toEqual(['three']);

    stateManager.setState((board) => removeEntity(board, [0, 0]));
    expect(stateManager.state.data.epics).toEqual({});
  });

  it('a duplicate is in no epic and is no epic', async () => {
    const { stateManager } = await loadBoard(md);
    let b = stateManager.state;
    b = markEpic(b, card(b, 0, 0));
    b = addToEpic(b, card(b, 0, 0), card(b, 0, 2));
    stateManager.setState(b);

    modifiers(stateManager).duplicateEntity([0, 2]);
    modifiers(stateManager).duplicateEntity([0, 0]);
    const s = stateManager.state;
    // Copies are inserted before the originals.
    expect(epicOfCard(s, card(s, 0, 0))).toBeUndefined();
    expect(epicOfMember(s, card(s, 0, 3))).toBeUndefined();
    expect(members(s, card(s, 0, 1))).toEqual(['three']);
  });

  it('archiving a member keeps it, counted as done', async () => {
    const { stateManager } = await loadBoard(md);
    let b = stateManager.state;
    b = markEpic(b, card(b, 0, 0));
    b = addToEpic(b, card(b, 0, 0), card(b, 0, 2));
    stateManager.setState(b);

    modifiers(stateManager).archiveItem([0, 2]);
    const s = stateManager.state;
    const epic = epicOfCard(s, card(s, 0, 0))!;
    expect(members(s, card(s, 0, 0))).toEqual(['three (archived)']);
    expect(epicProgress(epic, weights)).toMatchObject({ done: 1, total: 1 });
  });

  it('a re-read of the file never drops epics', async () => {
    const fixture = readFixture('boards/card-epics.md');
    const { stateManager } = await loadBoard(fixture);

    stateManager.setState(
      stateManager.getParsedBoard(fixture.replace('- [ ] Map fields #size/S ^m7p2q1\n', '')),
      false
    );
    expect(stateManager.state.data.epics?.ep1mpt.cards).toHaveLength(4);
  });
});
