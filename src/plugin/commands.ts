import { MarkdownView } from 'obsidian';
import { FRONTMATTER_KEY, VIEW_TYPE } from 'src/constants';
import { t } from 'src/lang/helpers';
import { basicFrontmatter } from 'src/parsers/markers';
import { KanbanView } from 'src/view/KanbanView';

import type KanbanPlugin from './KanbanPlugin';
import {
  convertAllLegacyBoards,
  convertLegacyBoardFile,
  findLegacyBoardFiles,
  importLegacySettings,
} from './migration';

/**
 * Command palette entries. Ids are namespaced by Obsidian as `kanban-starlane:<id>` and
 * users bind hotkeys to them, so never rename an existing id.
 */
export function registerCommands(plugin: KanbanPlugin) {
  const { app } = plugin;

  /** A command available only while a board is the active view. */
  const boardCommand = (id: string, name: string, run: (view: KanbanView) => void) => {
    plugin.addCommand({
      id,
      name,
      checkCallback: (checking) => {
        const view = app.workspace.getActiveViewOfType(KanbanView);
        if (!view) return false;
        if (!checking) run(view);
        return true;
      },
    });
  };

  plugin.addCommand({
    id: 'create-new-kanban-board',
    name: t('Create new board'),
    callback: () => plugin.newKanban(),
  });

  boardCommand('archive-completed-cards', t('Archive completed cards in active board'), (view) =>
    plugin.stateManagers.get(view.file).archiveCompletedCards()
  );

  plugin.addCommand({
    id: 'toggle-kanban-view',
    name: t('Toggle between Kanban and markdown mode'),
    checkCallback: (checking) => {
      const activeFile = app.workspace.getActiveFile();
      if (!activeFile) return false;

      const fileIsKanban =
        !!app.metadataCache.getFileCache(activeFile)?.frontmatter?.[FRONTMATTER_KEY];
      if (checking) return fileIsKanban;

      const kanbanView = app.workspace.getActiveViewOfType(KanbanView);
      if (kanbanView) {
        plugin.kanbanFileModes[kanbanView.leaf.id || activeFile.path] = 'markdown';
        plugin.setMarkdownView(kanbanView.leaf);
        return;
      }

      const markdownView = app.workspace.getActiveViewOfType(MarkdownView);
      if (fileIsKanban && markdownView) {
        plugin.kanbanFileModes[markdownView.leaf.id || activeFile.path] = VIEW_TYPE;
        plugin.setKanbanView(markdownView.leaf);
      }
    },
  });

  plugin.addCommand({
    id: 'convert-to-kanban',
    name: t('Convert empty note to Kanban'),
    checkCallback: (checking) => {
      const view = app.workspace.getActiveViewOfType(MarkdownView);
      if (!view || view.file.stat.size !== 0) return false;
      if (checking) return true;

      app.vault
        .modify(view.file, basicFrontmatter)
        .then(() => plugin.setKanbanView(view.leaf))
        .catch((e) => console.error(e));
    },
  });

  boardCommand('add-kanban-lane', t('Add a list'), (view) =>
    view.emitter.emit('showLaneForm', undefined)
  );
  boardCommand('view-board', t('View as board'), (view) => view.setView('board'));
  boardCommand('view-table', t('View as table'), (view) => view.setView('table'));
  boardCommand('view-list', t('View as list'), (view) => view.setView('list'));
  boardCommand('open-board-settings', t('Open board settings'), (view) => view.getBoardSettings());

  // Migration from the original obsidian-kanban plugin
  plugin.addCommand({
    id: 'convert-legacy-board',
    name: t('Convert board from the Kanban plugin'),
    checkCallback: (checking) => {
      const view = app.workspace.getActiveViewOfType(MarkdownView);
      if (!view?.file || !findLegacyBoardFiles(app).includes(view.file)) return false;
      if (checking) return true;

      convertLegacyBoardFile(app, view.file)
        .then(() => plugin.setKanbanView(view.leaf))
        .catch((e) => console.error(e));
    },
  });

  plugin.addCommand({
    id: 'convert-all-legacy-boards',
    name: t('Convert all boards from the Kanban plugin'),
    callback: () => convertAllLegacyBoards(plugin),
  });

  plugin.addCommand({
    id: 'import-legacy-settings',
    name: t('Import settings from the Kanban plugin'),
    callback: () => importLegacySettings(plugin),
  });
}
