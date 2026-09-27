import update from 'immutability-helper';
import { moment } from 'obsidian';
import { moveEntity, removeEntity } from 'src/dnd/util/data';
import { Board, CardEvent } from 'src/model/types';
import { StateManager } from 'src/state/StateManager';
import { getBoardModifiers } from 'src/state/boardModifiers';
import {
  carryCardHistory,
  enteredLaneEvent,
  getCardHistory,
  recordCardHistory,
} from 'src/state/cardHistory';
import { maybeCompleteForMove } from 'src/state/completion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { board } from '../../setup/fixtures';
import { createFakeApp, loadBoard, summarize } from '../../setup/harness';

const md = board(
  'kanban-starlane: board',
  '## Todo\n\n- [ ] one\n- [ ] two\n\n## Done\n\n**Complete**\n- [x] three'
);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-25T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

const at = (iso: string) => moment(iso).format('YYYY-MM-DDTHH:mm:ssZ');
const minutes = (n: number) => vi.setSystemTime(Date.now() + n * 60 * 1000);

/** Events of the card at [lane, index] without timestamps. */
function eventsOf(b: Board, lane: number, index: number): Array<Omit<CardEvent, 'at'>> {
  const item = lane < 0 ? b.data.archive[index] : b.children[lane].children[index];
  return getCardHistory(b, item).map(({ at: _at, ...rest }) => rest);
}

function modifiers(stateManager: StateManager) {
  return getBoardModifiers({} as any, stateManager);
}

function editCard(stateManager: StateManager, lane: number, index: number, title: string) {
  const item = stateManager.state.children[lane].children[index];
  modifiers(stateManager).updateItem([lane, index], stateManager.updateItemContent(item, title));
}

describe('card history', () => {
  it('records a new card with its lane and gives it a block id', async () => {
    const { stateManager, view } = await loadBoard(md);

    modifiers(stateManager).appendItems([0, 2], [stateManager.getNewItem('new card', ' ')]);

    const card = stateManager.state.children[0].children[2];
    expect(card.data.blockId).toMatch(/^[a-z0-9]{6}$/);
    expect(getCardHistory(stateManager.state, card)).toEqual([
      { at: at('2026-09-25T10:00:00Z'), type: 'created', lane: 'Todo' },
    ]);
    expect(view.data).toContain(`- [ ] new card ^${card.data.blockId}\n`);
    expect(view.data).toContain(
      '%% kanban-starlane:history\n```\n{\n' +
        `"${card.data.blockId}":[{"at":"${at('2026-09-25T10:00:00Z')}","type":"created","lane":"Todo"}]` +
        '\n}\n```\n%%\n\n%% kanban-starlane:settings'
    );
  });

  it('records moves between lanes but not reordering inside a lane', async () => {
    const { stateManager } = await loadBoard(md);

    stateManager.setState((b) => moveEntity(b, [0, 0], [0, 2]));
    expect(stateManager.state.data.history).toBeUndefined();

    stateManager.setState((b) => moveEntity(b, [0, 0], [1, 0]));
    expect(eventsOf(stateManager.state, 1, 0)).toEqual([
      { type: 'moved', from: 'Todo', to: 'Done' },
    ]);
  });

  it('records edits, merging edits less than 2 minutes apart', async () => {
    const { stateManager } = await loadBoard(md);

    editCard(stateManager, 0, 0, 'one a');
    minutes(1);
    editCard(stateManager, 0, 0, 'one b');
    const merged = getCardHistory(stateManager.state, stateManager.state.children[0].children[0]);
    expect(merged).toEqual([{ at: at('2026-09-25T10:01:00Z'), type: 'edited' }]);

    minutes(3);
    editCard(stateManager, 0, 0, 'one c');
    expect(eventsOf(stateManager.state, 0, 0)).toEqual([{ type: 'edited' }, { type: 'edited' }]);
  });

  it('records checking and unchecking', async () => {
    const { stateManager } = await loadBoard(md);
    const check = (char: string) =>
      stateManager.setState((b) =>
        update(b, {
          children: {
            0: {
              children: {
                0: { data: { checkChar: { $set: char }, checked: { $set: char !== ' ' } } },
              },
            },
          },
        })
      );

    check('x');
    check(' ');
    expect(eventsOf(stateManager.state, 0, 0)).toEqual([
      { type: 'checked', mark: 'x' },
      { type: 'unchecked' },
    ]);
  });

  it('records archiving without counting the archive date as an edit', async () => {
    const { stateManager } = await loadBoard(md, { globalSettings: { 'archive-with-date': true } });

    modifiers(stateManager).archiveItem([0, 1]);

    expect(summarize(stateManager.state).archive[0]).toMatch(/two$/);
    expect(eventsOf(stateManager.state, -1, 0)).toEqual([{ type: 'archived', lane: 'Todo' }]);
  });

  it('drops the history of a deleted card', async () => {
    const { stateManager, view } = await loadBoard(md);
    editCard(stateManager, 0, 0, 'one edited');
    expect(view.data).toContain('kanban-starlane:history');

    modifiers(stateManager).deleteEntity([0, 0]);

    expect(stateManager.state.data.history).toEqual({});
    expect(view.data).not.toContain('kanban-starlane:history');
  });

  it('gives a duplicated card its own block id and history', async () => {
    const { stateManager } = await loadBoard(md);
    editCard(stateManager, 0, 0, 'one edited');
    const originalId = stateManager.state.children[0].children[0].data.blockId;

    modifiers(stateManager).duplicateEntity([0, 0]);

    const [copy, original] = stateManager.state.children[0].children;
    expect(original.data.blockId).toBe(originalId);
    expect(copy.data.blockId).toBeTruthy();
    expect(copy.data.blockId).not.toBe(originalId);
    expect(eventsOf(stateManager.state, 0, 0)).toEqual([{ type: 'created', lane: 'Todo' }]);
    expect(eventsOf(stateManager.state, 0, 1)).toEqual([{ type: 'edited' }]);
  });

  it('gives the cards of a duplicated list their own ids and history', async () => {
    const { stateManager } = await loadBoard(md);
    editCard(stateManager, 0, 0, 'one edited');
    const originalId = stateManager.state.children[0].children[0].data.blockId;

    getBoardModifiers(
      { getViewState: (): boolean[] => [], setViewState: () => {} } as any,
      stateManager
    ).duplicateEntity([0]);
    modifiers(stateManager).moveItemToTop([2, 0]);

    const [copy, original] = stateManager.state.children;
    expect(original.children[0].data.blockId).toBe(originalId);
    expect(eventsOf(stateManager.state, 1, 0)).toEqual([{ type: 'edited' }]);
    expect(copy.children[0].data.blockId).not.toBe(originalId);
    expect(eventsOf(stateManager.state, 0, 0)).toEqual([{ type: 'created', lane: 'Todo' }]);
    expect(eventsOf(stateManager.state, 0, 1)).toEqual([{ type: 'created', lane: 'Todo' }]);
  });

  describe('with the Tasks plugin', () => {
    const tasks = {
      'obsidian-tasks-plugin': {
        apiV1: {
          executeToggleTaskDoneCommand: (line: string) =>
            line.replace('- [ ]', '- [x]') + ' ✅ 2026-09-25',
        },
      },
    };

    it('keeps the block id and history of a card rebuilt when it is checked', async () => {
      const { stateManager, view } = await loadBoard(md, { plugins: tasks });
      editCard(stateManager, 0, 0, 'one edited');
      const item = stateManager.state.children[0].children[0];
      const blockId = item.data.blockId;

      // What ItemCheckbox does: the card is rebuilt from the text Tasks returns.
      const rebuilt = stateManager.getNewItem('one edited ✅ 2026-09-25', 'x');
      rebuilt.id = item.id;
      modifiers(stateManager).replaceItem([0, 0], [rebuilt]);

      expect(stateManager.state.children[0].children[0].data.blockId).toBe(blockId);
      expect(eventsOf(stateManager.state, 0, 0)).toEqual([
        { type: 'edited' },
        { type: 'checked', mark: 'x' },
      ]);
      expect(view.data).toContain(`- [x] one edited ✅ 2026-09-25 ^${blockId}\n`);
    });

    it('keeps the identity of a card completed by a move into a Complete list', async () => {
      const { stateManager } = await loadBoard(md, { plugins: tasks });
      editCard(stateManager, 0, 0, 'one edited');
      const item = stateManager.state.children[0].children[0];

      const { next } = maybeCompleteForMove(
        stateManager,
        stateManager.state,
        [0, 0],
        stateManager,
        stateManager.state,
        [1, 0],
        item
      );

      expect(next.id).toBe(item.id);
      expect(next.data.blockId).toBe(item.data.blockId);
      expect(next.data.checkChar).toBe('x');
    });
  });

  it('keeps the original owner of a block id copied by other means', () => {
    const prev = {
      id: 'B.md',
      children: [
        {
          id: 'lane',
          data: { title: 'Todo' },
          children: [{ id: 'a', data: { titleRaw: 'a', checkChar: ' ', blockId: 'abc123' } }],
        },
      ],
      data: { archive: [], history: { abc123: [{ at: 'x', type: 'edited' }] } },
    } as unknown as Board;
    const copy = { id: 'b', data: { titleRaw: 'a', checkChar: ' ', blockId: 'abc123' } };
    const next = update(prev, { children: { 0: { children: { $unshift: [copy as any] } } } });

    const result = recordCardHistory(prev, next, 'now');

    expect(result.children[0].children[1].data.blockId).toBe('abc123');
    expect(result.children[0].children[0].data.blockId).not.toBe('abc123');
    expect(result.data.history.abc123).toEqual([{ at: 'x', type: 'edited' }]);
  });

  it('does not record changes read from the file', async () => {
    const { stateManager, view } = await loadBoard(md);

    view.data = md.replace('- [ ] one', '- [ ] one changed outside');
    await stateManager.reparseBoardFromMd();

    expect(summarize(stateManager.state).lanes[0].items[0]).toBe('one changed outside');
    expect(stateManager.state.data.history).toBeUndefined();
  });

  it('records nothing when the card-history setting is off', async () => {
    const { stateManager, view } = await loadBoard(md, {
      globalSettings: { 'card-history': false },
    });

    editCard(stateManager, 0, 0, 'one edited');

    expect(view.data).toContain('- [ ] one edited\n');
    expect(view.data).not.toContain('kanban-starlane:history');
  });

  it('leaves the file as it was when a change touches no card', async () => {
    const { stateManager, view, toMarkdown } = await loadBoard(md);
    const before = toMarkdown();

    stateManager.setState((b) =>
      update(b, { data: { settings: { 'lane-width': { $set: 300 } } } })
    );

    expect(view.data).toBe(before.replace('"board"}', '"board","lane-width":300}'));
  });

  it('saves history of a board edited in the background', async () => {
    const app = createFakeApp({ contents: { 'Work.md': md } });
    const file = app.vault.getAbstractFileByPath('Work.md');
    const stateManager = new StateManager(
      app,
      file,
      () => {},
      () => ({})
    );
    stateManager.retain();
    await stateManager.loadFromDisk();

    stateManager.setState((b) => moveEntity(b, [0, 1], [1, 0]));

    const saved = app.vault.contents.get('Work.md');
    expect(saved).toMatch(/## Done\n\n\*\*Complete\*\*\n- \[ \] two \^[a-z0-9]{6}\n/);
    expect(saved).toContain('"type":"moved","from":"Todo","to":"Done"');
  });

  it('carries the history of a card moved to another board', async () => {
    const source = await loadBoard(md, { path: 'Work.md' });
    const destination = await loadBoard(md, { path: 'Home.md' });
    editCard(source.stateManager, 0, 0, 'one edited');
    const item = source.stateManager.state.children[0].children[0];

    destination.stateManager.setState((b) => {
      const carried = carryCardHistory(source.stateManager.state, b, item, {
        from: 'Todo',
        to: 'Done',
      });
      return update(carried.destination, {
        children: { 1: { children: { $unshift: [carried.item] } } },
      });
    });
    source.stateManager.setState((b) => removeEntity(b, [0, 0]));

    expect(eventsOf(destination.stateManager.state, 1, 0)).toEqual([
      { type: 'edited' },
      { type: 'moved', board: 'Work.md', from: 'Todo', to: 'Done' },
    ]);
    expect(source.stateManager.state.data.history).toEqual({});
  });
});

describe('enteredLaneEvent', () => {
  it('is the last event that put the card in a lane', () => {
    const events: CardEvent[] = [
      { at: '1', type: 'created', lane: 'A' },
      { at: '2', type: 'moved', from: 'A', to: 'B' },
      { at: '3', type: 'edited' },
    ];
    expect(enteredLaneEvent(events)?.at).toBe('2');
    expect(enteredLaneEvent([...events, { at: '4', type: 'archived', lane: 'B' }])).toBe(undefined);
    expect(enteredLaneEvent([{ at: '1', type: 'edited' }])).toBe(undefined);
  });
});
