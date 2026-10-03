/**
 * Building blocks for the settings UI. Every control follows the same rules:
 *
 * - `local` (board settings modal): the control shows the board value, falling back to the
 *   global value, then to `defaultValue`. "Reset" removes the board value.
 * - global (plugin settings tab): the control shows the global value, then `defaultValue`.
 * - Clearing a text/number/format input removes the key (the fallback applies again).
 */
import { Setting } from 'obsidian';
import { t } from 'src/lang/helpers';

import type { SettingsManager } from './SettingsManager';
import { KanbanSettings } from './types';

export interface SettingsContext {
  manager: SettingsManager;
  /** true when editing a single board's settings (board settings modal). */
  local: boolean;
  containerEl: HTMLElement;
}

type Key = keyof KanbanSettings;

interface BaseOptions {
  name: string;
  desc?: string | DocumentFragment;
}

function values<K extends Key>(ctx: SettingsContext, key: K) {
  const [value, globalValue] = ctx.manager.getSetting(key, ctx.local);
  return { value: value as KanbanSettings[K], globalValue: globalValue as KanbanSettings[K] };
}

function newSetting(ctx: SettingsContext, opts: BaseOptions) {
  const setting = new Setting(ctx.containerEl).setName(opts.name);
  if (opts.desc) setting.setDesc(opts.desc);
  return setting;
}

function set<K extends Key>(ctx: SettingsContext, key: K, value: KanbanSettings[K]) {
  ctx.manager.applySettingsUpdate({ [key]: { $set: value } });
}

function unset(ctx: SettingsContext, key: Key) {
  ctx.manager.applySettingsUpdate({ $unset: [key] });
}

function addResetButton(setting: Setting, onReset: () => void) {
  setting.addExtraButton((b) => {
    b.setIcon('lucide-rotate-ccw').setTooltip(t('Reset to default')).onClick(onReset);
  });
}

export function heading(ctx: SettingsContext, text: string) {
  ctx.containerEl.createEl('h4', { text });
}

export function toggleSetting(
  ctx: SettingsContext,
  key: Key,
  opts: BaseOptions & { defaultValue?: boolean }
) {
  const defaultValue = opts.defaultValue ?? false;
  const setting = newSetting(ctx, opts);

  setting.addToggle((toggle) => {
    const { value, globalValue } = values(ctx, key);
    toggle.setValue(Boolean(value ?? globalValue ?? defaultValue));
    toggle.onChange((next) => set(ctx, key, next));

    addResetButton(setting, () => {
      const { globalValue } = values(ctx, key);
      // setValue fires onChange ($set); the $unset queued after it wins.
      toggle.setValue(Boolean(globalValue ?? defaultValue));
      unset(ctx, key);
    });
  });

  return setting;
}

export function dropdownSetting(
  ctx: SettingsContext,
  key: Key,
  opts: BaseOptions & {
    options: Array<[value: string, label: string]>;
    defaultValue: string;
    /** Convert the dropdown string to the stored value. '' always unsets. */
    parse?: (value: string) => KanbanSettings[Key];
    resettable?: boolean;
  }
) {
  const setting = newSetting(ctx, opts);

  setting.addDropdown((dropdown) => {
    for (const [value, label] of opts.options) dropdown.addOption(value, label);

    const { value, globalValue } = values(ctx, key);
    dropdown.setValue(value?.toString() || globalValue?.toString() || opts.defaultValue);
    dropdown.onChange((next) => {
      if (next === '') unset(ctx, key);
      else set(ctx, key, opts.parse ? opts.parse(next) : next);
    });

    if (opts.resettable) {
      addResetButton(setting, () => {
        const { globalValue } = values(ctx, key);
        dropdown.setValue(globalValue?.toString() || opts.defaultValue);
        unset(ctx, key);
      });
    }
  });

  return setting;
}

/** A text input whose current value falls back to the global value (e.g. date triggers). */
export function textSetting(
  ctx: SettingsContext,
  key: Key,
  opts: BaseOptions & { defaultValue: string }
) {
  return newSetting(ctx, opts).addText((text) => {
    const { value, globalValue } = values(ctx, key);
    if (value || globalValue) text.setValue(String(value || globalValue));
    text.setPlaceholder(String(globalValue || opts.defaultValue));
    text.onChange((next) => (next ? set(ctx, key, next) : unset(ctx, key)));
  });
}

/** A text input that only shows the local value; the fallback is shown as the placeholder. */
export function overrideTextSetting(
  ctx: SettingsContext,
  key: Key,
  opts: BaseOptions & { defaultValue?: string }
) {
  return newSetting(ctx, opts).addText((text) => {
    const { value, globalValue } = values(ctx, key);
    const fallback = globalValue || opts.defaultValue;
    text.inputEl.placeholder = fallback ? `${fallback} (${t('default')})` : '';
    text.inputEl.value = value ? String(value) : '';
    text.onChange((next) => (next ? set(ctx, key, next) : unset(ctx, key)));
  });
}

const numberRegEx = /^-?\d+(?:\.\d+)?$/;

export function numberSetting(
  ctx: SettingsContext,
  key: Key,
  opts: BaseOptions & { defaultValue: number; min?: number }
) {
  return newSetting(ctx, opts).addText((text) => {
    const { value, globalValue } = values(ctx, key);

    text.inputEl.setAttr('type', 'number');
    text.inputEl.placeholder = `${globalValue ?? opts.defaultValue} (${t('default')})`;
    text.inputEl.value = value !== undefined && value !== null ? String(value) : '';

    text.onChange((next) => {
      const valid = numberRegEx.test(next) && (opts.min === undefined || Number(next) >= opts.min);
      text.inputEl.toggleClass('error', !!next && !valid);

      if (next && valid) set(ctx, key, parseInt(next));
      else unset(ctx, key);
    });
  });
}

function formatReference(frag: DocumentFragment) {
  frag.appendText(t('For more syntax, refer to') + ' ');
  frag.createEl('a', {
    text: t('format reference'),
    href: 'https://momentjs.com/docs/#/displaying/format/',
    attr: { target: '_blank' },
  });
  frag.createEl('br');
}

/** A colour picker; only meaningful per board, so it has no global fallback. */
export function colorSetting(ctx: SettingsContext, key: Key, opts: BaseOptions) {
  const setting = newSetting(ctx, opts);

  setting.addColorPicker((picker) => {
    const { value } = values(ctx, key);
    if (value) picker.setValue(String(value));
    picker.onChange((next) => set(ctx, key, next));

    addResetButton(setting, () => unset(ctx, key));
  });

  return setting;
}

/** A moment.js format input with a live sample. */
export function momentFormatSetting(
  ctx: SettingsContext,
  key: Key,
  opts: BaseOptions & { intro?: string; defaultFormat: () => string }
) {
  const setting = newSetting(ctx, { name: opts.name });

  setting.addMomentFormat((mf) => {
    setting.descEl.appendChild(
      createFragment((frag) => {
        if (opts.intro) {
          frag.appendText(opts.intro);
          frag.createEl('br');
        }
        formatReference(frag);
        frag.appendText(t('Your current syntax looks like this') + ': ');
        mf.setSampleEl(frag.createEl('b', { cls: 'u-pop' }));
        frag.createEl('br');
      })
    );

    const { value, globalValue } = values(ctx, key);
    const defaultFormat = opts.defaultFormat();

    mf.setPlaceholder(defaultFormat);
    mf.setDefaultFormat(defaultFormat);
    if (value || globalValue) mf.setValue(String(value || globalValue));

    mf.onChange((next) => (next ? set(ctx, key, next) : unset(ctx, key)));
  });

  return setting;
}
