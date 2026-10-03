/**
 * Drag and drop of cards in lanes that show linked lanes (see state/linkedDrop.ts).
 * Positions coming from the DnD engine are positions in the combined lists; these helpers
 * turn them into moves inside the cards' own files.
 */
import { TFile } from 'obsidian';
import { Entity, Path } from 'src/dnd/types';
import { getEntityFromPath, moveEntity, updateEntity } from 'src/dnd/util/data';
import { Board, DataTypes, Item, Lane } from 'src/model/types';
import type KanbanPlugin from 'src/plugin/KanbanPlugin';
import { getBoardColor } from 'src/shared/colors';
import { StateManager } from 'src/state/StateManager';
import { maybeCompleteForMove } from 'src/state/completion';
import {
  LinkedDropPlan,
  applyBlockIds,
  applyOrders,
  isMixedLane,
  planLinkedDrop,
  resolveDisplayPath,
  toOwnSlot,
} from 'src/state/linkedDrop';
import { GetBoard, readLinkedLanes, resolveLaneSources } from 'src/state/linkedLanes';

function stateManagerByPath(plugin: KanbanPlugin, path: string): StateManager | undefined {
  const file = plugin.app.vault.getAbstractFileByPath(path);
  return file instanceof TFile ? plugin.stateManagers.get(file) : undefined;
}

/** Linked boards as the UI sees them: a board never shows itself (see useLinkedBoards). */
function boardGetter(plugin: KanbanPlugin, own: StateManager): GetBoard {
  return (path) => (path === own.file.path ? undefined : stateManagerByPath(plugin, path)?.state);
}

function stateManagerOf(plugin: KanbanPlugin, entity: Entity) {
  const view = plugin.getKanbanView(entity.scopeId, entity.getData().win);
  return view ? plugin.stateManagers.get(view.file) : undefined;
}

/** Cards of linked boards may only be dropped into lanes that show a lane of their board. */
export function getLinkedDropFilter(plugin: KanbanPlugin, dragEntity: Entity) {
  if (dragEntity.getData().type !== DataTypes.Item) return null;

  const stateManager = stateManagerOf(plugin, dragEntity);
  if (!stateManager?.state) return null;

  const getBoard = boardGetter(plugin, stateManager);
  const board = stateManager.state;
  const resolved = resolveDisplayPath(board, dragEntity.getPath(), getBoard);
  if (!resolved?.file) return null;

  const linked = readLinkedLanes(board.data.settings);
  const allowed = new Set<number>();
  board.children.forEach((lane, i) => {
    const sources = resolveLaneSources(linked[lane.data.title], getBoard);
    if (sources.some((s) => s.file === resolved.file)) allowed.add(i);
  });

  return (dropEntity: Entity) =>
    dropEntity.scopeId === dragEntity.scopeId && allowed.has(dropEntity.getPath()[0]);
}

export type LinkedDropResult =
  /** Not about linked lanes: handle as usual. */
  | null
  /** Done (or refused). */
  | 'handled'
  /** A move between two boards: handle as usual with these own-board paths. */
  | { dragPath: Path; dropPath: Path };

/** Handle an item drop if a lane with linked lanes is involved. */
export function handleLinkedDrop(
  plugin: KanbanPlugin,
  dragEntity: Entity,
  dropEntity: Entity,
  dropPath: Path
): LinkedDropResult {
  if (dragEntity.getData().type !== DataTypes.Item) return null;

  const dragStateManager = stateManagerOf(plugin, dragEntity);
  const dropStateManager = stateManagerOf(plugin, dropEntity);
  if (!dragStateManager || !dropStateManager) return null;

  const dragGetBoard = boardGetter(plugin, dragStateManager);
  const dropGetBoard = boardGetter(plugin, dropStateManager);
  const dragPath = dragEntity.getPath();
  const dragMixed = isMixedLane(dragStateManager.state, dragPath[0], dragGetBoard);
  const dropMixed = isMixedLane(dropStateManager.state, dropPath[0], dropGetBoard);
  if (!dragMixed && !dropMixed) return null;

  if (dragStateManager === dropStateManager) {
    const plan = planLinkedDrop(dragStateManager.state, dragGetBoard, dragPath, dropPath);
    if (plan) applyPlan(plugin, dragStateManager, plan);
    return 'handled';
  }

  // Between two boards: only own cards travel, and only their own-board positions matter.
  const resolved = dragMixed
    ? resolveDisplayPath(dragStateManager.state, dragPath, dragGetBoard)
    : { file: null, path: dragPath };
  if (!resolved || resolved.file !== null) return 'handled';

  return {
    dragPath: resolved.path,
    dropPath: dropMixed ? toOwnSlot(dropStateManager.state, dropPath, dropGetBoard) : dropPath,
  };
}

function applyPlan(plugin: KanbanPlugin, stateManager: StateManager, plan: LinkedDropPlan) {
  const idsByFile = new Map<string, LinkedDropPlan['blockIds']>();
  plan.blockIds.forEach((b) => idsByFile.set(b.file, [...(idsByFile.get(b.file) ?? []), b]));

  if (plan.move) {
    const { file, from, to } = plan.move;
    const target = file === null ? stateManager : stateManagerByPath(plugin, file);

    target?.setState((board) => {
      let next = moveWithCompletion(target, board, from, to);
      if (file === null) next = applyOrders(next, plan.orders);
      else next = applyBlockIds(next, idsByFile.get(file) ?? []);
      return next;
    });

    if (file) idsByFile.delete(file);
  }

  idsByFile.forEach((ids, file) => {
    stateManagerByPath(plugin, file)?.setState((board) => applyBlockIds(board, ids));
  });

  if (plan.move?.file !== null) {
    stateManager.setState((board) => applyOrders(board, plan.orders));
  }
}

/** Same as a move within one board: completion rules and lane sorting as in DragDropApp. */
function moveWithCompletion(stateManager: StateManager, board: Board, from: Path, to: Path) {
  const complete = (entity: Item) =>
    maybeCompleteForMove(stateManager, board, from, stateManager, board, to, entity);

  const moved = moveEntity(
    board,
    from,
    to,
    (entity) => complete(entity as Item).next,
    (entity) => complete(entity as Item).replacement
  );

  const lanePath = to.slice(0, -1);
  return getEntityFromPath<Lane>(board, lanePath)?.data?.sorted !== undefined
    ? updateEntity<Board, Lane>(moved, lanePath, { data: { $unset: ['sorted'] } })
    : moved;
}

/** For the drag overlay: the linked board a dragged card belongs to, if any. */
export function getLinkedOverlaySource(
  plugin: KanbanPlugin,
  stateManager: StateManager,
  path: Path
) {
  const resolved = resolveDisplayPath(stateManager.state, path, boardGetter(plugin, stateManager));
  if (!resolved?.file) return null;

  const source = stateManagerByPath(plugin, resolved.file);
  return source
    ? {
        stateManager: source,
        color: getBoardColor(resolved.file, source.getSetting('board-color')),
      }
    : null;
}

/** Entity data without the fields the DnD engine adds (sortAxis, win). */
export function getEntityData(data: Record<string, any>): Item {
  const { sortAxis, win, ...entity } = data;
  return entity as Item;
}
