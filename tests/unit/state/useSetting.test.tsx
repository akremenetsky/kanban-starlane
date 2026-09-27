import { render } from 'preact';
import { act } from 'preact/test-utils';
import { StateManager } from 'src/state/StateManager';
import { describe, expect, it } from 'vitest';

import { board } from '../../setup/fixtures';
import { createFakeApp, makeFile } from '../../setup/harness';

describe('StateManager.useSetting', () => {
  it('sees a value that arrived between the first render and its effect', async () => {
    const stateManager = new StateManager(
      createFakeApp(),
      makeFile('Board.md'),
      () => {},
      () => ({})
    );
    const seen: unknown[] = [];

    function Probe(): null {
      seen.push(stateManager.useSetting('lane-width'));
      return null;
    }

    const root = document.createElement('div');
    render(<Probe />, root); // first render; effects are not flushed yet

    stateManager.setState(
      stateManager.getParsedBoard(
        board('kanban-starlane: board', '## A', '{"kanban-starlane":"board","lane-width":300}')
      ),
      false
    );
    // Preact runs effects after paint, then re-renders on the state update.
    await new Promise((r) => setTimeout(r, 150));
    await act(async () => {});

    expect(seen.at(-1)).toBe(300);
  });
});
