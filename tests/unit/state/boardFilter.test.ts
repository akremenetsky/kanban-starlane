import { Item } from 'src/model/types';
import {
  addFilterTag,
  collectTags,
  emptyFilter,
  isFilterActive,
  itemPassesFilter,
  tagMatches,
} from 'src/state/boardFilter';
import { describe, expect, it } from 'vitest';

const card = (...tags: string[]) => ({ data: { metadata: { tags } } }) as unknown as Item;

const W = 'Boards/Work.md';
const P = 'Boards/Personal.md';

describe('tagMatches', () => {
  it('passes everything when no tag is selected', () => {
    expect(tagMatches(undefined, [])).toBe(true);
    expect(tagMatches(['#a'], [])).toBe(true);
  });

  it('passes a card with any of the selected tags', () => {
    expect(tagMatches(['#work'], ['#home', '#work'])).toBe(true);
    expect(tagMatches(['#idea'], ['#home', '#work'])).toBe(false);
    expect(tagMatches(undefined, ['#work'])).toBe(false);
  });

  it('matches whole tags, not prefixes', () => {
    expect(tagMatches(['#workshop'], ['#work'])).toBe(false);
  });

  it('ignores case and matches nested tags', () => {
    expect(tagMatches(['#Work'], ['#work'])).toBe(true);
    expect(tagMatches(['#work/urgent'], ['#Work'])).toBe(true);
    expect(tagMatches(['#work'], ['#work/urgent'])).toBe(false);
  });
});

describe('itemPassesFilter', () => {
  it('combines boards and tags', () => {
    const filter = { tags: ['#a'], boards: [W] };

    expect(itemPassesFilter(card('#a'), W, filter)).toBe(true);
    expect(itemPassesFilter(card('#a'), P, filter)).toBe(false);
    expect(itemPassesFilter(card('#b'), W, filter)).toBe(false);
  });

  it('passes any board of the list', () => {
    const filter = { tags: [] as string[], boards: [W, P] };
    expect(itemPassesFilter(card(), P, filter)).toBe(true);
    expect(itemPassesFilter(card(), 'Other.md', filter)).toBe(false);
  });

  it('passes everything with the empty filter', () => {
    expect(isFilterActive(emptyFilter)).toBe(false);
    expect(itemPassesFilter(card(), W, emptyFilter)).toBe(true);
  });
});

describe('collectTags', () => {
  it('counts each card once per tag and sorts by name, ignoring case', () => {
    expect(collectTags([card('#b', '#a'), card('#A', '#a'), card()])).toEqual([
      { tag: '#a', count: 2 },
      { tag: '#b', count: 1 },
    ]);
  });
});

describe('addFilterTag', () => {
  it('adds a tag once, ignoring case', () => {
    const once = addFilterTag(emptyFilter, '#Work');
    expect(once.tags).toEqual(['#Work']);
    expect(addFilterTag(once, '#work')).toBe(once);
    expect(addFilterTag(once, 'home').tags).toEqual(['#Work', '#home']);
  });
});
