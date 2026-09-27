import { TFile } from 'obsidian';
import { Nestable } from 'src/dnd/types';
import { InlineField } from 'src/parsers/helpers/inlineMetadata';
import { FileAccessor } from 'src/parsers/helpers/strings';
import { KanbanSettings } from 'src/settings/types';

export enum LaneSort {
  TitleAsc,
  TitleDsc,
  DateAsc,
  DateDsc,
  TagsAsc,
  TagsDsc,
}

export interface LaneData {
  shouldMarkItemsComplete?: boolean;
  title: string;
  maxItems?: number;
  dom?: HTMLDivElement;
  forceEditMode?: boolean;
  sorted?: LaneSort | string;
}

/** A lane of another board whose cards are shown in one of this board's lanes. */
export interface LinkedLaneSource {
  /** Vault path of the other board. */
  file: string;
  /** Title of the lane on that board (without the WIP limit). */
  lane: string;
}

/**
 * Stored per own lane (keyed by its title) in the `linked-lanes` setting.
 * `order` is the combined card order: `self` stands for the next own card (in file order),
 * `<path>#^<blockId>` for a specific card of a linked board.
 */
export interface LinkedLane {
  sources: LinkedLaneSource[];
  order?: string[];
}

export type LinkedLanes = Record<string, LinkedLane>;

export interface DataKey {
  metadataKey: string;
  label: string;
  shouldHideLabel: boolean;
  containsMarkdown: boolean;
}

export interface TagColor {
  tagKey: string;
  color: string;
  backgroundColor: string;
}

export interface TagSort {
  tag: string;
}

export interface DateColor {
  isToday?: boolean;
  isBefore?: boolean;
  isAfter?: boolean;
  distance?: number;
  unit?: 'hours' | 'days' | 'weeks' | 'months';
  direction?: 'before' | 'after';
  color?: string;
  backgroundColor?: string;
}

export type PageDataValue =
  string | number | Array<string | number> | { [k: string]: PageDataValue };

export interface PageData extends DataKey {
  value: PageDataValue;
}

export interface FileMetadata {
  [k: string]: PageData;
}

export interface ItemMetadata {
  dateStr?: string;
  date?: moment.Moment;
  timeStr?: string;
  time?: moment.Moment;
  tags?: string[];
  fileAccessor?: FileAccessor;
  file?: TFile | null;
  fileMetadata?: FileMetadata;
  fileMetadataOrder?: string[];
  inlineMetadata?: InlineField[];
}

export interface ItemData {
  blockId?: string;
  checked: boolean;
  checkChar: string;
  title: string;
  titleRaw: string;
  titleSearch: string;
  titleSearchRaw: string;
  metadata: ItemMetadata;
  forceEditMode?: boolean;
}

export interface ErrorReport {
  description: string;
  stack: string;
}

/** What happened to a card. Lane titles are stored as they were at that moment. */
export type CardEventType =
  'created' | 'edited' | 'moved' | 'checked' | 'unchecked' | 'archived' | 'restored';

export interface CardEvent {
  /** Local time with UTC offset, e.g. `2026-09-26T10:31:05+03:00`. */
  at: string;
  type: CardEventType;
  /** `created`, `archived`, `restored`: the lane of the card. */
  lane?: string;
  /** `moved`: the lanes it moved between. */
  from?: string;
  to?: string;
  /** `moved` from another board: that board's path. */
  board?: string;
  /** `checked`: the status character (`x`, `/`, ...). */
  mark?: string;
}

/** Card events by the card's block id, oldest first. */
export type CardHistory = Record<string, CardEvent[]>;

export interface BoardData {
  isSearching: boolean;
  settings: KanbanSettings;
  frontmatter: Record<string, number | string | Array<number | string>>;
  archive: Item[];
  errors: ErrorReport[];
  /** Card history (`%% kanban-starlane:history` block); absent when the file has none. */
  history?: CardHistory;
  /** The history block as found in the file when it could not be read; written back as is. */
  historyRaw?: string;
}

export type Item = Nestable<ItemData>;
export type Lane = Nestable<LaneData, Item>;
export type Board = Nestable<BoardData, Lane>;
export type MetadataSetting = Nestable<DataKey>;
export type TagColorSetting = Nestable<TagColor>;
export type TagSortSetting = Nestable<TagSort>;
export type DateColorSetting = Nestable<DateColor>;

export const DataTypes = {
  Item: 'item',
  Lane: 'lane',
  Board: 'board',
  MetadataSetting: 'metadata-setting',
  TagColorSetting: 'tag-color',
  TagSortSetting: 'tag-sort',
  DateColorSetting: 'date-color',
};

export const ItemTemplate = {
  accepts: [DataTypes.Item],
  type: DataTypes.Item,
  children: [] as any[],
};

export const LaneTemplate = {
  accepts: [DataTypes.Lane],
  type: DataTypes.Lane,
};

export const BoardTemplate = {
  accepts: [] as string[],
  type: DataTypes.Board,
};

export const MetadataSettingTemplate = {
  accepts: [DataTypes.MetadataSetting],
  type: DataTypes.MetadataSetting,
  children: [] as any[],
};

export const TagSortSettingTemplate = {
  accepts: [DataTypes.TagSortSetting],
  type: DataTypes.TagSortSetting,
  children: [] as any[],
};

// TODO: all this is unecessary because these aren't sortable
export const TagColorSettingTemplate = {
  accepts: [] as string[],
  type: DataTypes.TagColorSetting,
  children: [] as any[],
};

// TODO: all this is unecessary because these aren't sortable
export const DateColorSettingTemplate = {
  accepts: [] as string[],
  type: DataTypes.DateColorSetting,
  children: [] as any[],
};

export interface EditCoordinates {
  x: number;
  y: number;
}

export enum EditingState {
  cancel,
  complete,
}

export type EditState = EditCoordinates | EditingState;

export function isEditing(state: EditState): state is EditCoordinates {
  if (state === null) return false;
  if (typeof state === 'number') return false;
  return true;
}
