import { initialSettings } from 'src/settings/defaults';
import { describe, expect, it } from 'vitest';

describe('initialSettings', () => {
  it('gives a new install the highlighting #urgent and #important tags', () => {
    const tagColors = initialSettings(false)['tag-colors'];

    expect(tagColors?.map((c) => [c.tagKey, c.highlight])).toEqual([
      ['#urgent', true],
      ['#important', true],
    ]);
  });

  it('adds nothing to a vault that already has boards (an update)', () => {
    expect(initialSettings(true)).toEqual({});
  });

  it('returns a fresh copy each time', () => {
    const first = initialSettings(false)['tag-colors'] ?? [];
    first[0].highlight = false;

    expect(initialSettings(false)['tag-colors']?.[0].highlight).toBe(true);
  });
});
