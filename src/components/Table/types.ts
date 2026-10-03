import { RankingInfo } from '@tanstack/match-sorter-utils';
import { Path } from 'src/dnd/types';
import { Item, Lane } from 'src/model/types';
import { StateManager } from 'src/state/StateManager';

export interface TableItem {
  item: Item;
  lane: Lane;
  path: Path;
  stateManager: StateManager;
}

export interface TableData {
  items: TableItem[];
  metadata: string[];
  fileMetadata: string[];
  inlineMetadata: string[];
  metadataLabels: Map<string, string>;
}

declare module '@tanstack/react-table' {
  /** Set by the fuzzy filter, read by the fuzzy sort. */
  interface FilterMeta {
    itemRank?: RankingInfo;
  }
}
