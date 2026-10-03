/**
 * Migration from the original obsidian-kanban plugin: convert its boards and import its
 * global settings. The pure text conversion lives in parsers/legacy.ts.
 */
import { App, Modal, Notice, Setting, TFile, normalizePath } from 'obsidian';
import { FRONTMATTER_KEY, LEGACY_FRONTMATTER_KEY } from 'src/constants';
import { t } from 'src/lang/helpers';
import { convertLegacyBoard, isLegacyBoard } from 'src/parsers/legacy';
import { KanbanSettings } from 'src/settings/types';

import type KanbanPlugin from './KanbanPlugin';

const LEGACY_PLUGIN_ID = 'obsidian-kanban';

/** Notes whose frontmatter marks them as obsidian-kanban boards (from the metadata cache). */
export function findLegacyBoardFiles(app: App): TFile[] {
  return app.vault.getMarkdownFiles().filter((file) => {
    const fm = app.metadataCache.getFileCache(file)?.frontmatter;
    return !!fm?.[LEGACY_FRONTMATTER_KEY] && !fm[FRONTMATTER_KEY];
  });
}

/** Convert one file in place. Returns false if it was not a legacy board. */
export async function convertLegacyBoardFile(app: App, file: TFile): Promise<boolean> {
  let converted = false;
  await app.vault.process(file, (md) => {
    if (!isLegacyBoard(md)) return md;
    converted = true;
    return convertLegacyBoard(md);
  });
  return converted;
}

export async function convertAllLegacyBoards(plugin: KanbanPlugin) {
  const files = findLegacyBoardFiles(plugin.app);

  if (!files.length) {
    new Notice(t('No boards from the Kanban plugin found.'));
    return;
  }

  const confirmed = await confirm(
    plugin.app,
    `${t('Boards from the Kanban plugin found:')} ${files.length}`,
    t(
      'They will be converted to Kanban Starlane boards. The original Kanban plugin will no longer open them.'
    )
  );
  if (!confirmed) return;

  let count = 0;
  for (const file of files) {
    if (await convertLegacyBoardFile(plugin.app, file)) count++;
  }
  new Notice(`${t('Boards converted:')} ${count}`);
}

/** Legacy global settings with the legacy frontmatter key renamed. */
export function mapLegacySettings(legacy: Record<string, unknown>): KanbanSettings {
  const settings: Record<string, unknown> = { ...legacy };
  if (LEGACY_FRONTMATTER_KEY in settings) {
    settings[FRONTMATTER_KEY] = settings[LEGACY_FRONTMATTER_KEY];
    delete settings[LEGACY_FRONTMATTER_KEY];
  }
  return settings;
}

export async function importLegacySettings(plugin: KanbanPlugin) {
  const { adapter, configDir } = plugin.app.vault;
  const path = normalizePath(`${configDir}/plugins/${LEGACY_PLUGIN_ID}/data.json`);

  if (!(await adapter.exists(path))) {
    new Notice(t('Kanban plugin settings not found.'));
    return;
  }

  const legacy = JSON.parse(await adapter.read(path)) as Record<string, unknown>;
  await plugin.updateSettings({ ...plugin.settings, ...mapLegacySettings(legacy) });
  new Notice(t('Settings imported from the Kanban plugin.'));
}

function confirm(app: App, title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    let result = false;
    const modal = new Modal(app);
    modal.titleEl.setText(title);
    modal.contentEl.createEl('p', { text: message });
    new Setting(modal.contentEl)
      .addButton((b) => b.setButtonText(t('Cancel')).onClick(() => modal.close()))
      .addButton((b) =>
        b
          .setButtonText(t('Convert'))
          .setCta()
          .onClick(() => {
            result = true;
            modal.close();
          })
      );
    modal.onClose = () => resolve(result);
    modal.open();
  });
}
