import { boardColorPalette, getBoardColor } from 'src/shared/colors';
import { describe, expect, it } from 'vitest';

import { board } from '../../setup/fixtures';
import { loadBoard } from '../../setup/harness';

describe('getBoardColor', () => {
  it('uses the explicit board color', () => {
    expect(getBoardColor('Work.md', '#123456')).toBe('#123456');
  });

  it('falls back to a palette color that is stable for the path', () => {
    const color = getBoardColor('Boards/Work.md');

    expect(boardColorPalette).toContain(color);
    expect(getBoardColor('Boards/Work.md')).toBe(color);
  });

  it('gives different boards different colors (for these paths)', () => {
    expect(getBoardColor('Boards/Work.md')).not.toBe(getBoardColor('Boards/Personal.md'));
  });
});

describe('board-color setting', () => {
  it('is read from and written to the settings footer', async () => {
    const md = board(
      'kanban-starlane: board',
      '## Todo\n\n- [ ] card',
      '{"kanban-starlane":"board","board-color":"#46a758"}'
    );
    const { stateManager, toMarkdown } = await loadBoard(md);

    expect(stateManager.getSetting('board-color')).toBe('#46a758');
    expect(toMarkdown()).toContain('{"kanban-starlane":"board","board-color":"#46a758"}');
  });
});
