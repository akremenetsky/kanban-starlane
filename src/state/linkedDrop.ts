/**
 * Dropping a card in a board whose lanes show linked lanes. The UI works with positions in
 * the combined lists; this turns a drop into
 * - a move inside the card's own file (own card: this board, linked card: its board),
 * - the new combined `order` of the lanes involved,
 * - block ids for linked cards whose position can only be stored by identity.
 */
import update from 'immutability-helper';
import { Path } from 'src/dnd/types';
import { getEntityFromPath, moveEntity, updateEntity } from 'src/dnd/util/data';
import { Board, Item } from 'src/model/types';
import { generateInstanceId } from 'src/shared/ids';

import {
  GetBoard,
  LaneEntry,
  SELF_TOKEN,
  cardRef,
  laneEntries,
  readLinkedLanes,
  resolveLaneSources,
} from './linkedLanes';

export interface FileMove {
  /** null: the board being viewed; otherwise the linked board's path. */
  file: string | null;
  from: Path;
  /** Slot path, counted before removal (see dnd/util/data.ts). */
  to: Path;
}

export interface LinkedDropPlan {
  move: FileMove | null;
  /** Block ids to give linked cards; paths are after the move. */
  blockIds: Array<{ file: string; path: Path; id: string }>;
  /** New `order` per own lane title. */
  orders: Record<string, string[]>;
}

/** Whether the lane at `laneIndex` shows cards of other boards. */
export function isMixedLane(board: Board, laneIndex: number, getBoard: GetBoard) {
  return !!laneEntries(board, laneIndex, getBoard);
}

/** The card at a position of a (possibly combined) lane, addressed in its own board. */
export function resolveDisplayPath(board: Board, path: Path, getBoard: GetBoard) {
  const [laneIndex, index] = path;
  const entries = laneEntries(board, laneIndex, getBoard);
  if (!entries) return { file: null as string | null, path };

  const entry = entries[index];
  if (!entry) return null;
  if (entry.source === null) return { file: null, path: [laneIndex, ownIndex(entries, index)] };

  const sourceBoard = getBoard(entry.source);
  const lane = sourceBoard.children.findIndex((l) => l.children.includes(entry.item));
  return {
    file: entry.source,
    path: [lane, sourceBoard.children[lane].children.indexOf(entry.item)],
  };
}

/** The slot among own cards that corresponds to a slot in a combined lane. */
export function toOwnSlot(board: Board, path: Path, getBoard: GetBoard): Path {
  const [laneIndex, slot] = path;
  const entries = laneEntries(board, laneIndex, getBoard);
  if (!entries || slot === undefined) return path;
  return [laneIndex, entries.slice(0, slot).filter((e) => e.source === null).length];
}

/**
 * Plan a drop of the card at `drag` into slot `drop` (both in combined-lane positions of
 * `board`). Returns null when the drop is not allowed: a linked card can only go to lanes
 * that show a lane of its own board.
 */
export function planLinkedDrop(
  board: Board,
  getBoard: GetBoard,
  drag: Path,
  drop: Path,
  newId: () => string = () => generateInstanceId(6)
): LinkedDropPlan | null {
  const [sourceLane, dragIndex] = drag;
  const [targetLane] = drop;
  const entriesOf = (laneIndex: number): LaneEntry[] | undefined =>
    laneEntries(board, laneIndex, getBoard) ??
    board.children[laneIndex]?.children.map((item): LaneEntry => ({ source: null, item }));

  const before = entriesOf(sourceLane);
  const entry = before?.[dragIndex];
  const targetBefore = sourceLane === targetLane ? before : entriesOf(targetLane);
  if (!entry || !targetBefore) return null;

  const slot = drop[1] ?? targetBefore.length;

  // The combined lists after the drop.
  const sourceAfter = before.filter((_, i) => i !== dragIndex);
  let targetAfter: LaneEntry[];
  if (sourceLane === targetLane) {
    targetAfter = [...sourceAfter];
    targetAfter.splice(slot > dragIndex ? slot - 1 : slot, 0, entry);
  } else {
    targetAfter = [...targetBefore];
    targetAfter.splice(slot, 0, entry);
  }
  const position = targetAfter.indexOf(entry);

  // The move inside the card's own file.
  let move: FileMove | null;
  if (entry.source === null) {
    const from = ownIndex(before, dragIndex);
    const to = targetAfter.slice(0, position).filter((e) => e.source === null).length;
    move = fileMove(null, [sourceLane, from], [targetLane, to]);
  } else {
    const sourceBoard = getBoard(entry.source);
    const fromLane = sourceBoard.children.findIndex((l) => l.children.includes(entry.item));
    const fromIndex = sourceBoard.children[fromLane].children.indexOf(entry.item);

    const linked = readLinkedLanes(board.data.settings)[board.children[targetLane].data.title];
    const candidates = resolveLaneSources(linked, getBoard).filter((s) => s.file === entry.source);
    if (!candidates.length) return null;

    const toLane = candidates.some((s) => s.laneIndex === fromLane)
      ? fromLane
      : candidates[0].laneIndex;
    const laneItems = new Set(sourceBoard.children[toLane].children);
    const to = targetAfter
      .slice(0, position)
      .filter((e) => e.source === entry.source && laneItems.has(e.item)).length;
    move = fileMove(entry.source, [fromLane, fromIndex], [toLane, to]);
  }

  // Boards as they will be after the move, to check that the stored order reproduces the drop.
  const ownAfter = move?.file === null ? moveEntity(board, move.from, move.to) : board;
  const movedBoard = move?.file ? moveEntity(getBoard(move.file), move.from, move.to) : null;
  const getAfter: GetBoard = (file) => (file === move?.file ? movedBoard : getBoard(file));

  // Compare cards by id: moveEntity copies the entities it moves.
  const assigned = new Map<string, { file: string; id: string }>();
  const idOf = (item: Item) => item.data.blockId ?? assigned.get(item.id)?.id;
  const orders: Record<string, string[]> = {};

  const lanes = sourceLane === targetLane ? [targetLane] : [sourceLane, targetLane];
  for (const laneIndex of lanes) {
    const wanted = laneIndex === targetLane ? targetAfter : sourceAfter;
    const title = board.children[laneIndex].data.title;
    const linkedLane = readLinkedLanes(board.data.settings)[title];
    if (!linkedLane) continue;
    // With a linked board missing, a new order would forget where its cards were.
    const resolved = resolveLaneSources(linkedLane, getBoard);
    const allResolved = linkedLane.sources.every((s) =>
      resolved.some(
        (r) => r.file === s.file && getBoard(r.file).children[r.laneIndex].data.title === s.lane
      )
    );
    if (!allResolved) continue;

    const withOrder = (order: string[]) =>
      laneEntries(
        update(ownAfter, {
          data: { settings: { 'linked-lanes': { [title]: { order: { $set: order } } } } },
        }),
        laneIndex,
        getAfter,
        idOf
      );
    const sameAs = (entries: LaneEntry[] | null) =>
      !!entries &&
      entries.length === wanted.length &&
      entries.every((e, i) => e.item.id === wanted[i].item.id);

    let order = tokensFor(wanted, idOf);
    if (!sameAs(withOrder(order))) {
      for (const e of wanted) {
        if (e.source !== null && !idOf(e.item))
          assigned.set(e.item.id, { file: e.source, id: newId() });
      }
      order = tokensFor(wanted, idOf);
    }
    orders[title] = order;
  }

  const blockIds = Array.from(assigned.entries()).map(([itemId, { file, id }]) => {
    const b = getAfter(file);
    const lane = b.children.findIndex((l) => l.children.some((i) => i.id === itemId));
    return { file, path: [lane, b.children[lane].children.findIndex((i) => i.id === itemId)], id };
  });

  return { move, blockIds, orders };
}

/** Give cards block ids (paths from a plan). */
export function applyBlockIds(board: Board, ids: Array<{ path: Path; id: string }>): Board {
  return ids.reduce(
    (b, { path, id }) =>
      getEntityFromPath(b, path)
        ? updateEntity<Board, Item>(b, path, { data: { blockId: { $set: id } } })
        : b,
    board
  );
}

/** Store new combined orders in the board's `linked-lanes` setting. */
export function applyOrders(board: Board, orders: Record<string, string[]>): Board {
  const linked = readLinkedLanes(board.data.settings);
  let changed = false;

  for (const [title, order] of Object.entries(orders)) {
    if (!linked[title] || sameTokens(linked[title].order, order)) continue;
    linked[title] = { ...linked[title], order };
    changed = true;
  }

  return changed
    ? update(board, { data: { settings: { 'linked-lanes': { $set: linked } } } })
    : board;
}

function fileMove(file: string | null, from: Path, to: Path): FileMove | null {
  const [fromLane, fromIndex] = from;
  const [toLane, toIndex] = to;
  if (fromLane === toLane) {
    if (toIndex === fromIndex) return null;
    // Slot paths are counted before the card is removed.
    return { file, from, to: [toLane, toIndex > fromIndex ? toIndex + 1 : toIndex] };
  }
  return { file, from, to };
}

function ownIndex(entries: LaneEntry[], index: number) {
  return entries.slice(0, index).filter((e) => e.source === null).length;
}

function tokensFor(entries: LaneEntry[], idOf: (item: Item) => string | undefined) {
  const tokens: string[] = [];
  for (const e of entries) {
    if (e.source === null) tokens.push(SELF_TOKEN);
    else if (idOf(e.item)) tokens.push(cardRef(e.source, idOf(e.item)));
  }
  return tokens;
}

function sameTokens(a: string[] | undefined, b: string[]) {
  return !!a && a.length === b.length && a.every((t, i) => t === b[i]);
}
