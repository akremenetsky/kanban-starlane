import { TFile, debounce } from 'obsidian';
import { FRONTMATTER_KEY, VIEW_TYPE } from 'src/constants';
import { retargetLinkedFile } from 'src/state/linkedLanes';
import { KanbanView } from 'src/view/KanbanView';

import type KanbanPlugin from './KanbanPlugin';
import { updateBoardsLinkingTo } from './linkedBoards';

/**
 * Keep open boards in sync with the vault: renames, and changes to notes that cards link
 * to (their metadata is shown on cards).
 */
export function registerVaultEvents(plugin: KanbanPlugin) {
  plugin.registerEvent(
    plugin.app.vault.on('rename', (file, oldPath) => {
      const kanbanLeaves = plugin.app.workspace.getLeavesOfType(VIEW_TYPE);

      kanbanLeaves.forEach((leaf) => {
        (leaf.view as KanbanView).handleRename(file.path, oldPath);
      });

      if (file instanceof TFile) {
        updateBoardsLinkingTo(plugin, oldPath, (linked) =>
          retargetLinkedFile(linked, oldPath, file.path)
        ).catch((e) => console.error(e));
      }
    })
  );

  const notifyFileChange = debounce(
    (file: TFile) => {
      plugin.stateManagers.forEach((manager) => {
        if (manager.file !== file) {
          manager.onFileMetadataChange();
        }
      });
    },
    2000,
    true
  );

  plugin.registerEvent(
    plugin.app.vault.on('modify', (file) => {
      if (file instanceof TFile) {
        const background = plugin.stateManagers.get(file);
        if (background && background.viewSet.size === 0) {
          plugin.app.vault
            .read(file)
            .then((md) => background.applyExternalChange(md))
            .catch((e) => console.error(e));
        }

        notifyFileChange(file);
      }
    })
  );

  plugin.registerEvent(
    plugin.app.metadataCache.on('changed', (file) => {
      notifyFileChange(file);
    })
  );

  plugin.registerEvent(
    (plugin.app as any).metadataCache.on('dataview:metadata-change', (_: any, file: TFile) => {
      notifyFileChange(file);
    })
  );

  plugin.registerEvent(
    (plugin.app as any).metadataCache.on('dataview:api-ready', () => {
      plugin.stateManagers.forEach((manager) => {
        manager.forceRefresh();
      });
    })
  );

  (plugin.app.workspace as any).registerHoverLinkSource(FRONTMATTER_KEY, {
    display: 'Kanban',
    defaultMod: true,
  });
}
