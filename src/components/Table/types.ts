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
