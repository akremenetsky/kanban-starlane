import update from 'immutability-helper';
import { getBoardModifiers } from 'src/state/boardModifiers';
import { describe, expect, it, vi } from 'vitest';

import { board } from '../../setup/fixtures';
import { loadBoard } from '../../setup/harness';

const settings =
  '{"kanban-starlane":"board","linked-lanes":{"Doing":{"sources":[{"file":"Work.md","lane":"Doing"}]}}}';
const md = board('kanban-starlane: board', '## Doing\n\n- [ ] own', settings);

describe('renaming a lane with linked lanes', () => {
  it('moves its linked-lanes entry to the new title', async () => {
    const { stateManager } = await loadBoard(md);
    const lane = stateManager.state.children[0];

    getBoardModifiers(null, stateManager).updateLane(
      [0],
      update(lane, { data: { title: { $set: 'In progress' } } })
    );

    expect(stateManager.state.data.settings['linked-lanes']).toEqual({
      'In progress': { sources: [{ file: 'Work.md', lane: 'Doing' }] },
    });
  });

  it('tells boards that link to this lane about the new title', async () => {
    const { stateManager } = await loadBoard(md);
    const onLaneRenamed = vi.fn();
    stateManager.onLaneRenamed = onLaneRenamed;
    const lane = stateManager.state.children[0];

    getBoardModifiers(null, stateManager).updateLane(
      [0],
      update(lane, { data: { title: { $set: 'In progress' } } })
    );

    expect(onLaneRenamed).toHaveBeenCalledWith('Doing', 'In progress');
  });

  it('leaves the setting alone when the title does not change', async () => {
    const { stateManager } = await loadBoard(md);
    const before = stateManager.state.data.settings['linked-lanes'];
    const lane = stateManager.state.children[0];

    getBoardModifiers(null, stateManager).updateLane(
      [0],
      update(lane, { data: { maxItems: { $set: 3 } } })
    );

    expect(stateManager.state.data.settings['linked-lanes']).toBe(before);
  });
});
