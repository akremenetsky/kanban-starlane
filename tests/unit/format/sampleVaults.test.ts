/**
 * Every board shipped in the manual test vault and the e2e vault must parse cleanly.
 */
import fs from 'fs';
import path from 'path';
import { isLegacyBoard } from 'src/parsers/legacy';
import { describe, expect, it } from 'vitest';

import { loadBoard } from '../../setup/harness';

const root = path.resolve(import.meta.dirname, '../../..');
const vaults = ['test-vault', 'tests/e2e/vaults/basic'];

function boardsIn(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...boardsIn(p));
    else if (p.endsWith('.md')) out.push(p);
  }
  return out;
}

describe('sample vault boards', () => {
  for (const vault of vaults) {
    for (const file of boardsIn(path.join(root, vault))) {
      const md = fs.readFileSync(file, 'utf8');
      if (!md.includes('kanban-starlane:') || isLegacyBoard(md)) continue;

      it(`${path.relative(root, file)} parses`, async () => {
        const { board } = await loadBoard(md);
        expect(board.data.errors).toEqual([]);
        expect(board.children.length).toBeGreaterThan(0);
      });
    }
  }
});
