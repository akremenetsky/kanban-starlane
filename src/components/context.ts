import { createContext } from 'preact/compat';
import { IntersectionObserverHandler } from 'src/dnd/managers/ScrollManager';
import { Item, Lane, LaneSort } from 'src/model/types';
import { StateManager } from 'src/state/StateManager';
import { BoardFilter } from 'src/state/boardFilter';
import { BoardModifiers } from 'src/state/boardModifiers';
import { KanbanView } from 'src/view/KanbanView';

export interface KanbanContextProps {
  filePath?: string;
  stateManager: StateManager;
  boardModifiers: BoardModifiers;
  view: KanbanView;
  /** The board being viewed; unlike `stateManager`, linked lanes do not override it. */
  viewStateManager?: StateManager;
  /** Number of lists of the viewed board, so cards re-render when lists come and go. */
  laneCount?: number;
}

export const KanbanContext = createContext<KanbanContextProps>(null);

export interface SearchContextProps {
  query: string;
  /** Tag/board filter of the view. */
  filter: BoardFilter;
  /** Whether the text search or the filter hides cards (`items`/`lanes` then hold the visible ones). */
  isFiltering: boolean;
  items: Set<Item>;
  lanes: Set<Lane>;
  search: (query: string, immediate?: boolean) => void;
}

export const SearchContext = createContext<SearchContextProps | null>(null);
export const SortContext = createContext<LaneSort | string | null>(null);
export const IntersectionObserverContext = createContext<{
  registerHandler: (el: HTMLElement, handler: IntersectionObserverHandler) => void;
  unregisterHandler: (el: HTMLElement) => void;
} | null>(null);
