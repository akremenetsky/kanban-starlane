import { extractInlineFields } from 'src/parsers/helpers/inlineMetadata';
import { describe, expect, it } from 'vitest';

const none = { dataview: false, tasks: false };
const dataview = { dataview: true, tasks: false };
const tasks = { dataview: false, tasks: true };

const keys = (line: string, sources: typeof none, task = false) =>
  (extractInlineFields(line, sources, task) ?? []).map((f) => [f.key, f.value]);

describe('extractInlineFields', () => {
  it('finds nothing when no metadata plugin is active', () => {
    expect(keys('a [k:: v] 📅 2024-01-01', none, true)).toEqual([]);
  });

  it('parses Dataview bracket and paren fields', () => {
    expect(keys('a [status:: open] and (owner:: me)', dataview)).toEqual([
      ['status', 'open'],
      ['owner', 'me'],
    ]);
  });

  it('parses Tasks emoji fields only when asked for task fields', () => {
    const line = 'do it 📅 2024-01-02 ⏫';
    expect(keys(line, tasks)).toEqual([]);
    expect(keys(line, tasks, true)).toEqual([
      ['due', '2024-01-02'],
      ['priority', '1'],
    ]);
  });

  it('reports field positions within the line', () => {
    const [f] = extractInlineFields('xx [k:: v] yy', dataview)!;
    expect('xx [k:: v] yy'.slice(f.start, f.end)).toBe('[k:: v]');
  });
});
