import {
  dedentNewLines,
  executeDeletion,
  indentNewLines,
  laneTitleWithMaxItems,
  markRangeForDeletion,
  parseLaneTitle,
  removeBlockId,
  replaceBrs,
  replaceNewLines,
} from 'src/parsers/helpers/strings';
import { describe, expect, it } from 'vitest';

describe('parser string helpers', () => {
  it('lane title <-> WIP limit', () => {
    expect(parseLaneTitle('Todo (4)')).toEqual({ title: 'Todo', maxItems: 4 });
    expect(parseLaneTitle('Todo')).toEqual({ title: 'Todo', maxItems: 0 });
    expect(parseLaneTitle('A<br>B')).toEqual({ title: 'A\nB', maxItems: 0 });
    expect(laneTitleWithMaxItems('Todo', 4)).toBe('Todo (4)');
    expect(laneTitleWithMaxItems('Todo', 0)).toBe('Todo');
  });

  it('new lines <-> <br>', () => {
    expect(replaceNewLines('a\nb\r\nc')).toBe('a<br>b<br>c');
    expect(replaceBrs('a<br>b')).toBe('a\nb');
  });

  it('indents and dedents card continuation lines', () => {
    expect(indentNewLines('a\nb', false)).toBe('a\n    b');
    expect(indentNewLines('a\nb', true)).toBe('a\n\tb');
    expect(dedentNewLines('a\n    b\n\tc')).toBe('a\nb\nc');
  });

  it('removes a trailing block id from the first line only', () => {
    expect(removeBlockId('a ^id1\nb ^id2')).toBe('a\nb ^id2');
  });

  it('marks and deletes ranges, collapsing surrounding spaces', () => {
    const s = 'Task #tag done';
    expect(executeDeletion(markRangeForDeletion(s, { start: 5, end: 9 }))).toBe('Task done');
  });
});
