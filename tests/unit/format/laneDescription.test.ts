/**
 * Lane descriptions: markdown between a lane heading and its cards.
 */
import update from 'immutability-helper';
import { describe, expect, it } from 'vitest';

import { board } from '../../setup/fixtures';
import { loadBoard } from '../../setup/harness';

const fm = 'kanban-starlane: board';

async function descriptions(body: string) {
  const { board: b } = await loadBoard(board(fm, body));
  return b.children.map((lane) => lane.data.description);
}

describe('lane description', () => {
  it('reads the text between the heading and the cards', async () => {
    expect(await descriptions('## Todo\n\nWork for **this** week\n\n- [ ] a')).toEqual([
      'Work for **this** week',
    ]);
  });

  it('is undefined when a lane has none', async () => {
    expect(await descriptions('## Todo\n\n- [ ] a\n\n## Empty')).toEqual([undefined, undefined]);
  });

  it('keeps several lines and paragraphs', async () => {
    expect(
      await descriptions('## Todo\n\nline one\nline two\n\nsecond paragraph\n\n- [ ] a')
    ).toEqual(['line one\nline two\n\nsecond paragraph']);
  });

  it('reads a description of a lane without cards', async () => {
    expect(await descriptions('## A\n\nno cards yet\n\n## B\n\n- [ ] b')).toEqual([
      'no cards yet',
      undefined,
    ]);
  });

  it('does not take the Complete marker, the archive break or the settings block', async () => {
    const { board: b } = await loadBoard(
      board(
        fm,
        '## Done\n\nFinished work\n\n**Complete**\n- [x] a\n\n## Last\n\n***\n\n## Archive\n\n- [x] old'
      )
    );

    expect(b.children.map((l) => [l.data.description, l.data.shouldMarkItemsComplete])).toEqual([
      ['Finished work', true],
      [undefined, false],
    ]);
    expect(b.data.archive.map((i) => i.data.titleRaw)).toEqual(['old']);
  });

  it('is written between the heading and the cards', async () => {
    const md = board(
      fm,
      '## Done (2)\n\nFinished work\nsecond line\n\n**Complete**\n- [x] a\n\n\n## Empty\n\nNothing here\n\n\n\n'
    );
    const { toMarkdown } = await loadBoard(md);

    expect(toMarkdown()).toBe(md);
  });

  it('adding and removing a description changes only that lane', async () => {
    const md = board(fm, '## Todo\n\n- [ ] a\n\n\n');
    const { stateManager, toMarkdown } = await loadBoard(md);

    stateManager.setState((b) =>
      update(b, { children: { 0: { data: { description: { $set: 'Short note' } } } } })
    );
    expect(toMarkdown()).toBe(board(fm, '## Todo\n\nShort note\n\n- [ ] a\n\n\n'));

    stateManager.setState((b) =>
      update(b, { children: { 0: { data: { description: { $set: '' } } } } })
    );
    expect(toMarkdown()).toBe(md);
  });

  it('follows edits of the file made outside the board', async () => {
    const { stateManager } = await loadBoard(board(fm, '## Todo\n\n- [ ] a\n\n\n'));

    const added = stateManager.getParsedBoard(board(fm, '## Todo\n\nNew note\n\n- [ ] a\n\n\n'));
    expect(added.children[0].data.description).toBe('New note');

    stateManager.setState(added);
    const removed = stateManager.getParsedBoard(board(fm, '## Todo\n\n- [ ] a\n\n\n'));
    expect(removed.children[0].data.description).toBeUndefined();
  });
});
