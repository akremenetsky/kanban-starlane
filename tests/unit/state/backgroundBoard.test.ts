import update from 'immutability-helper';
import { StateManager } from 'src/state/StateManager';
import { describe, expect, it, vi } from 'vitest';

import { board } from '../../setup/fixtures';
import { FakeView, createFakeApp, summarize } from '../../setup/harness';

const md = board(
  'kanban-starlane: board',
  '## Todo\n\n- [ ] one\n- [ ] two\n\n## Done\n\n- [ ] three'
);

async function loadInBackground(content = md) {
  const app = createFakeApp({ contents: { 'Work.md': content } });
  const file = app.vault.getAbstractFileByPath('Work.md');
  const onEmpty = vi.fn();
  const stateManager = new StateManager(app, file, onEmpty, () => ({}));
  stateManager.retain();
  await stateManager.loadFromDisk();
  return { app, file, stateManager, onEmpty };
}

const renameFirstCard = (stateManager: StateManager, title: string) =>
  stateManager.setState((b) =>
    update(b, {
      children: {
        0: {
          children: {
            0: { $set: stateManager.updateItemContent(b.children[0].children[0], title) },
          },
        },
      },
    })
  );

describe('StateManager without an open view', () => {
  it('parses the file from the vault', async () => {
    const { stateManager } = await loadInBackground();

    expect(summarize(stateManager.state).lanes.map((l) => l.items)).toEqual([
      ['one', 'two'],
      ['three'],
    ]);
  });

  it('writes edits to the vault', async () => {
    const { app, stateManager } = await loadInBackground();

    renameFirstCard(stateManager, 'edited');

    expect(app.vault.writes).toHaveLength(1);
    // The card gets a block id for its history.
    expect(app.vault.contents.get('Work.md')).toMatch(/- \[ \] edited \^\w+\n- \[ \] two/);
  });

  it('re-parses external changes and keeps ids of unchanged cards', async () => {
    const { stateManager } = await loadInBackground();
    const idOfTwo = stateManager.state.children[0].children[1].id;

    await stateManager.applyExternalChange(md.replace('- [ ] one', '- [ ] changed outside'));

    expect(stateManager.state.children[0].children[0].data.titleRaw).toBe('changed outside');
    expect(stateManager.state.children[0].children[1].id).toBe(idOfTwo);
  });

  it('ignores the modify event caused by its own write', async () => {
    const { app, stateManager } = await loadInBackground();
    renameFirstCard(stateManager, 'edited');
    const before = stateManager.state;

    await stateManager.applyExternalChange(app.vault.contents.get('Work.md'));

    expect(stateManager.state).toBe(before);
  });

  it('hands saving over to a view that opens the file later', async () => {
    const { app, file, stateManager } = await loadInBackground();
    const view = new FakeView(file, md);

    await stateManager.registerView(view as any, md, false);
    renameFirstCard(stateManager, 'edited in view');

    expect(app.vault.writes).toHaveLength(0);
    expect(view.data).toContain('- [ ] edited in view');
  });

  it('parses the data of the first view even when told not to', async () => {
    const { file, stateManager } = await loadInBackground();
    const newer = md.replace('- [ ] one', '- [ ] newer on disk');

    await stateManager.registerView(new FakeView(file, newer) as any, newer, false);

    expect(stateManager.state.children[0].children[0].data.titleRaw).toBe('newer on disk');
  });

  it('is disposed only when views and background users are gone', async () => {
    const { file, stateManager, onEmpty } = await loadInBackground();
    const view = new FakeView(file, md);
    await stateManager.registerView(view as any, md, false);

    stateManager.release();
    expect(onEmpty).not.toHaveBeenCalled();

    stateManager.unregisterView(view as any);
    expect(onEmpty).toHaveBeenCalledOnce();
  });

  it('keeps working in the background after its last view closes', async () => {
    const { app, file, stateManager, onEmpty } = await loadInBackground();
    const view = new FakeView(file, md);
    await stateManager.registerView(view as any, md, false);

    stateManager.unregisterView(view as any);
    renameFirstCard(stateManager, 'after close');

    expect(onEmpty).not.toHaveBeenCalled();
    expect(app.vault.contents.get('Work.md')).toContain('- [ ] after close');
  });

  it('does not revert an edit when the event of an earlier write arrives late', async () => {
    const { app, stateManager } = await loadInBackground();
    renameFirstCard(stateManager, 'first edit');
    await flush();
    const afterFirst = app.vault.contents.get('Work.md');
    renameFirstCard(stateManager, 'second edit');
    await flush();

    // The modify event of the first write arrives only now; the second one is still pending.
    await stateManager.applyExternalChange(afterFirst);

    expect(stateManager.state.children[0].children[0].data.titleRaw).toBe('second edit');
    expect(app.vault.contents.get('Work.md')).toContain('- [ ] second edit');
  });

  it('keeps a change made on disk instead of overwriting it', async () => {
    const { app, stateManager } = await loadInBackground();
    const outside = md.replace('- [ ] two', '- [ ] typed in the markdown view');
    app.vault.contents.set('Work.md', outside); // its modify event has not arrived yet

    renameFirstCard(stateManager, 'edited on another board');
    await flush();

    expect(app.vault.contents.get('Work.md')).toBe(outside);
    expect(stateManager.state.children[0].children.map((i) => i.data.titleRaw)).toEqual([
      'one',
      'typed in the markdown view',
    ]);
  });

  it('becomes ready with an error when the file cannot be read', async () => {
    const { app, file } = await loadInBackground();
    app.vault.read = async () => {
      throw new Error('gone');
    };
    const broken = new StateManager(
      app,
      file,
      () => {},
      () => ({})
    );
    broken.retain();

    await broken.loadFromDisk();
    await broken.ready;

    expect(broken.hasError()).toBe(true);
  });
});

const flush = () => new Promise((r) => setTimeout(r, 0));
