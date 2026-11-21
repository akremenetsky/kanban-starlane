/**
 * Epics of one board: an epic is a card that groups other cards of the board. Stored by the
 * epic card's block id with its colour and members' block ids. A card belongs to at most one
 * epic, an epic never belongs to one, and an epic has no size of its own.
 */
import update from 'immutability-helper';
import {
  Board,
  CARD_SIZES,
  CardEpic,
  CardSize,
  EPIC_COLORS,
  EpicColor,
  Item,
} from 'src/model/types';

import { placements, usedBlockIds, withBlockIds } from './cardHistory';

export function isEpicColor(color: unknown): color is EpicColor {
  return (EPIC_COLORS as readonly unknown[]).includes(color);
}

/** A card of an epic, where it is now. */
export interface EpicMember {
  item: Item;
  archived: boolean;
  laneTitle?: string;
}

export interface ResolvedEpic {
  /** Block id of the epic card. */
  id: string;
  item: Item;
  color: EpicColor;
  archived: boolean;
  members: EpicMember[];
}

interface EpicIndex {
  /** By the epic card's block id. */
  epics: Map<string, ResolvedEpic>;
  /** Epic block id by member block id. */
  memberOf: Map<string, string>;
}

const indexCache = new WeakMap<Board, EpicIndex>();

/**
 * Epics resolved against the cards on the board, once per board state. Dangling ids are
 * skipped; a card listed in two epics belongs to the first; an epic listed as a member is not.
 */
function epicIndex(board: Board): EpicIndex {
  const cached = indexCache.get(board);
  if (cached) return cached;

  const byBlockId = new Map<string, ReturnType<typeof placements>[number]>();
  for (const p of placements(board)) {
    const id = p.item.data.blockId;
    if (id && !byBlockId.has(id)) byBlockId.set(id, p);
  }

  const stored = Object.entries(board.data.epics ?? {}).flatMap(([id, epic]) => {
    const p = byBlockId.get(id);
    return p ? [{ id, epic, p }] : [];
  });
  const epicIds = new Set(stored.map(({ id }) => id));
  const epics = new Map<string, ResolvedEpic>();
  const memberOf = new Map<string, string>();

  for (const { id, epic, p } of stored) {
    const members: EpicMember[] = [];
    for (const card of epic.cards) {
      const m = byBlockId.get(card);
      if (!m || epicIds.has(card) || memberOf.has(card)) continue;
      memberOf.set(card, id);
      members.push({ item: m.item, archived: m.laneIndex < 0, laneTitle: m.laneTitle });
    }
    epics.set(id, {
      id,
      item: p.item,
      color: isEpicColor(epic.color) ? epic.color : EPIC_COLORS[0],
      archived: p.laneIndex < 0,
      members,
    });
  }

  const index = { epics, memberOf };
  indexCache.set(board, index);
  return index;
}

/** The epic this card is, or undefined. */
export function epicOfCard(board: Board, item: Item): ResolvedEpic | undefined {
  const id = item.data.blockId;
  return id && board.data.epics ? epicIndex(board).epics.get(id) : undefined;
}

export function isEpic(board: Board, item: Item): boolean {
  return !!epicOfCard(board, item);
}

/** The epic the card belongs to, or undefined. */
export function epicOfMember(board: Board, item: Item): ResolvedEpic | undefined {
  const id = item.data.blockId;
  if (!id || !board.data.epics) return undefined;
  const { epics, memberOf } = epicIndex(board);
  const epicId = memberOf.get(id);
  return epicId ? epics.get(epicId) : undefined;
}

/** The board's epics in file order (lanes, then the archive). */
export function boardEpics(board: Board): ResolvedEpic[] {
  if (!board.data.epics) return [];
  const { epics } = epicIndex(board);
  return placements(board)
    .map((p) => p.item.data.blockId && epics.get(p.item.data.blockId))
    .filter((e): e is ResolvedEpic => !!e);
}

/**
 * The cards whose size counts in a total: epics are left out (their cards are counted). Each
 * card is checked on its own board (a linked lane mixes boards; block ids are only unique per
 * board); `board` is undefined when that board has epics switched off.
 */
export function sizedCards(cards: { item: Item; board: Board | undefined }[]): Item[] {
  return cards.filter(({ item, board }) => !board || !isEpic(board, item)).map((c) => c.item);
}

/** A member is done when it is checked or in the archive. */
export function isMemberDone(m: EpicMember): boolean {
  return m.archived || m.item.data.checked;
}

export interface EpicProgress {
  done: number;
  total: number;
  /** Weights of the members that have a size. */
  weightDone: number;
  weightTotal: number;
  /** Members with a size, per size; sizes without members are left out. */
  bySize: Partial<Record<CardSize, { done: number; total: number }>>;
}

/** Progress of an epic: members done of all, and the same by size weight. */
export function epicProgress(epic: ResolvedEpic, weights: Record<CardSize, number>): EpicProgress {
  const progress: EpicProgress = { done: 0, total: 0, weightDone: 0, weightTotal: 0, bySize: {} };
  for (const m of epic.members) {
    const done = isMemberDone(m);
    progress.total++;
    if (done) progress.done++;
    const size = m.item.data.metadata.size;
    if (!size) continue;
    const entry = progress.bySize[size] ?? { done: 0, total: 0 };
    entry.total++;
    progress.weightTotal += weights[size];
    if (done) {
      entry.done++;
      progress.weightDone += weights[size];
    }
    progress.bySize[size] = entry;
  }
  return progress;
}

/** Sizes in scale order that have members. */
export function epicSizes(progress: EpicProgress): CardSize[] {
  return CARD_SIZES.filter((size) => progress.bySize[size]);
}

/** The palette colour used by the fewest epics, the earliest one on a tie. */
export function nextEpicColor(board: Board): EpicColor {
  const counts = new Map<string, number>();
  for (const { color } of boardEpics(board)) counts.set(color, (counts.get(color) ?? 0) + 1);
  let best: EpicColor = EPIC_COLORS[0];
  for (const color of EPIC_COLORS) {
    if ((counts.get(color) ?? 0) < (counts.get(best) ?? 0)) best = color;
  }
  return best;
}

function canEdit(board: Board) {
  return board.data.epicsRaw === undefined;
}

function setEpics(board: Board, epics: Record<string, CardEpic>): Board {
  return update(board, { data: { epics: { $set: epics } } });
}

/** The stored epics without `card` among any epic's members. */
function withoutMember(epics: Record<string, CardEpic>, card: string) {
  const result: Record<string, CardEpic> = {};
  for (const [id, epic] of Object.entries(epics)) {
    result[id] = epic.cards.includes(card)
      ? { ...epic, cards: epic.cards.filter((c) => c !== card) }
      : epic;
  }
  return result;
}

/**
 * The card as it is on the board now. Callers may hold an object from before a change made
 * elsewhere (another window, a sync) gave the card a block id or made it an epic; every check
 * must look at the current card. Undefined when it is no longer on the board.
 */
function current(board: Board, item: Item): Item | undefined {
  return placements(board).find((p) => p.item.id === item.id)?.item;
}

/**
 * Makes the card an epic with the next free colour; it leaves the epic it was in. The card
 * keeps its text: removing its size tag is up to the caller.
 */
export function markEpic(board: Board, card: Item): Board {
  const item = current(board, card);
  if (!canEdit(board) || !item || isEpic(board, item)) return board;
  const {
    board: next,
    ids: [id],
  } = withBlockIds(board, [item]);
  if (!id) return board;

  const epics = withoutMember(next.data.epics ?? {}, id);
  return setEpics(next, { ...epics, [id]: { color: nextEpicColor(next), cards: [] } });
}

/** Turns an epic back into an ordinary card; its members belong to no epic. */
export function unmarkEpic(board: Board, card: Item): Board {
  const id = current(board, card)?.data.blockId;
  if (!canEdit(board) || !id || !board.data.epics?.[id]) return board;
  const epics = { ...board.data.epics };
  delete epics[id];
  return setEpics(board, epics);
}

/** Adds `member` to the epic `epicItem`, moving it out of its current epic. */
export function addToEpic(board: Board, epicCard: Item, card: Item): Board {
  const epicItem = current(board, epicCard);
  const member = current(board, card);
  const epicId = epicItem?.data.blockId;
  if (!canEdit(board) || !epicItem || !member || !epicId || !board.data.epics?.[epicId]) {
    return board;
  }
  if (member.id === epicItem.id || isEpic(board, member)) return board;
  if (epicOfMember(board, member)?.id === epicId) return board;

  const {
    board: next,
    ids: [id],
  } = withBlockIds(board, [member]);
  if (!id) return board;

  const epics = withoutMember(next.data.epics ?? {}, id);
  const epic = epics[epicId];
  return setEpics(next, { ...epics, [epicId]: { ...epic, cards: [...epic.cards, id] } });
}

/** Removes the card from whatever epic it is in. */
export function removeFromEpic(board: Board, card: Item): Board {
  const member = current(board, card);
  const id = member?.data.blockId;
  if (!canEdit(board) || !member || !id || !epicOfMember(board, member)) return board;
  return setEpics(board, withoutMember(board.data.epics ?? {}, id));
}

export function setEpicColor(board: Board, epicCard: Item, color: EpicColor): Board {
  const id = current(board, epicCard)?.data.blockId;
  const epic = id ? board.data.epics?.[id] : undefined;
  if (!canEdit(board) || !id || !epic || epic.color === color) return board;
  return setEpics(board, { ...board.data.epics, [id]: { ...epic, color } });
}

/**
 * Drops epics and members that left the board between `prev` and `next` (deleted, moved to
 * another board). Only block ids that were on `prev` count, so ids of cards the plugin never
 * saw (a hand-edited file) are kept. Returns `next` itself when nothing changed.
 */
export function pruneEpics(prev: Board, next: Board): Board {
  const epics = next.data.epics;
  if (!epics || !canEdit(next)) return next;

  const present = usedBlockIds(next);
  const gone = new Set([...usedBlockIds(prev)].filter((id) => !present.has(id)));
  if (!gone.size) return next;

  let changed = false;
  const result: Record<string, CardEpic> = {};
  for (const [id, epic] of Object.entries(epics)) {
    if (gone.has(id)) {
      changed = true;
      continue;
    }
    const cards = epic.cards.filter((card) => !gone.has(card));
    if (cards.length !== epic.cards.length) changed = true;
    result[id] = cards.length === epic.cards.length ? epic : { ...epic, cards };
  }

  return changed ? setEpics(next, result) : next;
}
