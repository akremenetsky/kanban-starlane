import {
  findTagDate,
  findTagDateInCard,
  formatTagDate,
  parseTagDate,
  removeTagDate,
  removeTagTime,
  setTagDate,
  setTagTime,
} from 'src/parsers/tagDate';
import { moment } from 'src/shared/moment';
import { describe, expect, it } from 'vitest';

const at = (s: string) => moment(s, 'YYYY-MM-DD HH:mm:ss');

describe('parseTagDate', () => {
  it('reads a date-only tag', () => {
    const parsed = parseTagDate('#26-10-14');
    expect(parsed?.hasTime).toBe(false);
    expect(parsed?.date.format('YYYY-MM-DD')).toBe('2026-10-14');
  });

  it('reads a date and time tag', () => {
    const parsed = parseTagDate('#26-10-14-13-25-20');
    expect(parsed?.hasTime).toBe(true);
    expect(parsed?.date.format('YYYY-MM-DD HH:mm:ss')).toBe('2026-10-14 13:25:20');
  });

  it('keeps an explicit midnight as a time', () => {
    const parsed = parseTagDate('#26-10-14-00-00-00');
    expect(parsed?.hasTime).toBe(true);
    expect(parsed?.date.format('HH:mm:ss')).toBe('00:00:00');
  });

  it.each(['#26-10-14-13', '#26-13-01', '#v1-2-3', '#26-1-4', '#26-10-14x', '26-10-14', '#tag'])(
    'rejects %s',
    (tag) => {
      expect(parseTagDate(tag)).toBeNull();
    }
  );
});

describe('formatTagDate', () => {
  it('writes the date with or without the time part', () => {
    expect(formatTagDate(at('2026-10-14 13:25:20'), false)).toBe('#26-10-14');
    expect(formatTagDate(at('2026-10-14 13:25:20'), true)).toBe('#26-10-14-13-25-20');
  });
});

describe('findTagDate', () => {
  it('finds the first tag that is a date and skips other tags', () => {
    const found = findTagDate('a #work #26-10-14 #26-10-15');
    expect(found?.text).toBe('#26-10-14');
    expect(found?.index).toBe(8);
  });

  it('skips tags inside inline code and code blocks', () => {
    expect(findTagDate('a `x #26-01-01` #26-10-14')?.text).toBe('#26-10-14');
    expect(findTagDate('a ``x ` #26-01-01`` #26-10-14')?.text).toBe('#26-10-14');
    expect(findTagDate('a\n```\n#26-01-01\n```\n#26-10-14')?.text).toBe('#26-10-14');
    expect(removeTagDate('Task `#26-01-01` #26-10-14')).toBe('Task `#26-01-01`');
  });

  it('ignores a date pattern that is not a tag', () => {
    expect(findTagDate('a#26-10-14 x')).toBeNull();
    expect(findTagDate('#26-10-14x')).toBeNull();
  });
});

describe('findTagDateInCard', () => {
  const md = '## L\n\n- [ ] One #26-01-01\n- [ ] Two\n\tmore #26-02-02\n- [ ] Three @@';

  it('looks only at the card around the offset in a board file', () => {
    expect(findTagDateInCard(md, md.indexOf('Two'))?.text).toBe('#26-02-02');
    expect(findTagDateInCard(md, md.indexOf('more'))?.text).toBe('#26-02-02');
    expect(findTagDateInCard(md, md.length)).toBeNull();
  });

  it('returns the position in the whole text', () => {
    expect(findTagDateInCard(md, md.indexOf('Two'))?.index).toBe(md.indexOf('#26-02-02'));
  });

  it('looks at the whole text of a card editor', () => {
    expect(findTagDateInCard('Task #26-01-01\nsecond line', 20)?.text).toBe('#26-01-01');
  });
});

describe('editing the card text', () => {
  it('replaces the date and keeps the time', () => {
    expect(setTagDate('Task #26-10-14-13-25-20 #work', at('2026-11-01 00:00:00'))).toBe(
      'Task #26-11-01-13-25-20 #work'
    );
  });

  it('appends a date when there is none', () => {
    expect(setTagDate('Task #work', at('2026-11-01 08:00:00'))).toBe('Task #work #26-11-01');
  });

  it('sets the time on the existing date', () => {
    expect(
      setTagTime('Task #26-10-14 x', at('1970-01-01 09:30:00'), at('2026-01-01 00:00:00'))
    ).toBe('Task #26-10-14-09-30-00 x');
  });

  it('adds today with the time when there is no date', () => {
    expect(setTagTime('Task', at('1970-01-01 09:30:00'), at('2026-01-02 15:00:00'))).toBe(
      'Task #26-01-02-09-30-00'
    );
  });

  it('removes the time part only', () => {
    expect(removeTagTime('Task #26-10-14-09-30-00 x')).toBe('Task #26-10-14 x');
  });

  it('removes the whole date tag', () => {
    expect(removeTagDate('Task #26-10-14-09-30-00 x')).toBe('Task x');
    expect(removeTagDate('#26-10-14 Task')).toBe('Task');
  });
});
