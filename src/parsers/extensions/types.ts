import { FileMetadata } from 'src/model/types';
import { FileAccessor } from 'src/parsers/helpers/strings';
import { Node } from 'unist';

/** Inline syntaxes parsed by `genericWrappedExtension` (text between a start and end marker). */
export type WrappedName = 'date' | 'dateLink' | 'time' | 'embedWikilink' | 'wikilink';

/** Inline node types added by the board's micromark extensions. */
export type InlineNodeName = WrappedName | 'hashtag' | 'blockid';

type InlineTokenType = `${InlineNodeName}${'' | 'Marker' | 'Data' | 'Target'}`;

type TaskListTokenType =
  | 'taskListCheck'
  | 'taskListCheckMarker'
  | 'taskListCheckValueChecked'
  | 'taskListCheckValueUnchecked';

// Registers the extensions' token types with micromark.
declare module 'micromark-util-types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- an augmentation adds the keys through `extends`
  interface TokenTypeMap extends Record<InlineTokenType | TaskListTokenType, string> {}
}

/** Base of the extensions' inline nodes. */
export interface ValueNode extends Node {
  type: InlineNodeName;
  /** The text between the markers (null until its target token is read). */
  value: string;
}

export interface TagNode extends ValueNode {
  type: 'hashtag';
}

export interface BlockIdNode extends ValueNode {
  type: 'blockid';
}

export interface DateNode extends ValueNode {
  type: 'date' | 'dateLink';
  date?: string;
}

export interface TimeNode extends ValueNode {
  type: 'time';
  time?: string;
}

/** What a link to a note carries once resolved (wikilinks, markdown links and embeds). */
export interface LinkedFileData {
  fileAccessor?: FileAccessor;
  fileMetadata?: FileMetadata;
  fileMetadataOrder?: string[];
}

export interface FileNode extends ValueNode, LinkedFileData {
  type: 'wikilink' | 'embedWikilink';
}

/** An embedded markdown link (`![](note.md)`), turned from an image node. */
export interface EmbedLinkNode extends Node, LinkedFileData {
  type: 'embedLink';
  url: string;
}

// Registers the extensions' nodes with mdast, so they are part of `PhrasingContent`.
declare module 'mdast' {
  interface StaticPhrasingContentMap {
    kanbanTag: TagNode;
    kanbanBlockId: BlockIdNode;
    kanbanDate: DateNode;
    kanbanTime: TimeNode;
    kanbanFile: FileNode;
    kanbanEmbedLink: EmbedLinkNode;
  }

  interface ListItem {
    /** The character between the task brackets (`- [x]`). */
    checkChar?: string;
  }

  interface Link {
    fileAccessor?: FileAccessor;
    fileMetadata?: FileMetadata;
    fileMetadataOrder?: string[];
  }

  interface Image {
    fileAccessor?: FileAccessor;
  }
}
