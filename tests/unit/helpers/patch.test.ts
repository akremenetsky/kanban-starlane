import { diff, diffApply } from 'src/shared/patch';
import { describe, expect, it } from 'vitest';

describe('diff / diffApply', () => {
  it('produces ops that transform the first object into the second', () => {
    const a = { x: 1, list: [1, 2, 3], nested: { keep: true, drop: 1 } };
    const b = { x: 2, list: [1, 3], nested: { keep: true, add: 'y' } };

    expect(diffApply(a, diff(a, b))).toEqual(b);
  });

  it('removes from the left of arrays when that preserves more elements', () => {
    const ops = diff({ l: ['a', 'b', 'c'] }, { l: ['b', 'c'] });
    expect(ops).toEqual([{ op: 'remove', path: ['l', 0] }]);
  });

  it('skips paths rejected by the skip callback', () => {
    const ops = diff({ id: 1, v: 1 }, { id: 2, v: 2 }, (path) => path.last() === 'id');
    expect(ops).toEqual([{ op: 'replace', path: ['v'], value: 2 }]);
  });

  it('compares non-plain objects with toString', () => {
    class Box {
      constructor(public v: number) {}
      toString() {
        return String(this.v);
      }
    }
    expect(diff({ b: new Box(1) }, { b: new Box(1) })).toEqual([]);
    expect(diff({ b: new Box(1) }, { b: new Box(2) })).toHaveLength(1);
  });

  it('does not mutate its input', () => {
    const a = { list: [1, 2] };
    diffApply(a, [{ op: 'add', path: ['list', 2], value: 3 }]);
    expect(a).toEqual({ list: [1, 2] });
  });

  it('rejects prototype pollution paths', () => {
    expect(() => diffApply({}, [{ op: 'add', path: ['__proto__', 'x'], value: 1 }])).toThrow();
  });
});
