/**
 * Integration with the Dataview plugin. All access to Dataview internals goes through this module.
 */
import { App, Plugin, TFile } from 'obsidian';

/**
 * The parts of the Dataview API used here. The obsidian-dataview npm typings import their own
 * modules by bare paths ("api/plugin-api"), which do not resolve in other projects.
 */
export interface DataviewApi {
  page(path: string, originFile?: string): Record<string, unknown> | undefined;
  /** Parses a field value the way Dataview does (dates, durations, links, ...). */
  parse(value: unknown): unknown;
  value: {
    isDate(value: unknown): value is { ts: number };
    isObject(value: unknown): boolean;
    toString(value: unknown): string;
  };
}

interface DataviewPlugin extends Plugin {
  api?: DataviewApi;
}

export function getDataviewPlugin(app: App): DataviewPlugin | null {
  if (!app.plugins.enabledPlugins.has('dataview')) {
    return null;
  }

  return app.plugins.plugins['dataview'] ?? null;
}

/**
 * The Dataview API, or undefined when Dataview is not installed/enabled.
 * Replaces `getAPI()` from the obsidian-dataview npm package, which reads the global `app`
 * and bundles a copy of Luxon.
 */
export function getDataviewApi(app: App): DataviewApi | undefined {
  const plugin: DataviewPlugin | undefined = app.plugins?.plugins?.['dataview'];
  return plugin?.api;
}

export function getDataViewCache(app: App, linkedFile: TFile, sourceFile: TFile) {
  return getDataviewPlugin(app)?.api?.page(linkedFile.path, sourceFile.path);
}
