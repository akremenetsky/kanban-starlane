/**
 * The product owner's scenarios: D1 links its lanes A and B to lanes A and B of D2.
 * Lane A of D1 shows D1_A_0, D1_A_1, D2_A_0, D2_A_1.
 */
import { moveEntity } from 'src/dnd/util/data';
import { Board } from 'src/model/types';
import {
  applyBlockIds,
  applyOrders,
  planLinkedDrop,
  resolveDisplayPath,
  toOwnSlot,
} from 'src/state/linkedDrop';
import { laneEntries } from 'src/state/linkedLanes';
import { describe, expect, it } from 'vitest';

import { board } from '../../setup/fixtures';
import { loadBoard } from '../../setup/harness';

const D2 = 'D2.md';
const linked = JSON.stringify({
  A: { sources: [{ file: D2, lane: 'A' }] },
  B: { sources: [{ file: D2, lane: 'B' }] },
});

async function setup() {
  const d1 = (
    await loadBoard(
      board(
        'kanban-starlane: board',
        '## A\n\n- [ ] D1_A_0\n- [ ] D1_A_1\n\n## B\n\n## C\n\n- [ ] D1_C_0',
        `{"kanban-starlane":"board","linked-lanes":${linked}}`
      ),
      { path: 'D1.md' }
    )
  ).board;
  const d2 = (
    await loadBoard(
      board('kanban-starlane: board', '## A\n\n- [ ] D2_A_0\n- [ ] D2_A_1\n\n## B\n\n## C'),
      { path: D2 }
    )
  ).board;
  return { d1, d2 };
}

let ids = 0;
const newId = () => `id${++ids}`;

/** Apply a plan the way the drop handler does (without completion). */
function apply(d1: Board, d2: Board, drag: number[], drop: number[]) {
  const plan = planLinkedDrop(d1, (f) => (f === D2 ? d2 : undefined), drag, drop, newId);
  if (!plan) return null;

  let nextD1 = d1;
  let nextD2 = d2;
  if (plan.move?.file === null) nextD1 = moveEntity(nextD1, plan.move.from, plan.move.to);
  if (plan.move?.file === D2) nextD2 = moveEntity(nextD2, plan.move.from, plan.move.to);
  nextD2 = applyBlockIds(nextD2, plan.blockIds);
  nextD1 = applyOrders(nextD1, plan.orders);

  return { plan, d1: nextD1, d2: nextD2 };
}

const shown = (d1: Board, d2: Board, lane: number) =>
  laneEntries(d1, lane, (f) => (f === D2 ? d2 : undefined)).map((e) => e.item.data.titleRaw);
const titles = (b: Board, lane: number) => b.children[lane].children.map((i) => i.data.titleRaw);

describe('planLinkedDrop', () => {
  it('shows own cards first, then the linked ones', async () => {
    const { d1, d2 } = await setup();
    expect(shown(d1, d2, 0)).toEqual(['D1_A_0', 'D1_A_1', 'D2_A_0', 'D2_A_1']);
  });

  it('reordering own cards does not touch D2', async () => {
    const { d1, d2 } = await setup();
    const r = apply(d1, d2, [0, 1], [0, 0]);

    expect(shown(r.d1, r.d2, 0)).toEqual(['D1_A_1', 'D1_A_0', 'D2_A_0', 'D2_A_1']);
    expect(r.plan.move).toEqual({ file: null, from: [0, 1], to: [0, 0] });
    expect(r.plan.blockIds).toEqual([]);
    expect(r.d2).toBe(d2);
  });

  it('moving a D2 card before its sibling reorders D2', async () => {
    const { d1, d2 } = await setup();
    // D2_A_1, D1_A_0, D1_A_1, D2_A_0
    const r = apply(d1, d2, [0, 3], [0, 0]);

    expect(shown(r.d1, r.d2, 0)).toEqual(['D2_A_1', 'D1_A_0', 'D1_A_1', 'D2_A_0']);
    expect(titles(r.d2, 0)).toEqual(['D2_A_1', 'D2_A_0']);
  });

  it('keeps an interleaving that D2 does not care about in D1 only', async () => {
    const { d1, d2 } = await setup();
    // D1_A_0, D2_A_0, D1_A_1, D2_A_1
    const r = apply(d1, d2, [0, 2], [0, 1]);

    expect(shown(r.d1, r.d2, 0)).toEqual(['D1_A_0', 'D2_A_0', 'D1_A_1', 'D2_A_1']);
    expect(r.plan.move).toBeNull();
    expect(titles(r.d2, 0)).toEqual(['D2_A_0', 'D2_A_1']);
    // Only block ids are added to D2 so D1 can remember the positions.
    expect(r.d2.children[0].children.every((i) => !!i.data.blockId)).toBe(true);
  });

  it('moves a D2 card to another linked lane in D2', async () => {
    const { d1, d2 } = await setup();
    const r = apply(d1, d2, [0, 2], [1, 0]);

    expect(titles(r.d2, 0)).toEqual(['D2_A_1']);
    expect(titles(r.d2, 1)).toEqual(['D2_A_0']);
    expect(shown(r.d1, r.d2, 1)).toEqual(['D2_A_0']);
    expect(titles(r.d1, 0)).toEqual(['D1_A_0', 'D1_A_1']);
  });

  it('places a D2 card among own cards of the target lane', async () => {
    const { d1, d2 } = await setup();
    const withOwnB = (await apply(d1, d2, [0, 0], [1, 0])).d1; // D1_A_0 → B
    const r = apply(withOwnB, d2, [0, 1], [1, 0]); // D2_A_0 (now 2nd in A) → top of B

    expect(shown(r.d1, r.d2, 1)).toEqual(['D2_A_0', 'D1_A_0']);
    expect(titles(r.d2, 1)).toEqual(['D2_A_0']);
  });

  it('keeps stored positions of a linked board that is not available', async () => {
    const { d2 } = await setup();
    const withMissing = JSON.stringify({
      A: {
        sources: [
          { file: D2, lane: 'A' },
          { file: 'D3.md', lane: 'A' },
        ],
        order: ['self', 'D3.md#^x', 'self'],
      },
    });
    const d1 = (
      await loadBoard(
        board(
          'kanban-starlane: board',
          '## A\n\n- [ ] D1_A_0\n- [ ] D1_A_1',
          `{"kanban-starlane":"board","linked-lanes":${withMissing}}`
        ),
        { path: 'D1.md' }
      )
    ).board;

    const r = apply(d1, d2, [0, 1], [0, 0]);

    expect(titles(r.d1, 0)).toEqual(['D1_A_1', 'D1_A_0']);
    expect(r.d1.data.settings['linked-lanes'].A.order).toEqual(['self', 'D3.md#^x', 'self']);
  });

  it('refuses to drop a D2 card into a lane that does not show D2', async () => {
    const { d1, d2 } = await setup();
    expect(planLinkedDrop(d1, (f) => (f === D2 ? d2 : undefined), [0, 2], [2, 0])).toBeNull();
  });

  it('lets own cards leave a combined lane', async () => {
    const { d1, d2 } = await setup();
    const r = apply(d1, d2, [0, 1], [2, 1]);

    expect(titles(r.d1, 2)).toEqual(['D1_C_0', 'D1_A_1']);
    expect(shown(r.d1, r.d2, 0)).toEqual(['D1_A_0', 'D2_A_0', 'D2_A_1']);
  });

  it('drops at the end when no slot is given (collapsed lane)', async () => {
    const { d1, d2 } = await setup();
    const r = apply(d1, d2, [0, 0], [0]);

    expect(shown(r.d1, r.d2, 0)).toEqual(['D1_A_1', 'D2_A_0', 'D2_A_1', 'D1_A_0']);
  });
});

describe('addressing cards of combined lanes', () => {
  it('maps a combined position to the card in its own board', async () => {
    const { d1, d2 } = await setup();
    const get = (f: string) => (f === D2 ? d2 : undefined);

    expect(resolveDisplayPath(d1, [0, 1], get)).toEqual({ file: null, path: [0, 1] });
    expect(resolveDisplayPath(d1, [0, 3], get)).toEqual({ file: D2, path: [0, 1] });
    expect(resolveDisplayPath(d1, [2, 0], get)).toEqual({ file: null, path: [2, 0] });
  });

  it('maps a combined slot to a slot among own cards', async () => {
    const { d1, d2 } = await setup();
    const get = (f: string) => (f === D2 ? d2 : undefined);

    expect(toOwnSlot(d1, [0, 4], get)).toEqual([0, 2]);
    expect(toOwnSlot(d1, [0, 1], get)).toEqual([0, 1]);
  });
});
