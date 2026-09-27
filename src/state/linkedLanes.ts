/**
 * Linked lanes: a lane of this board also shows the cards of lanes on other boards.
 * The combined order lives in this board's `linked-lanes` setting (see model/types.ts);
 * the relative order of each board's cards always comes from that board's own file.
 */
import update from 'immutability-helper';
import { Board, Item, LinkedLane, LinkedLaneSource, LinkedLanes } from 'src/model/types';
import { KanbanSettings } from 'src/settings/types';

export const SELF_TOKEN = 'self';

/** A card in a combined lane; `source` is the linked board's path, null for own cards. */
export interface LaneEntry {
  source: string | null;
  item: Item;
}

export interface LinkedItems {
  file: string;
  items: Item[];
}

/** The order token of a linked card. */
export function cardRef(file: string, blockId: string) {
  return `${file}#^${blockId}`;
}

const isString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/** The board's linked lanes, skipping malformed entries (the setting is hand-editable JSON). */
export function readLinkedLanes(settings: KanbanSettings): LinkedLanes {
  const raw: unknown = settings?.['linked-lanes'];
  const result: LinkedLanes = {};
  if (!isObject(raw)) return result;

  for (const [lane, value] of Object.entries(raw)) {
    if (!isObject(value) || !Array.isArray(value.sources)) continue;

    const sources = value.sources.filter(
      (s): s is LinkedLaneSource => isObject(s) && isString(s.file) && isString(s.lane)
    );
    if (!sources.length) continue;

    const entry: LinkedLane = { sources: sources.map(({ file, lane }) => ({ file, lane })) };
    if (Array.isArray(value.order)) entry.order = value.order.filter(isString);
    result[lane] = entry;
  }

  return result;
}

/**
 * Build the combined card list of a lane. `order` places cards of each board; cards it does
 * not know (new, or never moved) go next to their neighbours in their own file.
 */
export function mergeLane(
  own: Item[],
  linked: LinkedItems[],
  order?: string[],
  idOf: (item: Item) => string | undefined = (item) => item.data.blockId
): LaneEntry[] {
  const byRef = new Map<string, LaneEntry>();
  for (const { file, items } of linked) {
    for (const item of items) {
      const id = idOf(item);
      if (id) byRef.set(cardRef(file, id), { source: file, item });
    }
  }

  // 1. Stored slots: own cards by count, linked cards by identity.
  const result: LaneEntry[] = [];
  const placed = new Set<Item>();
  let ownIndex = 0;

  for (const token of order ?? []) {
    if (token === SELF_TOKEN) {
      if (ownIndex < own.length) result.push({ source: null, item: own[ownIndex++] });
      continue;
    }
    const entry = byRef.get(token);
    if (entry && !placed.has(entry.item)) {
      placed.add(entry.item);
      result.push(entry);
    }
  }

  while (ownIndex < own.length)
    result.splice(ownEnd(result), 0, { source: null, item: own[ownIndex++] });

  // 2. Unplaced linked cards go after their predecessor (or before their successor) in their file.
  for (const { file, items } of linked) {
    items.forEach((item, i) => {
      if (placed.has(item)) return;

      const entry = { source: file, item };
      const prev = findLast(items.slice(0, i), (it) => placed.has(it));
      const next = items.slice(i + 1).find((it) => placed.has(it));

      if (prev) result.splice(indexOfItem(result, prev) + 1, 0, entry);
      else if (next) result.splice(indexOfItem(result, next), 0, entry);
      else result.push(entry);

      placed.add(item);
    });
  }

  // 3. Each linked lane's slots take its cards in file order, so reordering there shows up here.
  for (const { file, items } of linked) {
    const group = new Set(items);
    let i = 0;
    result.forEach((entry, pos) => {
      if (group.has(entry.item)) result[pos] = { source: file, item: items[i++] };
    });
  }

  return result;
}

/** Own cards without a slot go after the last own card, or before the linked ones. */
function ownEnd(result: LaneEntry[]) {
  for (let i = result.length - 1; i >= 0; i--) if (result[i].source === null) return i + 1;
  return result.length;
}

function indexOfItem(entries: LaneEntry[], item: Item) {
  return entries.findIndex((e) => e.item === item);
}

function findLast<T>(arr: T[], pred: (v: T) => boolean): T | undefined {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return arr[i];
  return undefined;
}

/** Replace the sources of an own lane; drops the entry (and its order) when none are left. */
export function setLaneSources(
  linked: LinkedLanes,
  laneTitle: string,
  sources: LinkedLaneSource[]
): LinkedLanes {
  const next = { ...linked };
  if (!sources.length) {
    delete next[laneTitle];
    return next;
  }

  const files = new Set(sources.map((s) => s.file));
  const order = linked[laneTitle]?.order?.filter(
    (token) => token === SELF_TOKEN || files.has(refFile(token))
  );
  next[laneTitle] = order?.length ? { sources, order } : { sources };
  return next;
}

/** Follow a rename of an own lane. */
export function renameLinkedLane(linked: LinkedLanes, from: string, to: string): LinkedLanes {
  if (from === to || !linked[from] || linked[to]) return linked;
  const next = { ...linked, [to]: linked[from] };
  delete next[from];
  return next;
}

/** The board path of an order token (`<path>#^<blockId>`). */
export function refFile(token: string) {
  const i = token.lastIndexOf('#^');
  return i < 0 ? '' : token.slice(0, i);
}

/** Keep the `linked-lanes` entry of an own lane when the lane is renamed. */
export function followLaneRename(board: Board, from: string, to: string): Board {
  const linked = board.data.settings['linked-lanes'];
  if (!linked || from === undefined || from === to) return board;

  const next = renameLinkedLane(linked, from, to);
  if (next === linked) return board;
  return update(board, { data: { settings: { 'linked-lanes': { $set: next } } } });
}

export type GetBoard = (file: string) => Board | undefined;

export interface ResolvedLaneSource extends LinkedItems {
  laneIndex: number;
}

/** The loaded lanes that `linked` points at; missing boards or lanes are skipped. */
export function resolveLaneSources(
  linked: LinkedLane | undefined,
  getBoard: GetBoard
): ResolvedLaneSource[] {
  const result: ResolvedLaneSource[] = [];

  for (const source of linked?.sources ?? []) {
    const board = getBoard(source.file);
    const laneIndex = board?.children.findIndex((l) => l.data.title === source.lane) ?? -1;
    if (laneIndex < 0) continue;
    if (result.some((r) => r.file === source.file && r.laneIndex === laneIndex)) continue;

    result.push({ file: source.file, laneIndex, items: board.children[laneIndex].children });
  }

  return result;
}

/** The combined card list of an own lane, or null when it shows no linked lanes. */
export function laneEntries(
  board: Board,
  laneIndex: number,
  getBoard: GetBoard,
  idOf?: (item: Item) => string | undefined
): LaneEntry[] | null {
  const lane = board.children[laneIndex];
  if (!lane) return null;

  const linked = readLinkedLanes(board.data.settings)[lane.data.title];
  const sources = resolveLaneSources(linked, getBoard);
  if (!sources.length) return null;

  return mergeLane(lane.children, sources, linked.order, idOf);
}

/** Follow a rename or move of a linked board file. Returns `linked` itself if unaffected. */
export function retargetLinkedFile(linked: LinkedLanes, from: string, to: string): LinkedLanes {
  let changed = false;
  const next: LinkedLanes = {};

  for (const [title, entry] of Object.entries(linked)) {
    const sources = entry.sources.map((s) => (s.file === from ? { ...s, file: to } : s));
    const order = entry.order?.map((token) =>
      refFile(token) === from ? to + token.slice(from.length) : token
    );
    const touched = sources.some((s, i) => s !== entry.sources[i]);
    changed ||= touched;
    next[title] = touched ? (order ? { sources, order } : { sources }) : entry;
  }

  return changed ? next : linked;
}

/** Follow a rename of a lane on a linked board. Returns `linked` itself if unaffected. */
export function renameLinkedSourceLane(
  linked: LinkedLanes,
  file: string,
  from: string,
  to: string
): LinkedLanes {
  let changed = false;
  const next: LinkedLanes = {};

  for (const [title, entry] of Object.entries(linked)) {
    const sources = entry.sources.map((s) =>
      s.file === file && s.lane === from ? { ...s, lane: to } : s
    );
    const touched = sources.some((s, i) => s !== entry.sources[i]);
    changed ||= touched;
    next[title] = touched ? { ...entry, sources } : entry;
  }

  return changed ? next : linked;
}
