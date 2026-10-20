/**
 * Sending a card of a lane that shows linked lanes to one of those lanes' boards (card menu).
 * The card leaves this board's file and lands in the other board's lane; the combined lane
 * then shows it as a linked card.
 */
import update from 'immutability-helper';
import { Notice } from 'obsidian';
import { Path } from 'src/dnd/types';
import { getEntityFromPath, insertEntity, removeEntity } from 'src/dnd/util/data';
import { t } from 'src/lang/helpers';
import { Board, DataTypes, Item } from 'src/model/types';

import { StateManager } from './StateManager';
import { carryCardHistory } from './cardHistory';
import { maybeCompleteForMove } from './completion';
import { resolveDisplayPath } from './linkedDrop';
import { GetBoard, SELF_TOKEN, readLinkedLanes, resolveLaneSources } from './linkedLanes';

export interface LinkedMoveTarget {
  file: string;
  lane: string;
  laneIndex: number;
}

/** The lanes an own card of lane `laneIndex` can be sent to: the lanes it is linked with. */
export function linkedMoveTargets(
  board: Board,
  laneIndex: number,
  getBoard: GetBoard
): LinkedMoveTarget[] {
  const title = board.children[laneIndex]?.data.title;
  if (title === undefined) return [];

  const linked = readLinkedLanes(board.data.settings)[title];
  return resolveLaneSources(linked, getBoard).map(({ file, laneIndex: target }) => ({
    file,
    lane: getBoard(file).children[target].data.title,
    laneIndex: target,
  }));
}

/**
 * How a target is named in the card menu: the board, plus its lane when that is not obvious
 * (the lane is named differently from the card's own, or the board has several targets).
 */
export function linkedMoveLabel(
  target: LinkedMoveTarget,
  targets: LinkedMoveTarget[],
  laneTitle: string | undefined,
  boardName: string
): string {
  const sameBoard = targets.filter((other) => other.file === target.file).length;
  return sameBoard > 1 || target.lane !== laneTitle ? `${boardName} / ${target.lane}` : boardName;
}

/** The card's path in this board's own file, or null for a card of another board. */
export function ownCardPath(board: Board, path: Path, getBoard: GetBoard): Path | null {
  const resolved = resolveDisplayPath(board, path, getBoard);
  return resolved && resolved.file === null ? resolved.path : null;
}

/**
 * Forget the stored slot of the own card at `ownPath`, so the cards after it keep their
 * places in the combined lane (own cards take `self` slots by count).
 */
export function dropOwnSlot(board: Board, ownPath: Path): Board {
  const [laneIndex, ownIndex] = ownPath;
  const title = board.children[laneIndex]?.data.title;
  const linked = readLinkedLanes(board.data.settings);
  const order = linked[title]?.order;
  if (!order) return board;

  let seen = 0;
  const slot = order.findIndex((token) => token === SELF_TOKEN && seen++ === ownIndex);
  if (slot < 0) return board;

  return update(board, {
    data: {
      settings: {
        'linked-lanes': {
          $set: {
            ...linked,
            [title]: { ...linked[title], order: order.filter((_, i) => i !== slot) },
          },
        },
      },
    },
  });
}

/**
 * Send the own card at `ownPath` of `source` to the lane `target` of `destination`. The other
 * board gets it first and is checked before the card leaves this one, so a failure can only
 * leave a duplicate, never lose the card. Completion rules and history follow a drag to
 * another board. Returns whether the card was moved.
 */
export function sendCardToLinkedBoard(
  source: StateManager,
  destination: StateManager,
  ownPath: Path,
  target: LinkedMoveTarget
): boolean {
  const sourceBoard = source.state;
  const item = getEntityFromPath<Item>(sourceBoard, ownPath);
  if (item?.type !== DataTypes.Item) return false;

  // The lane is found by title again: the board may have changed since the menu opened.
  const laneIndex = destination.state?.children.findIndex((l) => l.data.title === target.lane);
  if (laneIndex === undefined || laneIndex < 0 || destination.hasError()) {
    new Notice(t('Could not move the card: the list was not found in the other board'));
    return false;
  }

  let replacement: Item | undefined;

  destination.setState((board) => {
    const lane = board.children[laneIndex];
    const append = (destination.getSetting('new-card-insertion-method') || 'append') === 'append';
    const dropPath = [laneIndex, append ? lane.children.length : 0];
    const completed = maybeCompleteForMove(
      source,
      sourceBoard,
      ownPath,
      destination,
      board,
      dropPath,
      item
    );
    replacement = completed.replacement;

    let next = board;
    let moved = completed.next;
    if (destination.getSetting('card-history') !== false) {
      const carried = carryCardHistory(sourceBoard, board, moved, {
        from: sourceBoard.children[ownPath[0]]?.data.title,
        to: lane.data.title,
      });
      next = carried.destination;
      moved = carried.item;
    }
    return insertEntity(next, dropPath, [moved]);
  });

  const arrived = destination.state.children[laneIndex]?.children.some((i) => i.id === item.id);
  if (!arrived) {
    new Notice(t('Could not move the card: the list was not found in the other board'));
    return false;
  }

  source.setState((board) => {
    const next = removeEntity(board, ownPath, replacement);
    // A replacement takes the card's place, so its slot stays.
    return replacement ? next : dropOwnSlot(next, ownPath);
  });
  return true;
}
