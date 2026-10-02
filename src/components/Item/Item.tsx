import classcat from 'classcat';
import { ComponentChildren } from 'preact';
import {
  JSX,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/compat';
import { KanbanContext, SearchContext } from 'src/components/context';
import { c } from 'src/components/helpers';
import { LinkedBoardProvider, LinkedLanesContext } from 'src/components/linkedLanes';
import { FRONTMATTER_KEY } from 'src/constants';
import { Droppable, useNestedEntityPath } from 'src/dnd/components/Droppable';
import { DndManagerContext, ExplicitPathContext } from 'src/dnd/components/context';
import { useDragHandle } from 'src/dnd/managers/DragManager';
import { EditState, EditingState, Item, isEditing } from 'src/model/types';
import { LaneEntry } from 'src/state/linkedLanes';

import { ItemCheckbox } from './ItemCheckbox';
import { ItemContent } from './ItemContent';
import { useItemMenu } from './ItemMenu';
import { ItemMenuButton } from './ItemMenuButton';
import { ItemMetadata } from './MetadataTable';
import { getItemClassModifiers } from './classModifiers';

export interface DraggableItemProps {
  item: Item;
  itemIndex: number;
  isStatic?: boolean;
  shouldMarkItemsComplete?: boolean;
  /** Set for cards of a linked board: the colour of the stripe that marks them. */
  linkedColor?: string;
}

export interface ItemInnerProps {
  item: Item;
  isStatic?: boolean;
  shouldMarkItemsComplete?: boolean;
  isMatch?: boolean;
  searchQuery?: string;
}

const ItemInner = memo(function ItemInner({
  item,
  shouldMarkItemsComplete,
  isMatch,
  searchQuery,
  isStatic,
}: ItemInnerProps) {
  const { stateManager, boardModifiers, view } = useContext(KanbanContext);
  const [editState, setEditState] = useState<EditState>(EditingState.cancel);

  const dndManager = useContext(DndManagerContext);

  useEffect(() => {
    const handler = () => {
      if (isEditing(editState)) setEditState(EditingState.cancel);
    };

    dndManager.dragManager.emitter.on('dragStart', handler);
    return () => {
      dndManager.dragManager.emitter.off('dragStart', handler);
    };
  }, [dndManager, editState]);

  useEffect(() => {
    if (item.data.forceEditMode) {
      setEditState({ x: 0, y: 0 });
    }
  }, [item.data.forceEditMode]);

  const path = useNestedEntityPath();

  const showItemMenu = useItemMenu({
    boardModifiers,
    item,
    setEditState: setEditState,
    stateManager,
    path,
    linkedFrom: stateManager.file !== view.file ? stateManager.file : null,
  });

  const onContextMenu: JSX.MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (isEditing(editState)) return;
      if (
        e.targetNode.instanceOf(HTMLAnchorElement) &&
        (e.targetNode.hasClass('internal-link') || e.targetNode.hasClass('external-link'))
      ) {
        return;
      }
      showItemMenu(e);
    },
    [showItemMenu, editState]
  );

  const onDoubleClick: JSX.MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => setEditState({ x: e.clientX, y: e.clientY }),
    [setEditState]
  );

  const ignoreAttr = useMemo(() => {
    if (isEditing(editState)) {
      return {
        'data-ignore-drag': true,
      };
    }

    return {};
  }, [editState]);

  return (
    <div
      // eslint-disable-next-line react/no-unknown-property -- Preact handles onDblClick, which the React lint rules do not know
      onDblClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={c('item-content-wrapper')}
      {...ignoreAttr}
    >
      <div className={c('item-title-wrapper')} {...ignoreAttr}>
        <ItemCheckbox
          boardModifiers={boardModifiers}
          item={item}
          path={path}
          shouldMarkItemsComplete={shouldMarkItemsComplete}
          stateManager={stateManager}
        />
        <ItemContent
          item={item}
          searchQuery={isMatch ? searchQuery : undefined}
          setEditState={setEditState}
          editState={editState}
          isStatic={isStatic}
        />
        <ItemMenuButton editState={editState} setEditState={setEditState} showMenu={showItemMenu} />
      </div>
      <ItemMetadata searchQuery={isMatch ? searchQuery : undefined} item={item} />
    </div>
  );
});

export const DraggableItem = memo(function DraggableItem(props: DraggableItemProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const search = useContext(SearchContext);
  const { stateManager } = useContext(KanbanContext);

  const { itemIndex, linkedColor, ...innerProps } = props;

  const bindHandle = useDragHandle(measureRef, measureRef);

  const isMatch = search?.query ? innerProps.item.data.titleSearch.includes(search.query) : false;
  const classModifiers: string[] = getItemClassModifiers(stateManager.app, innerProps.item);

  return (
    <div
      ref={(el) => {
        measureRef.current = el;
        bindHandle(el);
      }}
      className={c('item-wrapper')}
    >
      <div
        ref={elementRef}
        className={classcat([c('item'), { [c('item-linked')]: !!linkedColor }, ...classModifiers])}
        style={linkedColor ? { [`--${c('board-color')}`]: linkedColor } : undefined}
      >
        {props.isStatic ? (
          <ItemInner
            {...innerProps}
            isMatch={isMatch}
            searchQuery={search?.query}
            isStatic={true}
          />
        ) : (
          <Droppable
            elementRef={elementRef}
            measureRef={measureRef}
            id={props.item.id}
            index={itemIndex}
            data={props.item}
          >
            <ItemInner {...innerProps} isMatch={isMatch} searchQuery={search?.query} />
          </Droppable>
        )}
      </div>
    </div>
  );
});

interface ItemsProps {
  isStatic?: boolean;
  items: Item[];
  shouldMarkItemsComplete: boolean;
  /** Combined card list of a lane with linked lanes (see state/linkedLanes.ts). */
  entries?: LaneEntry[] | null;
  laneIndex?: number;
}

export const Items = memo(function Items({
  isStatic,
  items,
  shouldMarkItemsComplete,
  entries,
  laneIndex,
}: ItemsProps) {
  const search = useContext(SearchContext);
  const { view } = useContext(KanbanContext);
  const boardView = view.useViewState(FRONTMATTER_KEY);

  if (entries) {
    let ownIndex = 0;
    return (
      <>
        {entries.map((entry, i) => {
          const ownPath = entry.source ? null : [laneIndex, ownIndex++];
          if (search?.query && !search.items.has(entry.item)) return null;

          return entry.source ? (
            <LinkedEntry
              key={boardView + entry.item.id}
              entry={entry}
              itemIndex={i}
              isStatic={isStatic}
            />
          ) : (
            <ExplicitPath key={boardView + entry.item.id} path={ownPath}>
              <DraggableItem
                item={entry.item}
                itemIndex={i}
                shouldMarkItemsComplete={shouldMarkItemsComplete}
                isStatic={isStatic}
              />
            </ExplicitPath>
          );
        })}
      </>
    );
  }

  return (
    <>
      {items.map((item, i) => {
        return search?.query && !search.items.has(item) ? null : (
          <DraggableItem
            key={boardView + item.id}
            item={item}
            itemIndex={i}
            shouldMarkItemsComplete={shouldMarkItemsComplete}
            isStatic={isStatic}
          />
        );
      })}
    </>
  );
});

function ExplicitPath({ path, children }: { path: number[]; children: ComponentChildren }) {
  const value = useMemo(() => path, path);
  return <ExplicitPathContext.Provider value={value}>{children}</ExplicitPathContext.Provider>;
}

/** A card of a linked board: its actions address it in its own board. */
function LinkedEntry({
  entry,
  itemIndex,
  isStatic,
}: {
  entry: LaneEntry;
  itemIndex: number;
  isStatic?: boolean;
}) {
  const { boards } = useContext(LinkedLanesContext);
  const board = boards.get(entry.source);
  const laneIndex = board?.board.children.findIndex((l) => l.children.includes(entry.item)) ?? -1;
  if (laneIndex < 0) return null;

  const lane = board.board.children[laneIndex];
  const path = [laneIndex, lane.children.indexOf(entry.item)];

  return (
    <LinkedBoardProvider board={board}>
      <ExplicitPath path={path}>
        <DraggableItem
          item={entry.item}
          itemIndex={itemIndex}
          shouldMarkItemsComplete={!!lane.data.shouldMarkItemsComplete}
          isStatic={isStatic}
          linkedColor={board.color}
        />
      </ExplicitPath>
    </LinkedBoardProvider>
  );
}
