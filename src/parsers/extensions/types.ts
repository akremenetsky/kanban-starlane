import { Parent } from 'mdast';
import { FileMetadata } from 'src/model/types';
import { FileAccessor } from 'src/parsers/helpers/strings';

export interface ValueNode extends Parent {
  value: string;
}

export interface DateNode extends ValueNode {
  date: string;
}

export interface TimeNode extends ValueNode {
  time: string;
}

export interface FileNode extends ValueNode {
  fileAccessor: FileAccessor;
  fileMetadata?: FileMetadata;
  fileMetadataOrder?: string[];
}
