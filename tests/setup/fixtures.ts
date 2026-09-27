import fs from 'fs';
import path from 'path';

export const fixturesDir = path.resolve(import.meta.dirname, '../fixtures');

/** Read a fixture, dropping one trailing newline an editor may have added. */
export function readFixture(relPath: string): string {
  return fs.readFileSync(path.join(fixturesDir, relPath), 'utf8').replace(/\n$/, '');
}

export function listFixtures(dir: string): string[] {
  return fs
    .readdirSync(path.join(fixturesDir, dir))
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(dir, f));
}

/** Build a board file body in the canonical serializer layout. */
export function board(frontmatter: string, body: string, settings = '{"kanban-starlane":"board"}') {
  return `---\n\n${frontmatter}\n\n---\n\n${body}\n\n%% kanban-starlane:settings\n\`\`\`\n${settings}\n\`\`\`\n%%`;
}
