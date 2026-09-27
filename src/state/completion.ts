import update from 'immutability-helper';
import { Path } from 'src/dnd/types';
import { getEntityFromPath } from 'src/dnd/util/data';
import { getTaskStatusDone, getTaskStatusPreDone, toggleTask } from 'src/integrations/tasks';
import { Board, Item } from 'src/model/types';

import { StateManager } from './StateManager';

export function maybeCompleteForMove(
  sourceStateManager: StateManager,
  sourceBoard: Board,
  sourcePath: Path,
  destinationStateManager: StateManager,
  destinationBoard: Board,
  destinationPath: Path,
  item: Item
): { next: Item; replacement?: Item } {
  const sourceParent = getEntityFromPath(sourceBoard, sourcePath.slice(0, -1));
  const destinationParent = getEntityFromPath(destinationBoard, destinationPath.slice(0, -1));

  const oldShouldComplete = sourceParent?.data?.shouldMarkItemsComplete;
  const newShouldComplete = destinationParent?.data?.shouldMarkItemsComplete;

  // If neither the old or new lane set it complete, leave it alone
  if (!oldShouldComplete && !newShouldComplete) return { next: item };

  const isComplete =
    item.data.checked && item.data.checkChar === getTaskStatusDone(destinationStateManager.app);

  // If it already matches the new lane, leave it alone
  if (newShouldComplete === isComplete) return { next: item };

  if (newShouldComplete) {
    item = update(item, {
      data: { checkChar: { $set: getTaskStatusPreDone(destinationStateManager.app) } },
    });
  }

  const updates = toggleTask(destinationStateManager.app, item, destinationStateManager.file);

  if (updates) {
    const [itemStrings, checkChars, thisIndex] = updates;
    let next: Item;
    let replacement: Item;

    itemStrings.forEach((str, i) => {
      if (i === thisIndex) {
        // Still the same card: keep its identity (block id links, history).
        next = update(destinationStateManager.getNewItem(str, checkChars[i]), {
          id: { $set: item.id },
          data: { blockId: { $set: item.data.blockId } },
        });
      } else {
        replacement = destinationStateManager.getNewItem(str, checkChars[i]);
      }
    });

    return { next, replacement };
  }

  // It's different, update it
  return {
    next: update(item, {
      data: {
        checked: {
          $set: newShouldComplete,
        },
        checkChar: {
          $set: newShouldComplete ? getTaskStatusDone(destinationStateManager.app) : ' ',
        },
      },
    }),
  };
}
