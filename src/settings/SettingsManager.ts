import update, { Spec } from 'immutability-helper';
import { App } from 'obsidian';
import type KanbanPlugin from 'src/plugin/KanbanPlugin';

import { renderSettings } from './sections';
import { KanbanSettings } from './types';

export interface SettingsManagerConfig {
  onSettingsChange: (newSettings: KanbanSettings) => void;
}

/**
 * Holds the settings being edited (global defaults or one board's overrides) and
 * renders the settings UI into a container.
 */
export class SettingsManager {
  win: Window;
  app: App;
  plugin: KanbanPlugin;
  config: SettingsManagerConfig;
  settings: KanbanSettings;
  cleanupFns: Array<() => void> = [];
  applyDebounceTimer: number = 0;

  constructor(plugin: KanbanPlugin, config: SettingsManagerConfig, settings: KanbanSettings) {
    this.app = plugin.app;
    this.plugin = plugin;
    this.config = config;
    this.settings = settings;
  }

  /**
   * Apply a change immediately and notify listeners once edits pause for a second
   * (typing in a text field should not rewrite the board on every keystroke).
   */
  applySettingsUpdate(spec: Spec<KanbanSettings>) {
    this.settings = update(this.settings, spec);

    this.win.clearTimeout(this.applyDebounceTimer);
    this.applyDebounceTimer = this.win.setTimeout(() => {
      this.config.onSettingsChange(this.settings);
    }, 1000);
  }

  /** [edited value, global fallback]. The fallback is null when editing global settings. */
  getSetting(key: keyof KanbanSettings, local: boolean) {
    if (local) {
      return [this.settings[key], this.plugin.settings[key]];
    }

    return [this.settings[key], null];
  }

  constructUI(contentEl: HTMLElement, heading: string, local: boolean) {
    this.win = contentEl.win;
    renderSettings({ manager: this, local, containerEl: contentEl }, heading);
  }

  cleanUp() {
    this.win = null;
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }
}
