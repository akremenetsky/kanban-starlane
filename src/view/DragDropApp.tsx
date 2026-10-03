import classcat from 'classcat';
import update from 'immutability-helper';
import { JSX, createPortal, memo, useCallback, useMemo } from 'preact/compat';
import { DraggableItem } from 'src/components/Item/Item';
import { DraggableLane } from 'src/components/Lane/Lane';
import { KanbanContext } from 'src/components/context';
import { c } from 'src/components/helpers';
import { FRONTMATTER_KEY } from 'src/constants';
import { DndContext } from 'src/dnd/components/DndContext';
import { DragOverlay } from 'src/dnd/components/DragOverlay';
import { Entity, Nestable } from 'src/dnd/types';
import {
  getEntityFromPath,
  insertEntity,
  moveEntity,
  removeEntity,
  updateEntity,
} from 'src/dnd/util/data';
import { getTaskStatusDone, getTaskStatusPreDone, toggleTask } from 'src/integrations/tasks';
import { Board, DataTypes, Item, Lane } from 'src/model/types';
import KanbanPlugin from 'src/plugin/KanbanPlugin';
import { getBoardModifiers } from 'src/state/boardModifiers';
import { carryCardHistory } from 'src/state/cardHistory';
import { maybeCompleteForMove } from 'src/state/completion';

import { KanbanView } from './KanbanView';
import {
  getEntityData,
  getLinkedDropFilter,
  getLinkedOverlaySource,
  handleLinkedDrop,
} from './linkedDrop';

export function createApp(win: Window, plugin: KanbanPlugin) {
  return <DragDropApp win={win} plugin={plugin} />;
}

const View = memo(function View({ view }: { view: KanbanView }) {
  return createPortal(view.getPortal(), view.contentEl);
});

export function DragDropApp({ win, plugin }: { win: Window; plugin: KanbanPlugin }) {
  const views = plugin.useKanbanViews(win);
  const portals: JSX.Element[] = views.map((view) => <View key={view.id} view={view} />);

  const handleDrop = useCallback(
    (dragEntity: Entity, dropEntity: Entity) => {
      if (!dragEntity || !dropEntity) {
        return;
      }

      if (dragEntity.scopeId === 'htmldnd') {
        const data = dragEntity.getData();
        const stateManager = plugin.getStateManagerFromViewID(data.viewId, data.win);
        const dropPath = dropEntity.getPath();
        const destinationParent = getEntityFromPath(stateManager.state, dropPath.slice(0, -1));

        try {
          const items: Item[] = data.content.map((title: string) => {
            let item = stateManager.getNewItem(title, ' ');
            const isComplete = !!destinationParent?.data?.shouldMarkItemsComplete;

            if (isComplete) {
              item = update(item, {
                data: { checkChar: { $set: getTaskStatusPreDone(stateManager.app) } },
              });
              const updates = toggleTask(stateManager.app, item, stateManager.file);
              if (updates) {
                const [itemStrings, checkChars, thisIndex] = updates;
                const nextItem = itemStrings[thisIndex];
                const checkChar = checkChars[thisIndex];
                return stateManager.getNewItem(nextItem, checkChar);
              }
            }

            return update(item, {
              data: {
                checked: {
                  $set: !!destinationParent?.data?.shouldMarkItemsComplete,
                },
                checkChar: {
                  $set: destinationParent?.data?.shouldMarkItemsComplete
                    ? getTaskStatusDone(stateManager.app)
                    : ' ',
                },
              },
            });
          });

          return stateManager.setState((board) => insertEntity(board, dropPath, items));
        } catch (e) {
          stateManager.setError(e);
          console.error(e);
        }

        return;
      }

      let dragPath = dragEntity.getPath();
      let dropPath = dropEntity.getPath();
      const dragEntityData = dragEntity.getData();
      const dropEntityData = dropEntity.getData();
      const [, sourceFile] = dragEntity.scopeId.split(':::');
      const [, destinationFile] = dropEntity.scopeId.split(':::');

      const inDropArea =
        dropEntityData.acceptsSort && !dropEntityData.acceptsSort.includes(dragEntityData.type);

      const linked = handleLinkedDrop(plugin, dragEntity, dropEntity, dropPath);
      if (linked === 'handled') return;
      if (linked) {
        dragPath = linked.dragPath;
        dropPath = linked.dropPath;
      }

      // Same board
      if (sourceFile === destinationFile) {
        const view = plugin.getKanbanView(dragEntity.scopeId, dragEntityData.win);
        const stateManager = plugin.stateManagers.get(view.file);

        if (inDropArea) {
          dropPath.push(0);
        }

        return stateManager.setState((board) => {
          const entity = getEntityFromPath(board, dragPath);
          const newBoard: Board = moveEntity(
            board,
            dragPath,
            dropPath,
            (entity) => {
              if (entity.type === DataTypes.Item) {
                const { next } = maybeCompleteForMove(
                  stateManager,
                  board,
                  dragPath,
                  stateManager,
                  board,
                  dropPath,
                  entity
                );
                return next;
              }
              return entity;
            },
            (entity) => {
              if (entity.type === DataTypes.Item) {
                const { replacement } = maybeCompleteForMove(
                  stateManager,
                  board,
                  dragPath,
                  stateManager,
                  board,
                  dropPath,
                  entity
                );
                return replacement;
              }
            }
          );

          if (entity.type === DataTypes.Lane) {
            const from = dragPath.last();
            let to = dropPath.last();

            if (from < to) to -= 1;

            const collapsedState = view.getViewState('list-collapse');
            const op = (collapsedState: boolean[]) => {
              const newState = [...collapsedState];
              newState.splice(to, 0, newState.splice(from, 1)[0]);
              return newState;
            };

            view.setViewState('list-collapse', undefined, op);

            return update<Board>(newBoard, {
              data: { settings: { 'list-collapse': { $set: op(collapsedState) } } },
            });
          }

          // Remove sorting in the destination lane
          const destinationParentPath = dropPath.slice(0, -1);
          const destinationParent = getEntityFromPath(board, destinationParentPath);

          if (destinationParent?.data?.sorted !== undefined) {
            return updateEntity(newBoard, destinationParentPath, {
              data: {
                $unset: ['sorted'],
              },
            });
          }

          return newBoard;
        });
      }

      const sourceView = plugin.getKanbanView(dragEntity.scopeId, dragEntityData.win);
      const sourceStateManager = plugin.stateManagers.get(sourceView.file);
      const destinationView = plugin.getKanbanView(dropEntity.scopeId, dropEntityData.win);
      const destinationStateManager = plugin.stateManagers.get(destinationView.file);

      sourceStateManager.setState((sourceBoard) => {
        const entity = getEntityFromPath(sourceBoard, dragPath);
        let replacementEntity: Nestable;

        destinationStateManager.setState((destinationBoard) => {
          if (inDropArea) {
            const parent = getEntityFromPath(destinationStateManager.state, dropPath);
            const shouldAppend =
              (destinationStateManager.getSetting('new-card-insertion-method') || 'append') ===
              'append';

            if (shouldAppend) dropPath.push(parent.children.length);
            else dropPath.push(0);
          }

          const toInsert: Nestable[] = [];
          const recordHistory = destinationStateManager.getSetting('card-history') !== false;

          if (entity.type === DataTypes.Item) {
            const { next, replacement } = maybeCompleteForMove(
              sourceStateManager,
              sourceBoard,
              dragPath,
              destinationStateManager,
              destinationBoard,
              dropPath,
              entity
            );
            replacementEntity = replacement;

            if (recordHistory) {
              const carried = carryCardHistory(sourceBoard, destinationBoard, next, {
                from: sourceBoard.children[dragPath[0]]?.data.title,
                to: destinationBoard.children[dropPath[0]]?.data.title,
              });
              destinationBoard = carried.destination;
              toInsert.push(carried.item);
            } else {
              toInsert.push(next);
            }
          } else if (entity.type === DataTypes.Lane && recordHistory) {
            const lane = entity as Lane;
            const children = lane.children.map((item) => {
              const carried = carryCardHistory(sourceBoard, destinationBoard, item, {
                from: lane.data.title,
                to: lane.data.title,
              });
              destinationBoard = carried.destination;
              return carried.item;
            });
            toInsert.push(update(lane, { children: { $set: children } }));
          } else {
            toInsert.push(entity);
          }

          if (entity.type === DataTypes.Lane) {
            const collapsedState = destinationView.getViewState('list-collapse');
            const val = sourceView.getViewState('list-collapse')[dragPath.last()];
            const op = (collapsedState: boolean[]) => {
              const newState = [...collapsedState];
              newState.splice(dropPath.last(), 0, val);
              return newState;
            };

            destinationView.setViewState('list-collapse', undefined, op);

            return update<Board>(insertEntity(destinationBoard, dropPath, toInsert), {
              data: { settings: { 'list-collapse': { $set: op(collapsedState) } } },
            });
          } else {
            return insertEntity(destinationBoard, dropPath, toInsert);
          }
        });

        if (entity.type === DataTypes.Lane) {
          const collapsedState = sourceView.getViewState('list-collapse');
          const op = (collapsedState: boolean[]) => {
            const newState = [...collapsedState];
            newState.splice(dragPath.last(), 1);
            return newState;
          };
          sourceView.setViewState('list-collapse', undefined, op);

          return update<Board>(removeEntity(sourceBoard, dragPath), {
            data: { settings: { 'list-collapse': { $set: op(collapsedState) } } },
          });
        } else {
          return removeEntity(sourceBoard, dragPath, replacementEntity);
        }
      });
    },
    [views]
  );

  const getDropFilter = useCallback(
    (dragEntity: Entity) => getLinkedDropFilter(plugin, dragEntity),
    [plugin]
  );

  if (portals.length)
    return (
      <DndContext win={win} onDrop={handleDrop} getDropFilter={getDropFilter}>
        {...portals}
        <DragOverlay>
          {(entity, styles) => {
            const [data, context] = useMemo(() => {
              if (entity.scopeId === 'htmldnd') {
                return [null, null];
              }

              const overlayData = entity.getData();

              const view = plugin.getKanbanView(entity.scopeId, overlayData.win);
              const ownStateManager = plugin.stateManagers.get(view.file);

              if (overlayData.type === DataTypes.Item) {
                // In combined lanes the card may belong to a linked board.
                const source = getLinkedOverlaySource(plugin, ownStateManager, entity.getPath());
                const stateManager = source?.stateManager ?? ownStateManager;
                return [
                  getEntityData(overlayData),
                  {
                    view,
                    stateManager,
                    boardModifiers: getBoardModifiers(view, stateManager),
                    filePath: stateManager.file.path,
                    linkedColor: source?.color,
                  },
                ];
              }

              const data = getEntityFromPath(ownStateManager.state, entity.getPath());
              const boardModifiers = getBoardModifiers(view, ownStateManager);
              const filePath = view.file.path;

              return [
                data,
                {
                  view,
                  stateManager: ownStateManager,
                  boardModifiers,
                  filePath,
                },
              ];
            }, [entity]);

            if (data?.type === DataTypes.Lane) {
              const boardView =
                context?.view.viewSettings[FRONTMATTER_KEY] ||
                context?.stateManager.getSetting(FRONTMATTER_KEY);
              const collapseState =
                context?.view.viewSettings['list-collapse'] ||
                context?.stateManager.getSetting('list-collapse');
              const laneIndex = entity.getPath().last();

              return (
                <KanbanContext.Provider value={context}>
                  <div
                    className={classcat([
                      c('drag-container'),
                      {
                        [c('horizontal')]: boardView !== 'list',
                        [c('vertical')]: boardView === 'list',
                      },
                    ])}
                    style={styles}
                  >
                    <DraggableLane
                      lane={data as Lane}
                      laneIndex={laneIndex}
                      isStatic={true}
                      isCollapsed={!!collapseState[laneIndex]}
                      collapseDir={boardView === 'list' ? 'vertical' : 'horizontal'}
                    />
                  </div>
                </KanbanContext.Provider>
              );
            }

            if (data?.type === DataTypes.Item) {
              return (
                <KanbanContext.Provider value={context}>
                  <div className={c('drag-container')} style={styles}>
                    <DraggableItem
                      item={data as Item}
                      itemIndex={0}
                      isStatic={true}
                      linkedColor={(context as { linkedColor?: string }).linkedColor}
                    />
                  </div>
                </KanbanContext.Provider>
              );
            }

            return <div />;
          }}
        </DragOverlay>
      </DndContext>
    );
}
