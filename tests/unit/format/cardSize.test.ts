import { Item } from 'src/model/types';
import { parseSizeTag, setCardSize } from 'src/parsers/cardSize';
import { sanitizeSizeTag, sanitizeSizeWeights } from 'src/settings/defaults';
import { sizeTotal } from 'src/state/cardSize';
import { compileSettings } from 'src/state/compileSettings';
import { describe, expect, it } from 'vitest';

import { board, readFixture } from '../../setup/fixtures';
import { loadBoard } from '../../setup/harness';

const cards = async (md: string) =>
  (await loadBoard(md)).board.children.flatMap((lane) => lane.children);

const sizeBoard = (body: string, settings: Record<string, unknown> = {}) =>
  board(
    'kanban-starlane: board',
    `## L\n\n${body}`,
    JSON.stringify({ 'kanban-starlane': 'board', ...settings })
  );

describe('size tags', () => {
  it('read a size from #<word>/<size>, in any case', () => {
    expect(parseSizeTag('#size/M', 'size')).toBe('M');
    expect(parseSizeTag('#Size/xl', 'size')).toBe('XL');
    expect(parseSizeTag('#est/S', 'est')).toBe('S');
    expect(parseSizeTag('#size/XXL', 'size')).toBeNull();
    expect(parseSizeTag('#sizes/M', 'size')).toBeNull();
    expect(parseSizeTag('#size', 'size')).toBeNull();
  });

  it('are written as one tag on the first line, replacing any other size', () => {
    expect(setCardSize('Task', 'M', 'size')).toBe('Task #size/M');
    expect(setCardSize('Task #size/s #work', 'L', 'size')).toBe('Task #work #size/L');
    expect(setCardSize('Task #size/L #size/XS\nmore', 'S', 'size')).toBe('Task #size/S\nmore');
    expect(setCardSize('Task #size/M #work', null, 'size')).toBe('Task #work');
    expect(setCardSize('Task #est/M', 'XS', 'est')).toBe('Task #est/XS');
    // Code is not a tag, so it is left alone.
    expect(setCardSize('Task `#size/M`', 'S', 'size')).toBe('Task `#size/M` #size/S');
  });
});

describe('card size in boards', () => {
  it('reads the first size tag, keeps it among the tags and out of the shown text', async () => {
    const [small, lower, two, notSize, code, none, done] = await cards(
      readFixture('boards/card-size.md')
    );

    expect(small.data.metadata.size).toBe('S');
    expect(small.data.title).toBe('Small task');
    expect(small.data.metadata.tags).toEqual(['#size/S']);
    expect(lower.data.metadata.size).toBe('M');
    expect(lower.data.title).toBe('Lower case still counts #work');
    expect(two.data.metadata.size).toBe('L');
    expect(two.data.title).toBe('Two sizes, the first one wins #size/XS');
    expect(notSize.data.metadata.size).toBeUndefined();
    expect(notSize.data.title).toContain('#size/XXL');
    expect(code.data.metadata.size).toBeUndefined();
    expect(none.data.metadata.size).toBeUndefined();
    expect(done.data.metadata.size).toBe('XL');
  });

  it('keeps the line break after a size tag ending the first line of a card', async () => {
    const md = sizeBoard('- [ ] Task #size/M\n    second line\n    ```\n    code\n    ```');
    const [card] = await cards(md);
    expect(card.data.metadata.size).toBe('M');
    expect(card.data.title).toBe('Task\nsecond line\n```\ncode\n```');
  });

  it('keeps the line break after a tag moved below the card text', async () => {
    const md = sizeBoard('- [ ] Task #work\n    second line', { 'move-tags': true });
    const [card] = await cards(md);
    expect(card.data.title).toBe('Task\nsecond line');
  });

  it('ignores a size tag inside a comment, so the size can be changed', async () => {
    const [card] = await cards(sizeBoard('- [ ] Task %% #size/M %% #size/S'));
    expect(card.data.metadata.size).toBe('S');
  });

  it('reads size tags as plain tags when card sizes are off', async () => {
    const [card] = await cards(sizeBoard('- [ ] Task #size/M', { 'show-card-size': false }));
    expect(card.data.metadata.size).toBeUndefined();
    expect(card.data.title).toContain('#size/M');
  });

  it('uses the board’s size tag word', async () => {
    const [own, other] = await cards(
      sizeBoard('- [ ] Task #est/M\n- [ ] Other #size/S', { 'size-tag': 'est' })
    );
    expect(own.data.metadata.size).toBe('M');
    expect(other.data.metadata.size).toBeUndefined();
  });

  it('writes the new size into the card when it is set', async () => {
    const { stateManager, board: b } = await loadBoard(sizeBoard('- [ ] Task #size/S #work'));
    const card = b.children[0].children[0];
    const updated = stateManager.updateItemContent(
      card,
      setCardSize(card.data.titleRaw, 'XL', stateManager.getSetting('size-tag'))
    );
    expect(updated.data.metadata.size).toBe('XL');
    expect(updated.data.titleRaw).toBe('Task #work #size/XL');
  });
});

describe('size settings and totals', () => {
  it('clean up the stored tag word and weights', () => {
    expect(sanitizeSizeTag('#est')).toBe('est');
    expect(sanitizeSizeTag(' ')).toBe('size');
    expect(sanitizeSizeTag(undefined)).toBe('size');
    expect(sanitizeSizeTag('a.b+')).toBe('ab');
    expect(sanitizeSizeWeights({ M: 4, L: -1, XL: 'x' })).toEqual({
      XS: 1,
      S: 2,
      M: 4,
      L: 5,
      XL: 8,
    });
  });

  it('take a board’s weight per size, falling back to the global one', () => {
    const weights = compileSettings(
      [{ 'size-weights': { M: 4 } }],
      { 'size-weights': { XL: 13 } },
      { dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm' }
    )['size-weights'];
    expect(weights).toEqual({ XS: 1, S: 2, M: 4, L: 5, XL: 13 });
  });

  it('add up the weights of sized cards, and are absent when none is sized', () => {
    const item = (size?: string) => ({ data: { metadata: { size } } }) as unknown as Item;
    const weights = sanitizeSizeWeights({});

    expect(sizeTotal([item('S'), item('S'), item('XL'), item()], weights)).toEqual({
      total: 12,
      counts: { S: 2, XL: 1 },
    });
    expect(sizeTotal([item(), item()], weights)).toBeNull();
  });
});
