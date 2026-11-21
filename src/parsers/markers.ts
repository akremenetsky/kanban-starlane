/** Fixed strings that give structure to a board file. */
import {
  FRONTMATTER_KEY,
  LEGACY_SETTINGS_BLOCK_MARKER,
  SETTINGS_BLOCK_MARKER,
} from 'src/constants';
import { allTranslations } from 'src/lang/helpers';

import { isMarkerLine } from './helpers/jsonBlock';

/**
 * Markers written into board files. They are always English so a board does not change
 * meaning when the UI language changes. When reading, the localized variants written by
 * obsidian-kanban (which used the UI language) are accepted too.
 */
export const ARCHIVE_HEADING = 'Archive';
export const COMPLETE_MARKER = 'Complete';
export const completeString = `**${COMPLETE_MARKER}**`;
export const archiveString = '***';

const archiveHeadings = allTranslations('Archive');
const completeMarkers = allTranslations('Complete');

export function isArchiveHeadingText(text: string) {
  return archiveHeadings.has(text);
}

export function isCompleteMarkerText(text: string) {
  return completeMarkers.has(text);
}

export function isSettingsBlockStart(text: string) {
  return (
    isMarkerLine(text, SETTINGS_BLOCK_MARKER) || isMarkerLine(text, LEGACY_SETTINGS_BLOCK_MARKER)
  );
}
export const basicFrontmatter = ['---', '', `${FRONTMATTER_KEY}: board`, '', '---', '', ''].join(
  '\n'
);
