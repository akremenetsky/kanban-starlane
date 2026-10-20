/** Sending a card to a linked board: targets and keeping the other cards where they are. */
import { removeEntity } from 'src/dnd/util/data';
import { Board } from 'src/model/types';
import { laneEntries, readLinkedLanes } from 'src/state/linkedLanes';
import {
  dropOwnSlot,
  linkedMoveTargets,
  ownCardPath,
  sendCardToLinkedBoard,
} from 'src/state/linkedMove';
import { describe, expect, it } from 'vitest';

import { board } from '../../setup/fixtures';
import { loadBoard } from '../../setup/harness';

const D2 = 'D2.md';
const D3 = 'D3.md';

async function setup(linkedLanes: object, order?: string[]) {
  const settings = {
    'kanban-starlane': 'board',
    'linked-lanes': { A: { ...linkedLanes, ...(order && { order }) } },
  };
  const d1 = (
    await loadBoard(
      board(
        'kanban-starlane: board',
        '## A\n\n- [ ] o0\n- [ ] o1\n- [ ] o2\n\n## B',
        JSON.stringify(settings)
      ),
      { path: 'D1.md' }
    )
  ).board;
  const other = async (path: string) =>
    (
      await loadBoard(
        board('kanban-starlane: board', '## A\n\n- [ ] x0 ^x0\n- [ ] x1 ^x1\n\n## Done'),
        { path }
      )
    ).board;
  const boards: Record<string, Board> = { [D2]: await other(D2), [D3]: await other(D3) };
  return { d1, getBoard: (f: string): Board | undefined => boards[f] };
}

const one = { sources: [{ file: D2, lane: 'A' }] };

describe('linkedMoveTargets', () => {
  it('lists the lanes the lane is linked with', async () => {
    const { d1, getBoard } = await setup({
      sources: [
        { file: D2, lane: 'A' },
        { file: D3, lane: 'Done' },
      ],
    });
    expect(linkedMoveTargets(d1, 0, getBoard)).toEqual([
      { file: D2, lane: 'A', laneIndex: 0 },
      { file: D3, lane: 'Done', laneIndex: 1 },
    ]);
  });

  it('is empty for a lane without links or with missing boards', async () => {
    const { d1, getBoard } = await setup(one);
    expect(linkedMoveTargets(d1, 1, getBoard)).toEqual([]);
    expect(linkedMoveTargets(d1, 0, () => undefined)).toEqual([]);
  });
});

describe('ownCardPath', () => {
  it('maps a combined position to the own file and refuses linked cards', async () => {
    const { d1, getBoard } = await setup(one, ['self', 'D2.md#^x0', 'self', 'self', 'D2.md#^x1']);
    expect(ownCardPath(d1, [0, 2], getBoard)).toEqual([0, 1]);
    expect(ownCardPath(d1, [0, 1], getBoard)).toBeNull();
  });
});

describe('dropOwnSlot', () => {
  it('keeps the other cards in place when an own card leaves', async () => {
    const order = ['self', 'self', 'D2.md#^x0', 'self', 'D2.md#^x1'];
    const { d1, getBoard } = await setup(one, order);
    const titles = (b: Board) => laneEntries(b, 0, getBoard).map((e) => e.item.data.titleRaw);
    expect(titles(d1)).toEqual(['o0', 'o1', 'x0', 'o2', 'x1']);

    // o1 leaves; its slot stays, so o2 would jump in front of x0.
    const left = removeEntity(d1, [0, 1]);
    expect(titles(left)).toEqual(['o0', 'o2', 'x0', 'x1']);

    const fixed = dropOwnSlot(left, [0, 1]);
    expect(titles(fixed)).toEqual(['o0', 'x0', 'o2', 'x1']);
    expect(readLinkedLanes(fixed.data.settings).A.order).toEqual([
      'self',
      'D2.md#^x0',
      'self',
      'D2.md#^x1',
    ]);
  });

  it('keeps places for the first own card too', async () => {
    const { d1, getBoard } = await setup(one, ['self', 'self', 'D2.md#^x0', 'self', 'D2.md#^x1']);
    const left = dropOwnSlot(removeEntity(d1, [0, 0]), [0, 0]);
    expect(laneEntries(left, 0, getBoard).map((e) => e.item.data.titleRaw)).toEqual([
      'o1',
      'x0',
      'o2',
      'x1',
    ]);
  });

  it('does nothing without a stored order', async () => {
    const { d1 } = await setup(one);
    expect(dropOwnSlot(d1, [0, 1])).toBe(d1);
  });
});

describe('sendCardToLinkedBoard', () => {
  const settings = JSON.stringify({
    'kanban-starlane': 'board',
    'linked-lanes': { A: { sources: [{ file: D2, lane: 'A' }] } },
  });
  const a = async () =>
    loadBoard(board('kanban-starlane: board', '## A\n\n- [ ] o0\n- [ ] o1\n\n## B', settings), {
      path: 'D1.md',
    });
  const b = async (lanes = '## B\n\n- [ ] x0\n\n## A\n\n- [ ] x1') =>
    loadBoard(board('kanban-starlane: board', lanes), { path: D2 });
  const titles = (bd: Board, lane: number) =>
    bd.children[lane].children.map((i) => i.data.titleRaw);
  const target = { file: D2, lane: 'A', laneIndex: 99 };

  it('moves the card to the end of the lane found by title and keeps its history', async () => {
    const src = await a();
    const dst = await b();
    expect(sendCardToLinkedBoard(src.stateManager, dst.stateManager, [0, 0], target)).toBe(true);

    expect(titles(src.stateManager.state, 0)).toEqual(['o1']);
    expect(titles(dst.stateManager.state, 1)).toEqual(['x1', 'o0']);
    const moved = dst.stateManager.state.children[1].children[1];
    expect(moved.data.blockId).toBeTruthy();
    expect(dst.stateManager.state.data.history?.[moved.data.blockId!]?.at(-1)?.type).toBe('moved');
  });

  it('keeps the card when the lane is gone in the other board', async () => {
    const src = await a();
    const dst = await b('## B\n\n- [ ] x0');
    expect(sendCardToLinkedBoard(src.stateManager, dst.stateManager, [0, 0], target)).toBe(false);

    expect(titles(src.stateManager.state, 0)).toEqual(['o0', 'o1']);
    expect(titles(dst.stateManager.state, 0)).toEqual(['x0']);
  });

  it('keeps the card when the other board has errors', async () => {
    const src = await a();
    const dst = await b();
    dst.stateManager.setError(new Error('broken'));
    expect(sendCardToLinkedBoard(src.stateManager, dst.stateManager, [0, 0], target)).toBe(false);
    expect(titles(src.stateManager.state, 0)).toEqual(['o0', 'o1']);
  });

  it('forgets the card slot in the stored order', async () => {
    const withOrder = JSON.stringify({
      'kanban-starlane': 'board',
      'linked-lanes': {
        A: { sources: [{ file: D2, lane: 'A' }], order: ['self', 'self', 'D2.md#^x1'] },
      },
    });
    const src = await loadBoard(
      board('kanban-starlane: board', '## A\n\n- [ ] o0\n- [ ] o1\n\n## B', withOrder),
      { path: 'D1.md' }
    );
    const dst = await b('## A\n\n- [ ] x1 ^x1');
    sendCardToLinkedBoard(src.stateManager, dst.stateManager, [0, 0], target);
    expect(readLinkedLanes(src.stateManager.state.data.settings).A.order).toEqual([
      'self',
      'D2.md#^x1',
    ]);
  });
});
