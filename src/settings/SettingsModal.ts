import { Modal } from 'obsidian';
import { c } from 'src/components/helpers';
import type { KanbanView } from 'src/view/KanbanView';

import { SettingsManager, SettingsManagerConfig } from './SettingsManager';
import { KanbanSettings } from './types';

/** Per-board settings, opened from the board header or pane menu. */
export class SettingsModal extends Modal {
  view: KanbanView;
  settingsManager: SettingsManager;

  constructor(view: KanbanView, config: SettingsManagerConfig, settings: KanbanSettings) {
    super(view.app);

    this.view = view;
    this.settingsManager = new SettingsManager(view.plugin, config, settings);
  }

  onOpen() {
    const { contentEl, modalEl } = this;

    modalEl.addClass(c('board-settings-modal'));

    this.settingsManager.constructUI(contentEl, this.view.file.basename, true);
  }

  onClose() {
    const { contentEl } = this;

    this.settingsManager.cleanUp();
    contentEl.empty();
  }
}
