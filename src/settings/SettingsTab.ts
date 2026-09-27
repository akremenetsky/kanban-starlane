import { PluginSettingTab } from 'obsidian';
import { c } from 'src/components/helpers';
import { t } from 'src/lang/helpers';
import type KanbanPlugin from 'src/plugin/KanbanPlugin';

import { SettingsManager, SettingsManagerConfig } from './SettingsManager';

/** Global defaults, in Obsidian's Settings → Community plugins. */
export class KanbanSettingsTab extends PluginSettingTab {
  plugin: KanbanPlugin;
  settingsManager: SettingsManager;

  constructor(plugin: KanbanPlugin, config: SettingsManagerConfig) {
    super(plugin.app, plugin);
    this.plugin = plugin;
    this.settingsManager = new SettingsManager(plugin, config, plugin.settings);
  }

  display() {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.addClass(c('board-settings-modal'));

    this.settingsManager.constructUI(containerEl, t('Kanban Plugin'), false);
  }
}
