import { Item } from 'src/model/types';
import {
  LaneEntry,
  cardRef,
  mergeLane,
  readLinkedLanes,
  renameLinkedLane,
  renameLinkedSourceLane,
  retargetLinkedFile,
  setLaneSources,
} from 'src/state/linkedLanes';
import { describe, expect, it } from 'vitest';

const card = (title: string, blockId?: string) =>
  ({
    id: title,
    type: 'item',
    accepts: [],
    children: [],
    data: { titleRaw: title, blockId },
  }) as unknown as Item;

const W = 'Boards/Work.md';
const P = 'Boards/Personal.md';

const titles = (entries: LaneEntry[]) =>
  entries.map((e) =>
    e.source ? `${e.source === W ? 'W' : 'P'}:${e.item.data.titleRaw}` : e.item.data.titleRaw
  );

describe('mergeLane', () => {
  const own = [card('o1'), card('o2')];

  it('shows own cards first, then each linked lane in turn, when there is no order', () => {
    const merged = mergeLane(own, [
      { file: W, items: [card('a'), card('b')] },
      { file: P, items: [card('p')] },
    ]);

    expect(titles(merged)).toEqual(['o1', 'o2', 'W:a', 'W:b', 'P:p']);
  });

  it('follows the stored order', () => {
    const merged = mergeLane(
      own,
      [{ file: W, items: [card('a', 'a'), card('b', 'b')] }],
      [cardRef(W, 'a'), 'self', 'self', cardRef(W, 'b')]
    );

    expect(titles(merged)).toEqual(['W:a', 'o1', 'o2', 'W:b']);
  });

  it('keeps the linked board file order when it was reordered there', () => {
    // Stored: b before a. Work.md now has a before b: the slots stay, the cards follow the file.
    const merged = mergeLane(
      own,
      [{ file: W, items: [card('a', 'a'), card('b', 'b')] }],
      [cardRef(W, 'b'), 'self', cardRef(W, 'a'), 'self']
    );

    expect(titles(merged)).toEqual(['W:a', 'o1', 'W:b', 'o2']);
  });

  it('puts an unknown linked card right after its predecessor in its file', () => {
    const merged = mergeLane(
      own,
      [{ file: W, items: [card('a', 'a'), card('x'), card('b', 'b')] }],
      [cardRef(W, 'a'), 'self', cardRef(W, 'b'), 'self']
    );

    expect(titles(merged)).toEqual(['W:a', 'W:x', 'o1', 'W:b', 'o2']);
  });

  it('puts an unknown first card of a file before the first known one', () => {
    const merged = mergeLane(
      own,
      [{ file: W, items: [card('x'), card('a', 'a')] }],
      ['self', cardRef(W, 'a'), 'self']
    );

    expect(titles(merged)).toEqual(['o1', 'W:x', 'W:a', 'o2']);
  });

  it('appends cards of a linked lane that has no stored position at all', () => {
    const merged = mergeLane(own, [{ file: W, items: [card('a'), card('b')] }], ['self', 'self']);

    expect(titles(merged)).toEqual(['o1', 'o2', 'W:a', 'W:b']);
  });

  it('drops references to cards that are gone', () => {
    const merged = mergeLane(
      own,
      [{ file: W, items: [card('b', 'b')] }],
      [cardRef(W, 'gone'), 'self', cardRef(W, 'b'), 'self']
    );

    expect(titles(merged)).toEqual(['o1', 'W:b', 'o2']);
  });

  it('appends own cards that have no slot and ignores extra slots', () => {
    expect(titles(mergeLane([card('o1'), card('o2'), card('o3')], [], ['self']))).toEqual([
      'o1',
      'o2',
      'o3',
    ]);
    expect(titles(mergeLane([card('o1')], [], ['self', 'self', 'self']))).toEqual(['o1']);
  });

  it('ignores references to boards that are no longer linked and malformed tokens', () => {
    const merged = mergeLane(own, [], [cardRef(P, 'p'), 'self', 42 as any, 'nonsense', 'self']);

    expect(titles(merged)).toEqual(['o1', 'o2']);
  });

  it('keeps two linked lanes of the same board apart', () => {
    const merged = mergeLane(
      [],
      [
        { file: W, items: [card('a', 'a'), card('b', 'b')] },
        { file: W, items: [card('c', 'c')] },
      ],
      [cardRef(W, 'c'), cardRef(W, 'b'), cardRef(W, 'a')]
    );

    // Slots of each lane keep their file order: a and b swap, c stays first.
    expect(titles(merged)).toEqual(['W:c', 'W:a', 'W:b']);
  });

  it('never shows a card twice', () => {
    const merged = mergeLane(
      own,
      [{ file: W, items: [card('a', 'a')] }],
      [cardRef(W, 'a'), cardRef(W, 'a'), 'self', 'self']
    );

    expect(titles(merged)).toEqual(['W:a', 'o1', 'o2']);
  });
});

describe('readLinkedLanes', () => {
  it('reads valid entries', () => {
    const value = {
      Doing: { sources: [{ file: W, lane: 'In progress' }], order: ['self', cardRef(W, 'a')] },
    };

    expect(readLinkedLanes({ 'linked-lanes': value })).toEqual(value);
  });

  it('tolerates missing and malformed data', () => {
    expect(readLinkedLanes({})).toEqual({});
    expect(readLinkedLanes({ 'linked-lanes': 'oops' as any })).toEqual({});
    expect(
      readLinkedLanes({
        'linked-lanes': {
          A: { sources: 'x' },
          B: { sources: [{ file: W }, { file: W, lane: 'Doing' }, null], order: ['self', 3] },
          C: null,
        } as any,
      })
    ).toEqual({ B: { sources: [{ file: W, lane: 'Doing' }], order: ['self'] } });
  });

  it('drops lanes without sources', () => {
    expect(readLinkedLanes({ 'linked-lanes': { A: { sources: [] } } })).toEqual({});
  });
});

describe('setLaneSources', () => {
  const linked = {
    Doing: {
      sources: [
        { file: W, lane: 'In progress' },
        { file: P, lane: 'Doing' },
      ],
      order: [cardRef(W, 'a'), 'self', cardRef(P, 'p')],
    },
  };

  it('adds a lane entry', () => {
    expect(setLaneSources({}, 'Todo', [{ file: W, lane: 'Todo' }])).toEqual({
      Todo: { sources: [{ file: W, lane: 'Todo' }] },
    });
  });

  it('drops order tokens of boards that are no longer linked', () => {
    expect(setLaneSources(linked, 'Doing', [{ file: W, lane: 'In progress' }])).toEqual({
      Doing: { sources: [{ file: W, lane: 'In progress' }], order: [cardRef(W, 'a'), 'self'] },
    });
  });

  it('removes the lane entry when no sources are left', () => {
    expect(setLaneSources(linked, 'Doing', [])).toEqual({});
  });
});

describe('renameLinkedLane', () => {
  const linked = { Doing: { sources: [{ file: W, lane: 'Doing' }] } };

  it('moves the entry to the new title', () => {
    expect(renameLinkedLane(linked, 'Doing', 'In progress')).toEqual({
      'In progress': linked.Doing,
    });
  });

  it('does not overwrite an existing entry', () => {
    const both = { ...linked, Other: { sources: [{ file: P, lane: 'x' }] } };
    expect(renameLinkedLane(both, 'Doing', 'Other')).toBe(both);
  });
});

describe('following renames of linked boards', () => {
  const linked = {
    Doing: {
      sources: [
        { file: W, lane: 'In progress' },
        { file: P, lane: 'Doing' },
      ],
      order: [cardRef(W, 'a'), 'self', cardRef(P, 'p')],
    },
    Todo: { sources: [{ file: P, lane: 'Todo' }] },
  };

  it('updates sources and order tokens when a board file moves', () => {
    const next = retargetLinkedFile(linked, W, 'Archive/Work.md');

    expect(next.Doing.sources[0]).toEqual({ file: 'Archive/Work.md', lane: 'In progress' });
    expect(next.Doing.order).toEqual([cardRef('Archive/Work.md', 'a'), 'self', cardRef(P, 'p')]);
    expect(next.Todo).toBe(linked.Todo);
  });

  it('returns the same object when the moved file is not linked', () => {
    expect(retargetLinkedFile(linked, 'Other.md', 'Moved.md')).toBe(linked);
  });

  it('updates the lane title of a linked board', () => {
    const next = renameLinkedSourceLane(linked, W, 'In progress', 'Doing now');

    expect(next.Doing.sources[0]).toEqual({ file: W, lane: 'Doing now' });
    expect(next.Doing.order).toBe(linked.Doing.order);
    expect(renameLinkedSourceLane(linked, W, 'Nope', 'x')).toBe(linked);
  });
});
