/**
 * Card history: events are derived by comparing the board before and after a change made in
 * the plugin, so every edit path (menus, drag and drop, linked lanes, background boards)
 * is covered without instrumenting each one. Cards are identified by block ids (`^id`),
 * which a card gets on its first event.
 */
import update from 'immutability-helper';
import { moment } from 'obsidian';
import { Board, CardEvent, CardHistory, Item } from 'src/model/types';
import { generateInstanceId } from 'src/shared/ids';

/** Edits closer together than this are one `edited` event. */
export const EDIT_MERGE_MS = 2 * 60 * 1000;

const TIME_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';

export function historyTimestamp(now = moment()) {
  return now.format(TIME_FORMAT);
}

interface Placement {
  item: Item;
  /** Lane index, or -1 for the archive. */
  laneIndex: number;
  laneId?: string;
  laneTitle?: string;
}

function placements(board: Board): Placement[] {
  const result: Placement[] = [];
  board.children.forEach((lane, laneIndex) =>
    lane.children.forEach((item) =>
      result.push({ item, laneIndex, laneId: lane.id, laneTitle: lane.data.title })
    )
  );
  board.data.archive.forEach((item) => result.push({ item, laneIndex: -1 }));
  return result;
}

function usedBlockIds(board: Board) {
  return new Set(
    placements(board)
      .map((p) => p.item.data.blockId)
      .filter(Boolean)
  );
}

/** A block id not used by any card of the board. */
export function newBlockId(used: Set<string>) {
  let id: string;
  do {
    id = generateInstanceId(6);
  } while (used.has(id) || !/[a-z]/.test(id));
  used.add(id);
  return id;
}

function addEvent(history: CardHistory, id: string, event: CardEvent) {
  const events = history[id] ?? [];
  const last = events[events.length - 1];

  if (
    event.type === 'edited' &&
    last?.type === 'edited' &&
    moment(event.at).diff(moment(last.at)) < EDIT_MERGE_MS
  ) {
    history[id] = [...events.slice(0, -1), { ...last, at: event.at }];
  } else {
    history[id] = [...events, event];
  }
}

function withBlockId(board: Board, p: Placement, id: string): Board {
  if (p.laneIndex < 0) {
    const index = board.data.archive.indexOf(p.item);
    return update(board, { data: { archive: { [index]: { data: { blockId: { $set: id } } } } } });
  }
  const index = board.children[p.laneIndex].children.indexOf(p.item);
  return update(board, {
    children: {
      [p.laneIndex]: { children: { [index]: { data: { blockId: { $set: id } } } } },
    },
  });
}

/**
 * Record what happened to cards between `prev` and `next` in `next`'s history.
 * Returns `next` itself when nothing was recorded.
 */
export function recordCardHistory(prev: Board, next: Board, at = historyTimestamp()): Board {
  if (next.data.historyRaw !== undefined) return next;

  const before = placements(prev);
  const after = placements(next);
  const byId = new Map(before.map((p) => [p.item.id, p]));
  const byBlockId = new Map(
    before.filter((p) => p.item.data.blockId).map((p) => [p.item.data.blockId, p])
  );
  const matched = new Map<Placement, Placement>();
  const used = new Set<Placement>();

  for (const p of after) {
    const old = byId.get(p.item.id);
    if (old && !used.has(old)) {
      matched.set(p, old);
      used.add(old);
    }
  }
  for (const p of after) {
    if (matched.has(p) || !p.item.data.blockId) continue;
    const old = byBlockId.get(p.item.data.blockId);
    if (old && !used.has(old)) {
      matched.set(p, old);
      used.add(old);
    }
  }

  const prevHistory = prev.data.history ?? {};
  const history: CardHistory = { ...(next.data.history ?? {}) };
  const blockIds = usedBlockIds(next);
  const seenBlockIds = new Set<string>();
  let board = next;
  let changed = false;

  // A copied card (duplicate, split) must not share the original's id and history: the
  // card that had the id before keeps it.
  // A card rebuilt from its text (e.g. by the Tasks plugin) may have lost its block id.
  const blockIdOf = (p: Placement) => p.item.data.blockId ?? matched.get(p)?.item.data.blockId;
  const owners = new Map<string, Placement>();
  for (const p of after) {
    const id = blockIdOf(p);
    if (id && (!owners.has(id) || matched.get(p)?.item.data.blockId === id)) owners.set(id, p);
  }

  for (const p of after) {
    const old = matched.get(p);
    const events: CardEvent[] = [];
    let blockId = blockIdOf(p);
    if (blockId && owners.get(blockId) !== p) blockId = undefined;

    if (!old) {
      // A card carried over from another board brings its history (see carryCardHistory).
      const arrived = blockId && history[blockId] && !prevHistory[blockId];
      if (!arrived && p.laneIndex >= 0) events.push({ at, type: 'created', lane: p.laneTitle });
    } else {
      const archived = old.laneIndex >= 0 && p.laneIndex < 0;
      const restored = old.laneIndex < 0 && p.laneIndex >= 0;
      const statusChanged = old.item.data.checkChar !== p.item.data.checkChar;

      if (archived) events.push({ at, type: 'archived', lane: old.laneTitle });
      else if (restored) events.push({ at, type: 'restored', lane: p.laneTitle });
      else if (p.laneIndex >= 0 && old.laneId !== p.laneId) {
        events.push({ at, type: 'moved', from: old.laneTitle, to: p.laneTitle });
      }

      if (statusChanged) {
        const mark = p.item.data.checkChar;
        events.push(mark === ' ' ? { at, type: 'unchecked' } : { at, type: 'checked', mark });
      }

      // Archiving may prefix a date and checking may add a done date (Tasks): not edits.
      if (!archived && !statusChanged && old.item.data.titleRaw !== p.item.data.titleRaw) {
        events.push({ at, type: 'edited' });
      }
    }

    if (events.length) {
      if (!blockId) blockId = newBlockId(blockIds);
      events.forEach((e) => addEvent(history, blockId, e));
      changed = true;
    }

    if (blockId !== p.item.data.blockId) {
      board = withBlockId(board, p, blockId);
      changed = true;
    }
    if (blockId) seenBlockIds.add(blockId);
  }

  // Deleted cards take their history with them.
  for (const id of Object.keys(history)) {
    if (!seenBlockIds.has(id) && prevHistory[id]) {
      delete history[id];
      changed = true;
    }
  }

  return changed ? update(board, { data: { history: { $set: history } } }) : next;
}

/**
 * Prepare a card that is moved to another board: give it a block id free on `destination`
 * and copy its history there, with the move. The destination's `recordCardHistory` then
 * treats it as arrived, not created; the source drops the history as the card leaves.
 */
export function carryCardHistory(
  source: Board,
  destination: Board,
  item: Item,
  move: { from?: string; to?: string },
  at = historyTimestamp()
): { item: Item; destination: Board } {
  if (destination.data.historyRaw !== undefined) return { item, destination };

  const used = usedBlockIds(destination);
  let blockId = item.data.blockId;
  if (!blockId || used.has(blockId)) blockId = newBlockId(used);

  const events: CardEvent[] = [
    ...((item.data.blockId && source.data.history?.[item.data.blockId]) || []),
    { at, type: 'moved', board: source.id, from: move.from, to: move.to },
  ];

  return {
    item:
      blockId === item.data.blockId ? item : update(item, { data: { blockId: { $set: blockId } } }),
    destination: update(destination, {
      data: { history: { $set: { ...(destination.data.history ?? {}), [blockId]: events } } },
    }),
  };
}

/** A card's events (oldest first). */
export function getCardHistory(board: Board, item: Item): CardEvent[] {
  return (item.data.blockId && board.data.history?.[item.data.blockId]) || [];
}

/** The event that put the card in its current lane, if it was recorded. */
export function enteredLaneEvent(events: CardEvent[]): CardEvent | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === 'created' || e.type === 'moved' || e.type === 'restored') return e;
    if (e.type === 'archived') return undefined;
  }
  return undefined;
}
