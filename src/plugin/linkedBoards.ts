import update from 'immutability-helper';
import { LinkedLanes } from 'src/model/types';
import { hasFrontmatterKey } from 'src/parsers/boardDetection';
import { readLinkedLanes } from 'src/state/linkedLanes';

import type KanbanPlugin from './KanbanPlugin';

/**
 * Apply `transform` to the `linked-lanes` setting of every board that may link to `path`
 * (used when a linked board or one of its lanes is renamed).
 */
export async function updateBoardsLinkingTo(
  plugin: KanbanPlugin,
  path: string,
  transform: (linked: LinkedLanes) => LinkedLanes
) {
  const needle = JSON.stringify(path).slice(1, -1);

  for (const file of plugin.app.vault.getMarkdownFiles()) {
    if (file.path === path || !hasFrontmatterKey(plugin.app, file)) continue;

    // Cheap pre-check so we do not load every board of the vault.
    const open = plugin.stateManagers.get(file);
    const text = open?.state
      ? JSON.stringify(open.state.data.settings['linked-lanes'] ?? {})
      : await plugin.app.vault.cachedRead(file);
    if (!text.includes(needle)) continue;

    const stateManager = await plugin.retainBoard(file);
    try {
      const linked = readLinkedLanes(stateManager.state.data.settings);
      const next = transform(linked);
      // Only boards that really change are written (and so re-serialized).
      if (next !== linked && !stateManager.hasError()) {
        stateManager.setState((board) =>
          update(board, { data: { settings: { 'linked-lanes': { $set: next } } } })
        );
      }
    } finally {
      stateManager.release();
    }
  }
}
