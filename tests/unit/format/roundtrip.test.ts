/**
 * Canonical board files must survive parse -> serialize byte-for-byte.
 * Every file in tests/fixtures/boards is canonical (it is exactly what the serializer writes).
 * If you change the format on purpose, regenerate with `npm run test:update-fixtures`
 * and review the diff.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { fixturesDir, listFixtures, readFixture } from '../../setup/fixtures';
import { loadBoard } from '../../setup/harness';

const files = { 'Some Note.md': {}, 'image.png': {} };

describe('board round-trip', () => {
  for (const fixture of listFixtures('boards')) {
    it(`${fixture} is stable`, async () => {
      const md = readFixture(fixture);
      const { toMarkdown, board } = await loadBoard(md, { files });

      if (process.env.UPDATE_FIXTURES) {
        fs.writeFileSync(path.join(fixturesDir, fixture), toMarkdown());
        return;
      }

      expect(board.data.errors).toEqual([]);
      expect(toMarkdown()).toBe(md);
    });

    it(`${fixture} is idempotent`, async () => {
      const once = (await loadBoard(readFixture(fixture), { files })).toMarkdown();
      const twice = (await loadBoard(once, { files })).toMarkdown();
      expect(twice).toBe(once);
    });
  }
});
