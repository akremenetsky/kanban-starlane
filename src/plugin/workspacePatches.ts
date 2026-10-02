/**
 * Monkey patches on Obsidian internals. Keep them minimal: each one must be undone on
 * unload (plugin.register) and is a likely source of breakage on Obsidian updates.
 *
 * - commands.executeCommand: forwards command ids to the active board (daily-note
 *   navigation, search hotkey) via view.emitter 'hotkey'.
 * - workspace.setActiveLeaf: exposes the board's inline card editor as activeEditor so
 *   editor commands work while editing a card.
 * - WorkspaceLeaf.setViewState: opens board files in the kanban view unless the user chose
 *   markdown for that leaf; WorkspaceLeaf.detach forgets that choice.
 */
import { around } from 'monkey-around';
import { ViewState, WorkspaceLeaf } from 'obsidian';
import { FRONTMATTER_KEY, VIEW_TYPE } from 'src/constants';
import { KanbanView } from 'src/view/KanbanView';

import type KanbanPlugin from './KanbanPlugin';

export function registerWorkspacePatches(plugin: KanbanPlugin) {
  const self = plugin;

  plugin.app.workspace.onLayoutReady(() => {
    plugin.register(
      around((self.app as any).commands, {
        executeCommand(next) {
          return function (command: any) {
            const view = self.app.workspace.getActiveViewOfType(KanbanView);

            if (view && command?.id) {
              view.emitter.emit('hotkey', { commandId: command.id });
            }

            return next.call(this, command);
          };
        },
      })
    );
  });

  plugin.register(
    around(plugin.app.workspace, {
      // @ts-ignore -- patches an Obsidian method the public typings do not cover
      setActiveLeaf(next) {
        return function (...args) {
          next.apply(this, args);
          const view = this.getActiveViewOfType(KanbanView);
          if (view?.activeEditor) {
            this.activeEditor = view.activeEditor;
          }
        };
      },
    })
  );

  // Monkey patch WorkspaceLeaf to open Kanbans with KanbanView by default
  plugin.register(
    around(WorkspaceLeaf.prototype, {
      // Kanbans can be viewed as markdown or kanban, and we keep track of the mode
      // while the file is open. When the file closes, we no longer need to keep track of it.
      detach(next) {
        return function () {
          const state = this.view?.getState();

          if (state?.file && self.kanbanFileModes[this.id || state.file]) {
            delete self.kanbanFileModes[this.id || state.file];
          }

          return next.apply(this);
        };
      },

      setViewState(next) {
        return function (state: ViewState, ...rest: any[]) {
          if (
            // Don't force kanban mode during shutdown
            self._loaded &&
            // If we have a markdown file
            state.type === 'markdown' &&
            state.state?.file &&
            // And the current mode of the file is not set to markdown
            self.kanbanFileModes[this.id || state.state.file] !== 'markdown'
          ) {
            // Then check for the kanban frontMatterKey
            const filePath = state.state.file as string;
            const cache = self.app.metadataCache.getCache(filePath);

            if (cache?.frontmatter && cache.frontmatter[FRONTMATTER_KEY]) {
              // If we have it, force the view type to kanban
              const newState = {
                ...state,
                type: VIEW_TYPE,
              };

              self.kanbanFileModes[filePath] = VIEW_TYPE;

              return next.apply(this, [newState, ...rest]);
            }
          }

          return next.apply(this, [state, ...rest]);
        };
      },
    })
  );
}
