/**
 * Relations between cards of one board. A relation is stored once, on its active side
 * (`blocks` on the blocking card), keyed by block ids; the passive side is derived here.
 * Cards get a block id when they take part in a relation.
 */
import update from 'immutability-helper';
import {
  Board,
  CardRelation,
  CardRelations,
  Item,
  RELATION_TYPES,
  RelationType,
} from 'src/model/types';

import { Placement, placements, usedBlockIds, withBlockIds } from './cardHistory';

/** A relation as seen from one card: `outgoing` when this card is the active side. */
export interface RelationKind {
  type: RelationType;
  outgoing: boolean;
}

/** Symmetric types read the same from both sides and are offered once. */
const SYMMETRIC: ReadonlySet<RelationType> = new Set(['relates-to']);

/** The relation kinds a user can pick, in menu order. */
export const RELATION_KINDS: readonly RelationKind[] = RELATION_TYPES.flatMap((type) =>
  SYMMETRIC.has(type)
    ? [{ type, outgoing: true }]
    : [
        { type, outgoing: true },
        { type, outgoing: false },
      ]
);

export function isRelationType(type: string): type is RelationType {
  return (RELATION_TYPES as readonly string[]).includes(type);
}

/** A relation of a card, resolved to the other card. */
export interface ResolvedRelation extends RelationKind {
  other: Item;
  /** The other card is in the archive. */
  archived: boolean;
  /** Title of the other card's lane; absent for archived cards. */
  laneTitle?: string;
  /** Block id of the card that stores the relation, and the stored entry. */
  owner: string;
  relation: CardRelation;
}

const indexCache = new WeakMap<Board, Map<string, ResolvedRelation[]>>();

/** Every card's resolved relations by block id, computed once per board state. */
function relationIndex(board: Board): Map<string, ResolvedRelation[]> {
  const cached = indexCache.get(board);
  if (cached) return cached;

  const byBlockId = new Map<string, Placement>();
  for (const p of placements(board)) {
    const id = p.item.data.blockId;
    if (id && !byBlockId.has(id)) byBlockId.set(id, p);
  }

  const outgoing = new Map<string, ResolvedRelation[]>();
  const incoming = new Map<string, ResolvedRelation[]>();
  const push = (map: Map<string, ResolvedRelation[]>, id: string, r: ResolvedRelation) =>
    map.set(id, [...(map.get(id) ?? []), r]);

  for (const [owner, list] of Object.entries(board.data.relations ?? {})) {
    const ownerCard = byBlockId.get(owner);
    if (!ownerCard) continue;
    for (const relation of list) {
      const target = byBlockId.get(relation.card);
      if (!target || relation.card === owner || !isRelationType(relation.type)) continue;
      const base = { type: relation.type, owner, relation };
      push(outgoing, owner, {
        ...base,
        outgoing: true,
        other: target.item,
        archived: target.laneIndex < 0,
        laneTitle: target.laneTitle,
      });
      push(incoming, relation.card, {
        ...base,
        outgoing: SYMMETRIC.has(relation.type),
        other: ownerCard.item,
        archived: ownerCard.laneIndex < 0,
        laneTitle: ownerCard.laneTitle,
      });
    }
  }

  const index = new Map<string, ResolvedRelation[]>();
  for (const id of new Set([...outgoing.keys(), ...incoming.keys()])) {
    index.set(id, [...(outgoing.get(id) ?? []), ...(incoming.get(id) ?? [])]);
  }
  indexCache.set(board, index);
  return index;
}

/** The card's relations, outgoing first, in stored order. Dangling and unknown ones are skipped. */
export function resolveRelations(board: Board, item: Item): ResolvedRelation[] {
  const own = item.data.blockId;
  if (!own || !board.data.relations) return [];
  return relationIndex(board).get(own) ?? [];
}

/** `true` when the relation blocks the card that shows it: its blocker is open. */
export function isActiveBlocker(r: ResolvedRelation): boolean {
  return r.type === 'blocks' && !r.outgoing && !r.archived && !r.other.data.checked;
}

/** Cards that block this one and are neither done nor archived. */
export function activeBlockers(board: Board, item: Item): Item[] {
  return resolveRelations(board, item)
    .filter(isActiveBlocker)
    .map((r) => r.other);
}

/**
 * Adds the relation `kind` from `from` to `to` (for an incoming kind, `to` stores it). Gives
 * both cards block ids if needed. An existing identical relation is not added twice.
 */
export function addRelation(board: Board, from: Item, kind: RelationKind, to: Item): Board {
  if (board.data.relationsRaw !== undefined || from.id === to.id) return board;

  const {
    board: next,
    ids: [fromId, toId],
  } = withBlockIds(board, [from, to]);
  if (!fromId || !toId || fromId === toId) return board;

  const [owner, card] = kind.outgoing ? [fromId, toId] : [toId, fromId];
  const relations: CardRelations = next.data.relations ?? {};
  const exists = (o: string, c: string) =>
    (relations[o] ?? []).some((r) => r.type === kind.type && r.card === c);
  if (exists(owner, card) || (SYMMETRIC.has(kind.type) && exists(card, owner))) return board;

  return update(next, {
    data: {
      relations: {
        $set: { ...relations, [owner]: [...(relations[owner] ?? []), { type: kind.type, card }] },
      },
    },
  });
}

/** Removes one stored relation (as returned in `ResolvedRelation`). */
export function removeRelation(board: Board, owner: string, relation: CardRelation): Board {
  const list = board.data.relations?.[owner];
  if (!list || board.data.relationsRaw !== undefined) return board;

  const index = list.findIndex((r) => r.type === relation.type && r.card === relation.card);
  if (index < 0) return board;

  const relations = { ...board.data.relations };
  const rest = list.filter((_, i) => i !== index);
  if (rest.length) relations[owner] = rest;
  else delete relations[owner];

  return update(board, { data: { relations: { $set: relations } } });
}

/**
 * Drops relations of cards that left the board between `prev` and `next` (deleted, moved to
 * another board). Only block ids that were on `prev` count, so relations to cards the plugin
 * never saw (a hand-edited file) are kept. Returns `next` itself when nothing changed.
 */
export function pruneRelations(prev: Board, next: Board): Board {
  const relations = next.data.relations;
  if (!relations || next.data.relationsRaw !== undefined) return next;

  const present = usedBlockIds(next);
  const gone = new Set([...usedBlockIds(prev)].filter((id) => !present.has(id)));
  if (!gone.size) return next;

  let changed = false;
  const result: CardRelations = {};
  for (const [owner, list] of Object.entries(relations)) {
    if (gone.has(owner)) {
      changed = true;
      continue;
    }
    const kept = list.filter((r) => !gone.has(r.card));
    if (kept.length !== list.length) changed = true;
    if (kept.length) result[owner] = kept;
  }

  return changed ? update(next, { data: { relations: { $set: result } } }) : next;
}
