/**
 * Migration of boards created by the original obsidian-kanban plugin.
 *
 * A legacy board differs only in its identifiers:
 *   frontmatter   `kanban-plugin: board`          -> `kanban-starlane: board`
 *   settings JSON `"kanban-plugin":"board"`        -> `"kanban-starlane":"board"`
 *   block marker  `%% kanban:settings`             -> `%% kanban-starlane:settings`
 * Everything else (lanes, cards, archive, settings) is read as-is.
 */
import {
  FRONTMATTER_KEY,
  LEGACY_FRONTMATTER_KEY,
  LEGACY_SETTINGS_BLOCK_MARKER,
  SETTINGS_BLOCK_MARKER,
} from 'src/constants';

const frontmatterRe = /^---\r?\n([\s\S]*?)\r?\n---/;

function frontmatterHasKey(md: string, key: string) {
  const fm = md.match(frontmatterRe)?.[1];
  if (!fm) return false;
  return new RegExp(`^${key}\\s*:`, 'm').test(fm);
}

/** True for notes that obsidian-kanban would open as a board and we would not. */
export function isLegacyBoard(md: string): boolean {
  return frontmatterHasKey(md, LEGACY_FRONTMATTER_KEY) && !frontmatterHasKey(md, FRONTMATTER_KEY);
}

/** Rewrite a legacy board's identifiers. Returns the input unchanged if it is not legacy. */
export function convertLegacyBoard(md: string): string {
  if (!isLegacyBoard(md)) return md;

  let out = md.replace(frontmatterRe, (block) =>
    block.replace(new RegExp(`^${LEGACY_FRONTMATTER_KEY}(\\s*:)`, 'm'), `${FRONTMATTER_KEY}$1`)
  );

  const markerIndex = out.lastIndexOf(LEGACY_SETTINGS_BLOCK_MARKER);
  if (markerIndex >= 0) {
    const footer = out
      .slice(markerIndex)
      .replace(LEGACY_SETTINGS_BLOCK_MARKER, SETTINGS_BLOCK_MARKER)
      .replace(`"${LEGACY_FRONTMATTER_KEY}":`, `"${FRONTMATTER_KEY}":`);
    out = out.slice(0, markerIndex) + footer;
  }

  return out;
}
