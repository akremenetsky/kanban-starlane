import { MarkdownView, Platform, TFile, TFolder } from 'obsidian';
import { FRONTMATTER_KEY, VIEW_ICON, VIEW_TYPE } from 'src/constants';
import { getParentWindow } from 'src/dnd/util/getWindow';
import { t } from 'src/lang/helpers';
import { hasFrontmatterKey } from 'src/parsers/boardDetection';
import { KanbanView } from 'src/view/KanbanView';

import type KanbanPlugin from './KanbanPlugin';

/** Items added to Obsidian's file / folder / tab context menus. */
export function registerFileMenu(plugin: KanbanPlugin) {
  plugin.registerEvent(
    plugin.app.workspace.on('file-menu', (menu, file, source, leaf) => {
      if (source === 'link-context-menu') return;

      const fileIsFile = file instanceof TFile;
      const fileIsFolder = file instanceof TFolder;
      const leafIsMarkdown = leaf?.view instanceof MarkdownView;
      const leafIsKanban = leaf?.view instanceof KanbanView;

      // Add a menu item to the folder context menu to create a board
      if (fileIsFolder) {
        menu.addItem((item) => {
          item
            .setSection('action-primary')
            .setTitle(t('New kanban board'))
            .setIcon(VIEW_ICON)
            .onClick(() => plugin.newKanban(file));
        });
        return;
      }

      if (
        !Platform.isMobile &&
        fileIsFile &&
        leaf &&
        source === 'sidebar-context-menu' &&
        hasFrontmatterKey(plugin.app, file)
      ) {
        const views = plugin.getKanbanViews(getParentWindow(leaf.view.containerEl));
        let haveKanbanView = false;

        for (const view of views) {
          if (view.file === file) {
            view.onPaneMenu(menu, 'more-options', false);
            haveKanbanView = true;
            break;
          }
        }

        if (!haveKanbanView) {
          menu.addItem((item) => {
            item
              .setTitle(t('Open as kanban board'))
              .setIcon(VIEW_ICON)
              .setSection('pane')
              .onClick(() => {
                plugin.kanbanFileModes[leaf.id || file.path] = VIEW_TYPE;
                plugin.setKanbanView(leaf);
              });
          });

          return;
        }
      }

      if (
        leafIsMarkdown &&
        fileIsFile &&
        ['more-options', 'pane-more-options', 'tab-header'].includes(source) &&
        hasFrontmatterKey(plugin.app, file)
      ) {
        menu.addItem((item) => {
          item
            .setTitle(t('Open as kanban board'))
            .setIcon(VIEW_ICON)
            .setSection('pane')
            .onClick(() => {
              plugin.kanbanFileModes[leaf.id || file.path] = VIEW_TYPE;
              plugin.setKanbanView(leaf);
            });
        });
      }

      if (fileIsFile && leafIsKanban) {
        if (['pane-more-options', 'tab-header'].includes(source)) {
          menu.addItem((item) => {
            item
              .setTitle(t('Open as markdown'))
              .setIcon(VIEW_ICON)
              .setSection('pane')
              .onClick(() => {
                plugin.kanbanFileModes[leaf.id || file.path] = 'markdown';
                plugin.setMarkdownView(leaf);
              });
          });
        }

        if (Platform.isMobile) {
          const stateManager = plugin.stateManagers.get(file);
          const kanbanView = leaf.view as KanbanView;
          const boardView =
            kanbanView.viewSettings[FRONTMATTER_KEY] || stateManager.getSetting(FRONTMATTER_KEY);

          menu
            .addItem((item) => {
              item
                .setTitle(t('Add a list'))
                .setIcon('lucide-plus-circle')
                .setSection('pane')
                .onClick(() => {
                  kanbanView.emitter.emit('showLaneForm', undefined);
                });
            })
            .addItem((item) => {
              item
                .setTitle(t('Archive completed cards'))
                .setIcon('lucide-archive')
                .setSection('pane')
                .onClick(() => {
                  stateManager.archiveCompletedCards();
                });
            })
            .addItem((item) =>
              item
                .setTitle(t('View as board'))
                .setSection('pane')
                .setIcon(VIEW_ICON)
                .setChecked(boardView === 'basic' || boardView === 'board')
                .onClick(() => kanbanView.setView('board'))
            )
            .addItem((item) =>
              item
                .setTitle(t('View as table'))
                .setSection('pane')
                .setIcon('lucide-table')
                .setChecked(boardView === 'table')
                .onClick(() => kanbanView.setView('table'))
            )
            .addItem((item) =>
              item
                .setTitle(t('View as list'))
                .setSection('pane')
                .setIcon('lucide-server')
                .setChecked(boardView === 'list')
                .onClick(() => kanbanView.setView('list'))
            )
            .addItem((item) =>
              item
                .setTitle(t('Open board settings'))
                .setSection('pane')
                .setIcon('lucide-settings')
                .onClick(() => kanbanView.getBoardSettings())
            );
        }
      }
    })
  );
}
