/**
 * Integration with the Obsidian Tasks plugin (obsidian-tasks-plugin).
 * All access to Tasks internals goes through this module.
 */
import { App, TFile } from 'obsidian';
import { Item } from 'src/model/types';

export function getTasksPlugin(app: App) {
  if (!(app as any).plugins.enabledPlugins.has('obsidian-tasks-plugin')) {
    return null;
  }

  return (app as any).plugins.plugins['obsidian-tasks-plugin'];
}

function getTasksPluginSettings(app: App) {
  return (app as any).workspace.editorSuggest.suggests.find(
    (s: any) => s.settings && s.settings.taskFormat
  )?.settings;
}

export function getTaskStatusDone(app: App): string {
  const settings = getTasksPluginSettings(app);
  const statuses = settings?.statusSettings;
  if (!statuses) return 'x';

  let done = statuses.coreStatuses?.find((s: any) => s.type === 'DONE');
  if (!done) done = statuses.customStatuses?.find((s: any) => s.type === 'DONE');
  if (!done) return 'x';

  return done.symbol;
}

export function getTaskStatusPreDone(app: App): string {
  const settings = getTasksPluginSettings(app);
  const statuses = settings?.statusSettings;
  if (!statuses) return ' ';

  const done = getTaskStatusDone(app);

  let preDone = statuses.coreStatuses?.find((s: any) => s.nextStatusSymbol === done);
  if (!preDone) preDone = statuses.customStatuses?.find((s: any) => s.nextStatusSymbol === done);
  if (!preDone) return ' ';

  return preDone.symbol;
}

export function toggleTaskString(app: App, item: string, file: TFile): string | null {
  const plugin = getTasksPlugin(app);
  if (!plugin) return null;
  return plugin.apiV1?.executeToggleTaskDoneCommand?.(item, file.path) ?? null;
}

export function toggleTask(app: App, item: Item, file: TFile): [string[], string[], number] | null {
  const plugin = getTasksPlugin(app);
  if (!plugin) {
    return null;
  }

  const prefix = `- [${item.data.checkChar}] `;
  const originalLines = item.data.titleRaw.split(/\n\r?/g);

  const taskSettings = getTasksPluginSettings(app);
  const recurrenceOnNextLine = !!taskSettings?.recurrenceOnNextLine;

  let which = 0;
  const result = plugin.apiV1?.executeToggleTaskDoneCommand?.(prefix + originalLines[0], file.path);
  if (!result) return null;

  const checkChars: string[] = [];
  const resultLines = result.split(/\n/g).map((line: string, index: number) => {
    if (recurrenceOnNextLine && index === 0) {
      which = index;
    } else if (!recurrenceOnNextLine && index > 0) {
      which = index;
    }

    const match = line.match(/^- \[([^\]]+)\]/);
    if (match?.[1]) checkChars.push(match[1]);

    return [line.replace(/^- \[[^\]]+\] */, ''), ...originalLines.slice(1)].join('\n');
  });

  return [resultLines, checkChars, which];
}
