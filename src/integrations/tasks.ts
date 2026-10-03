/**
 * Integration with the Obsidian Tasks plugin (obsidian-tasks-plugin).
 * All access to Tasks internals goes through this module.
 */
import { App, Plugin, TFile } from 'obsidian';
import { Item } from 'src/model/types';

interface TasksPlugin extends Plugin {
  apiV1?: {
    executeToggleTaskDoneCommand?(line: string, path: string): string;
  };
}

interface TaskStatus {
  symbol: string;
  nextStatusSymbol: string;
  type: string;
}

interface TasksSettings {
  taskFormat?: unknown;
  recurrenceOnNextLine?: boolean;
  statusSettings?: { coreStatuses?: TaskStatus[]; customStatuses?: TaskStatus[] };
}

export function getTasksPlugin(app: App): TasksPlugin | null {
  if (!app.plugins.enabledPlugins.has('obsidian-tasks-plugin')) {
    return null;
  }

  return app.plugins.plugins['obsidian-tasks-plugin'] ?? null;
}

// Tasks exposes no settings API; its editor suggest holds a reference to them.
function getTasksPluginSettings(app: App): TasksSettings | undefined {
  const suggest = app.workspace.editorSuggest.suggests.find(
    (s) => (s.settings as TasksSettings | undefined)?.taskFormat
  );
  return suggest?.settings;
}

function findStatus(settings: TasksSettings | undefined, test: (s: TaskStatus) => boolean) {
  const statuses = settings?.statusSettings;
  return statuses?.coreStatuses?.find(test) ?? statuses?.customStatuses?.find(test);
}

export function getTaskStatusDone(app: App): string {
  const settings = getTasksPluginSettings(app);
  if (!settings?.statusSettings) return 'x';
  return findStatus(settings, (s) => s.type === 'DONE')?.symbol ?? 'x';
}

export function getTaskStatusPreDone(app: App): string {
  const settings = getTasksPluginSettings(app);
  if (!settings?.statusSettings) return ' ';

  const done = getTaskStatusDone(app);
  return findStatus(settings, (s) => s.nextStatusSymbol === done)?.symbol ?? ' ';
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
  const resultLines = result.split(/\n/g).map((line, index) => {
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
