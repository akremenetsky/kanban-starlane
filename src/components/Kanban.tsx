import animateScrollTo from 'animated-scroll-to';
import classcat from 'classcat';
import update from 'immutability-helper';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/compat';
import { FRONTMATTER_KEY } from 'src/constants';
import { useIsAnythingDragging } from 'src/dnd/components/DragOverlay';
import { DndScope } from 'src/dnd/components/Scope';
import { ScrollContainer } from 'src/dnd/components/ScrollContainer';
import { SortPlaceholder } from 'src/dnd/components/SortPlaceholder';
import { Sortable } from 'src/dnd/components/Sortable';
import { createHTMLDndHandlers } from 'src/dnd/managers/DragManager';
import { t } from 'src/lang/helpers';
import { DataTypes } from 'src/model/types';
import { getBoardColor } from 'src/shared/colors';
import { StateManager } from 'src/state/StateManager';
import { BoardFilter, addFilterTag, collectTags, emptyFilter } from 'src/state/boardFilter';
import { getBoardModifiers } from 'src/state/boardModifiers';
import { KanbanView } from 'src/view/KanbanView';

import { FilterBar, FilterOption } from './FilterBar';
import { Icon } from './Icon/Icon';
import { Lanes } from './Lane/Lane';
import { LaneForm } from './Lane/LaneForm';
import { TableView } from './Table/Table';
import { KanbanContext, SearchContext } from './context';
import { baseClassName, c, useSearchValue } from './helpers';
import { LinkedLanesContext, getLaneEntries, useLinkedBoards } from './linkedLanes';

const boardScrollTiggers = [DataTypes.Item, DataTypes.Lane];
const boardAccepts = [DataTypes.Lane];

interface KanbanProps {
  stateManager: StateManager;
  view: KanbanView;
}

function getCSSClass(frontmatter: Record<string, unknown>): string[] {
  const classes: string[] = [];
  for (const value of [frontmatter.cssclass, frontmatter.cssclasses]) {
    if (Array.isArray(value)) {
      classes.push(...(value as string[]));
    } else if (typeof value === 'string') {
      classes.push(value);
    }
  }

  return classes;
}

export const Kanban = ({ view, stateManager }: KanbanProps) => {
  const boardData = stateManager.useState();
  const isAnythingDragging = useIsAnythingDragging();

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [filter, setFilter] = useState<BoardFilter>(emptyFilter);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  // Bumped to focus the tag input and open its suggestions.
  const [filterFocusKey, setFilterFocusKey] = useState<number>(0);

  const [isLaneFormVisible, setIsLaneFormVisible] = useState<boolean>(
    boardData?.children.length === 0
  );

  const filePath = stateManager.file.path;
  const maxArchiveLength = stateManager.useSetting('max-archive-size');
  const dateColors = stateManager.useSetting('date-colors');
  const tagColors = stateManager.useSetting('tag-colors');
  const boardView = view.useViewState(FRONTMATTER_KEY);
  const showFilter = stateManager.useSetting('show-filter');
  const boardColor = stateManager.useSetting('board-color');
  const linkedLanes = useLinkedBoards(view, stateManager);

  const closeFilter = useCallback(() => {
    setFilter(emptyFilter);
    setIsFilterOpen(false);
  }, []);

  const openFilter = useCallback(() => {
    setIsFilterOpen(true);
    setFilterFocusKey((key) => key + 1);
  }, []);

  const closeLaneForm = useCallback(() => {
    if (boardData?.children.length > 0) {
      setIsLaneFormVisible(false);
    }
  }, [boardData?.children.length]);

  useEffect(() => {
    if (boardData?.children.length === 0 && !stateManager.hasError()) {
      setIsLaneFormVisible(true);
    }
  }, [boardData?.children.length, stateManager]);

  const onNewLane = useCallback(() => {
    rootRef.current?.win.setTimeout(() => {
      const board = rootRef.current?.getElementsByClassName(c('board'));

      if (board?.length) {
        void animateScrollTo([board[0].scrollWidth, 0], {
          elementToScroll: board[0],
          speed: 300,
          minDuration: 150,
          easing: (x: number) => {
            return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
          },
        });
      }
    });
  }, []);

  useEffect(() => {
    const onSearchHotkey = (data: { commandId: string; data: string }) => {
      if (data.commandId === 'editor:open-search') {
        if (typeof data.data === 'string') {
          setIsSearching(true);
          setSearchQuery(data.data);
          setDebouncedSearchQuery(data.data);
        } else {
          setIsSearching((val) => !val);
        }
      }
    };

    const showLaneForm = () => {
      setIsLaneFormVisible(true);
    };

    view.emitter.on('hotkey', onSearchHotkey);
    view.emitter.on('showLaneForm', showLaneForm);

    return () => {
      view.emitter.off('hotkey', onSearchHotkey);
      view.emitter.off('showLaneForm', showLaneForm);
    };
  }, [view]);

  useEffect(() => {
    const toggleFilter = () => {
      if (isFilterOpen) closeFilter();
      else openFilter();
    };
    const filterTag = (tag: string) => {
      setIsFilterOpen(true);
      setFilter((f) => addFilterTag(f, tag));
    };

    view.emitter.on('toggleFilter', toggleFilter);
    view.emitter.on('openFilter', openFilter);
    view.emitter.on('filterTag', filterTag);

    return () => {
      view.emitter.off('toggleFilter', toggleFilter);
      view.emitter.off('openFilter', openFilter);
      view.emitter.off('filterTag', filterTag);
    };
  }, [view, isFilterOpen, closeFilter, openFilter]);

  // A filter belongs to one board: reset it when the view opens another file or the
  // filter is switched off in the settings.
  useEffect(() => {
    closeFilter();
  }, [filePath, closeFilter]);

  useEffect(() => {
    if (!showFilter) closeFilter();
  }, [showFilter, closeFilter]);

  useEffect(() => {
    view.setFilterActive(isFilterOpen);
  }, [view, isFilterOpen]);

  useEffect(() => {
    if (isSearching) {
      searchRef.current?.focus();
    }
  }, [isSearching]);

  useEffect(() => {
    const win = view.getWindow();
    const trimmed = searchQuery.trim();
    let id: number;

    if (trimmed) {
      id = win.setTimeout(() => {
        setDebouncedSearchQuery(trimmed);
      }, 250);
    } else {
      setDebouncedSearchQuery('');
    }

    return () => {
      win.clearTimeout(id);
    };
  }, [searchQuery, view]);

  useEffect(() => {
    if (maxArchiveLength === undefined || maxArchiveLength === -1) {
      return;
    }

    if (typeof maxArchiveLength === 'number' && boardData?.data.archive.length > maxArchiveLength) {
      stateManager.setState((board) =>
        update(board, {
          data: {
            archive: {
              $set: board.data.archive.slice(maxArchiveLength * -1),
            },
          },
        })
      );
    }
  }, [boardData?.data.archive.length, maxArchiveLength]);

  const boardModifiers = useMemo(() => {
    return getBoardModifiers(view, stateManager);
  }, [stateManager, view]);

  const kanbanContext = useMemo(() => {
    return {
      view,
      stateManager,
      boardModifiers,
      filePath,
    };
  }, [view, stateManager, boardModifiers, filePath, dateColors, tagColors]);

  // Tags of the cards the view shows: the table has no linked cards.
  const filterTags = useMemo(() => {
    if (!boardData || !isFilterOpen) return [];
    return collectTags(
      boardData.children.flatMap((lane) =>
        boardView === 'table'
          ? lane.children
          : (getLaneEntries(lane, linkedLanes)?.map((e) => e.item) ?? lane.children)
      )
    );
  }, [boardData, linkedLanes, isFilterOpen, boardView]);

  const filterBoards = useMemo<FilterOption[]>(() => {
    const linked = Array.from(linkedLanes.boards.values());
    if (!linked.length) return [];
    const name = (path: string) => path.split('/').pop().replace(/\.md$/i, '');
    return [
      { value: filePath, label: name(filePath), color: getBoardColor(filePath, boardColor) },
      ...linked.map((b) => ({ value: b.file, label: name(b.file), color: b.color })),
    ];
  }, [linkedLanes, filePath, boardColor]);

  const html5DragHandlers = createHTMLDndHandlers(stateManager);

  if (boardData === null || boardData === undefined)
    return (
      <div className={c('loading')}>
        <div className="sk-pulse"></div>
      </div>
    );

  if (boardData.data.errors.length > 0) {
    return (
      <div>
        <div>Error:</div>
        {boardData.data.errors.map((e, i) => {
          return (
            <div key={i}>
              <div>{e.description}</div>
              <pre>{e.stack}</pre>
            </div>
          );
        })}
      </div>
    );
  }

  const axis = boardView === 'list' ? 'vertical' : 'horizontal';
  const searchValue = useSearchValue(
    boardData,
    debouncedSearchQuery,
    filter,
    filePath,
    setSearchQuery,
    setDebouncedSearchQuery,
    setIsSearching,
    linkedLanes
  );

  return (
    <DndScope id={view.id}>
      <KanbanContext.Provider value={kanbanContext}>
        <LinkedLanesContext.Provider value={linkedLanes}>
          <SearchContext.Provider value={searchValue}>
            <div
              ref={rootRef}
              className={classcat([
                baseClassName,
                {
                  'something-is-dragging': isAnythingDragging,
                },
                ...getCSSClass(boardData.data.frontmatter),
              ])}
              {...html5DragHandlers}
            >
              {(isLaneFormVisible || boardData.children.length === 0) && (
                <LaneForm onNewLane={onNewLane} closeLaneForm={closeLaneForm} />
              )}
              {isSearching && (
                <div className={c('search-wrapper')}>
                  <input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery((e.target as HTMLInputElement).value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchQuery('');
                        setDebouncedSearchQuery('');
                        (e.target as HTMLInputElement).blur();
                        setIsSearching(false);
                      }
                    }}
                    type="text"
                    className={c('filter-input')}
                    placeholder={t('Search...')}
                  />
                  <a
                    className={`${c('search-cancel-button')} clickable-icon`}
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedSearchQuery('');
                      setIsSearching(false);
                    }}
                    aria-label={t('Cancel')}
                  >
                    <Icon name="lucide-x" />
                  </a>
                </div>
              )}
              {showFilter && isFilterOpen && (
                <FilterBar
                  app={view.app}
                  filter={filter}
                  setFilter={setFilter}
                  tags={filterTags}
                  boards={boardView === 'table' ? [] : filterBoards}
                  focusKey={filterFocusKey}
                  onClose={closeFilter}
                />
              )}
              {boardView === 'table' ? (
                <TableView boardData={boardData} stateManager={stateManager} />
              ) : (
                <ScrollContainer
                  id={view.id}
                  className={classcat([
                    c('board'),
                    {
                      [c('horizontal')]: boardView !== 'list',
                      [c('vertical')]: boardView === 'list',
                      'is-adding-lane': isLaneFormVisible,
                    },
                  ])}
                  triggerTypes={boardScrollTiggers}
                >
                  <div>
                    <Sortable axis={axis}>
                      <Lanes lanes={boardData.children} collapseDir={axis} />
                      <SortPlaceholder
                        accepts={boardAccepts}
                        className={c('lane-placeholder')}
                        index={boardData.children.length}
                      />
                    </Sortable>
                  </div>
                </ScrollContainer>
              )}
            </div>
          </SearchContext.Provider>
        </LinkedLanesContext.Provider>
      </KanbanContext.Provider>
    </DndScope>
  );
};
