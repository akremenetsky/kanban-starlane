import { App, Plugin } from 'obsidian';

interface NaturalLanguageDatesPlugin extends Plugin {
  settings?: { format?: string; timeFormat?: string };
}

function coreOption(app: App, pluginId: string, option: string): string | undefined {
  const plugin = app.internalPlugins.plugins[pluginId];
  if (!plugin?.enabled) return undefined;
  const value = plugin.instance.options?.[option];
  return typeof value === 'string' ? value : undefined;
}

function nlDatesSettings(app: App) {
  const plugin: NaturalLanguageDatesPlugin | undefined = app.plugins.plugins['nldates-obsidian'];
  return plugin?.settings;
}

export function getDefaultDateFormat(app: App) {
  return (
    coreOption(app, 'daily-notes', 'format') ||
    nlDatesSettings(app)?.format ||
    coreOption(app, 'templates', 'dateFormat') ||
    'YYYY-MM-DD'
  );
}

export function getDefaultTimeFormat(app: App) {
  return nlDatesSettings(app)?.timeFormat || coreOption(app, 'templates', 'timeFormat') || 'HH:mm';
}
