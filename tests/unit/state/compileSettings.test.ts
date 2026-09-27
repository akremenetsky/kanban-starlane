import { compileSettings } from 'src/state/compileSettings';
import { describe, expect, it } from 'vitest';

const defaults = { dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm' };

describe('compileSettings', () => {
  it('fills defaults when nothing is set', () => {
    const s = compileSettings([], {}, defaults);

    expect(s).toMatchObject({
      'kanban-starlane': 'board',
      'date-format': 'YYYY-MM-DD',
      'date-display-format': 'YYYY-MM-DD',
      'date-time-display-format': 'YYYY-MM-DD HH:mm',
      'archive-date-format': 'YYYY-MM-DD HH:mm',
      'date-trigger': '@',
      'time-trigger': '@@',
      'inline-metadata-position': 'body',
      'show-add-list': true,
      'tag-action': 'obsidian',
      'tag-colors': [],
    });
  });

  it('prefers earlier board layers, then global settings', () => {
    const s = compileSettings(
      [{ 'date-format': 'DD.MM' }, { 'date-format': 'ignored', 'time-format': 'h a' }],
      { 'time-format': 'ignored', 'date-trigger': '!' },
      defaults
    );

    expect(s['date-format']).toBe('DD.MM');
    expect(s['time-format']).toBe('h a');
    expect(s['date-trigger']).toBe('!');
    expect(s['date-time-display-format']).toBe('DD.MM h a');
  });

  it('keeps explicit false for boolean settings with a true default', () => {
    expect(compileSettings([{ 'show-search': false }], {}, defaults)['show-search']).toBe(false);
  });
});
