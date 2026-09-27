import { moment } from 'obsidian';
import { getDateColorFn } from 'src/shared/colors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('getDateColorFn', () => {
  const today = { isToday: true, color: 'today' };
  const soon = { distance: 3, unit: 'days' as const, direction: 'after' as const, color: 'soon' };
  const past = { isBefore: true, color: 'past' };

  it('picks the first matching rule, with "today" first', () => {
    const fn = getDateColorFn([past, soon, today]);

    expect(fn(moment('2024-06-15'))?.color).toBe('today');
    expect(fn(moment('2024-06-17'))?.color).toBe('soon');
    expect(fn(moment('2024-06-01'))?.color).toBe('past');
    expect(fn(moment('2024-07-30'))).toBeNull();
  });

  it('returns null with no rules', () => {
    expect(getDateColorFn([])(moment())).toBeNull();
  });
});
