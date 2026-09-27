import { Nestable } from 'src/dnd/types';
import {
  appendEntities,
  getEntityFromPath,
  insertEntity,
  moveEntity,
  prependEntities,
  removeEntity,
  updateEntity,
} from 'src/dnd/util/data';
import { describe, expect, it } from 'vitest';

const node = (id: string, children: Nestable[] = []): Nestable =>
  ({ id, type: 'x', accepts: [], data: {}, children }) as Nestable;

// root -> [A: [a1, a2, a3], B: [b1]]
const tree = () =>
  node('root', [node('A', [node('a1'), node('a2'), node('a3')]), node('B', [node('b1')])]);

const ids = (n: Nestable) => n.children.map((c) => [c.id, c.children.map((cc: Nestable) => cc.id)]);

describe('board tree operations', () => {
  it('getEntityFromPath walks children by index', () => {
    expect(getEntityFromPath(tree(), [0, 1]).id).toBe('a2');
    expect(getEntityFromPath(tree(), []).id).toBe('root');
  });

  it('moves an item down within a lane', () => {
    expect(ids(moveEntity(tree(), [0, 0], [0, 2]))).toEqual([
      ['A', ['a2', 'a1', 'a3']],
      ['B', ['b1']],
    ]);
  });

  it('moves an item up within a lane', () => {
    expect(ids(moveEntity(tree(), [0, 2], [0, 0]))).toEqual([
      ['A', ['a3', 'a1', 'a2']],
      ['B', ['b1']],
    ]);
  });

  it('moves an item to another lane', () => {
    expect(ids(moveEntity(tree(), [0, 1], [1, 0]))).toEqual([
      ['A', ['a1', 'a3']],
      ['B', ['a2', 'b1']],
    ]);
  });

  it('moves a lane (destination index is counted before removal)', () => {
    expect(ids(moveEntity(tree(), [0], [1])).map(([id]) => id)).toEqual(['A', 'B']);
    expect(ids(moveEntity(tree(), [0], [2])).map(([id]) => id)).toEqual(['B', 'A']);
  });

  it('can replace the source with another entity while moving', () => {
    const moved = moveEntity(tree(), [0, 0], [1, 1], undefined, () => node('copy'));
    expect(ids(moved)).toEqual([
      ['A', ['copy', 'a2', 'a3']],
      ['B', ['b1', 'a1']],
    ]);
  });

  it('inserts, appends, prepends and removes', () => {
    expect(ids(insertEntity(tree(), [1, 1], [node('n')]))[1]).toEqual(['B', ['b1', 'n']]);
    // append/prepend take the path of any child slot in the target parent
    expect(ids(appendEntities(tree(), [1, 0], [node('n')]))[1]).toEqual(['B', ['b1', 'n']]);
    expect(ids(prependEntities(tree(), [1, 0], [node('n')]))[1]).toEqual(['B', ['n', 'b1']]);
    expect(ids(removeEntity(tree(), [0, 1]))[0]).toEqual(['A', ['a1', 'a3']]);
  });

  it('updates an entity immutably', () => {
    const before = tree();
    const after = updateEntity(before, [0, 1], { data: { $set: { title: 'x' } } });

    expect(getEntityFromPath(after, [0, 1]).data).toEqual({ title: 'x' });
    expect(getEntityFromPath(before, [0, 1]).data).toEqual({});
    expect(after.children[1]).toBe(before.children[1]);
  });
});
