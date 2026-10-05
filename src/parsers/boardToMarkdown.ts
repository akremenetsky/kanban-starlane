import { stringifyYaml } from 'obsidian';
import { SETTINGS_BLOCK_MARKER } from 'src/constants';
import { Board, Item, Lane } from 'src/model/types';

import {
  addBlockId,
  escapeLaneDescription,
  indentNewLines,
  laneTitleWithMaxItems,
  replaceNewLines,
} from './helpers/strings';
import { historyToCodeblock } from './history';
import { ARCHIVE_HEADING, archiveString, completeString } from './markers';

export interface BoardSerializeOptions {
  /** Indent multi-line card bodies with tabs instead of 4 spaces. */
  useTab: boolean;
}

function itemToMd(item: Item, opts: BoardSerializeOptions) {
  return `- [${item.data.checkChar}] ${addBlockId(indentNewLines(item.data.titleRaw, opts.useTab), item)}`;
}

function laneToMd(lane: Lane, opts: BoardSerializeOptions) {
  const lines: string[] = [];

  lines.push(`## ${replaceNewLines(laneTitleWithMaxItems(lane.data.title, lane.data.maxItems))}`);

  lines.push('');

  // Only blank lines are trimmed at the start: leading spaces can be markdown (indented code).
  const description = lane.data.description?.replace(/^(?:[ \t]*\n)+|\s+$/g, '');
  if (description) {
    lines.push(escapeLaneDescription(description));
    lines.push('');
  }

  if (lane.data.shouldMarkItemsComplete) {
    lines.push(completeString);
  }

  lane.children.forEach((item) => {
    lines.push(itemToMd(item, opts));
  });

  lines.push('');
  lines.push('');
  lines.push('');

  return lines.join('\n');
}

function archiveToMd(archive: Item[], opts: BoardSerializeOptions) {
  if (archive.length) {
    const lines: string[] = [archiveString, '', `## ${ARCHIVE_HEADING}`, ''];

    archive.forEach((item) => {
      lines.push(itemToMd(item, opts));
    });

    return lines.join('\n');
  }

  return '';
}

export function boardToMd(board: Board, opts: BoardSerializeOptions) {
  const lanes = board.children.reduce((md, lane) => {
    return md + laneToMd(lane, opts);
  }, '');

  const frontmatter = ['---', '', stringifyYaml(board.data.frontmatter), '---', '', ''].join('\n');

  return (
    frontmatter +
    lanes +
    archiveToMd(board.data.archive, opts) +
    historyToCodeblock(board) +
    settingsToCodeblock(board)
  );
}

export function settingsToCodeblock(board: Board): string {
  return [
    '',
    '',
    SETTINGS_BLOCK_MARKER,
    '```',
    JSON.stringify(board.data.settings),
    '```',
    '%%',
  ].join('\n');
}
