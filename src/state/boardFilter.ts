import { Item } from 'src/model/types';

/** Tags and boards a view's cards are filtered by. Lives in the view only, never in files. */
export interface BoardFilter {
  /** Tags with `#`; a card passes when it has any of them. */
  tags: string[];
  /** Board file paths; a card passes when it belongs to any of them. */
  boards: string[];
}

export interface TagCount {
  tag: string;
  count: number;
}

export const emptyFilter: BoardFilter = { tags: [], boards: [] };

/** Whether the filter hides anything. */
export function isFilterActive(filter: BoardFilter) {
  return filter.tags.length > 0 || filter.boards.length > 0;
}

/** Lower-cased tag with a leading `#` (Obsidian tags are case-insensitive). */
export function normalizeTag(tag: string) {
  const trimmed = tag.trim().toLocaleLowerCase();
  return trimmed.startsWith('#') ? trimmed : '#' + trimmed;
}

/** Whether `tag` is `selected` or nested under it, as Obsidian's tag search does. */
function isTagOrChild(tag: string, selected: string) {
  return tag === selected || tag.startsWith(selected + '/');
}

/** Whether a card with `itemTags` has any of the `selected` tags. */
export function tagMatches(itemTags: string[] | undefined, selected: string[]) {
  if (!selected.length) return true;
  if (!itemTags?.length) return false;

  const wanted = selected.map(normalizeTag);
  return itemTags.some((tag) => {
    const normalized = normalizeTag(tag);
    return wanted.some((w) => isTagOrChild(normalized, w));
  });
}

/** Whether a card of the board at `file` passes the filter. */
export function itemPassesFilter(item: Item, file: string, filter: BoardFilter) {
  if (filter.boards.length && !filter.boards.includes(file)) return false;
  return tagMatches(item.data.metadata.tags, filter.tags);
}

/** Distinct tags of `items` with the number of cards carrying each, sorted by name. */
export function collectTags(items: Item[]): TagCount[] {
  const counts = new Map<string, TagCount>();

  for (const item of items) {
    const seen = new Set<string>();
    for (const tag of item.data.metadata.tags ?? []) {
      const key = normalizeTag(tag);
      if (seen.has(key)) continue;
      seen.add(key);

      const entry = counts.get(key);
      if (entry) entry.count++;
      else counts.set(key, { tag, count: 1 });
    }
  }

  return Array.from(counts.values()).sort((a, b) =>
    a.tag.localeCompare(b.tag, undefined, { sensitivity: 'base' })
  );
}

/** Add `tag` unless the filter already has it (ignoring case). */
export function addFilterTag(filter: BoardFilter, tag: string): BoardFilter {
  const key = normalizeTag(tag);
  if (filter.tags.some((t) => normalizeTag(t) === key)) return filter;
  return { ...filter, tags: [...filter.tags, tag.startsWith('#') ? tag : '#' + tag] };
}
