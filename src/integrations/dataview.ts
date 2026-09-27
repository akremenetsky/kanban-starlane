/**
 * Integration with the Dataview plugin. All access to Dataview internals goes through this module.
 */
import { App, TFile } from 'obsidian';
import type { DataviewApi } from 'obsidian-dataview';

export function getDataviewPlugin(app: App) {
  if (!(app as any).plugins.enabledPlugins.has('dataview')) {
    return null;
  }

  return (app as any).plugins.plugins['dataview'];
}

/**
 * The Dataview API, or undefined when Dataview is not installed/enabled.
 * Replaces `getAPI()` from the obsidian-dataview npm package, which reads the global `app`
 * and bundles a copy of Luxon.
 */
export function getDataviewApi(app: App): DataviewApi | undefined {
  return (app as any).plugins?.plugins?.dataview?.api;
}

export function getDataViewCache(app: App, linkedFile: TFile, sourceFile: TFile) {
  if (
    (app as any).plugins.enabledPlugins.has('dataview') &&
    (app as any).plugins?.plugins?.dataview?.api
  ) {
    return (app as any).plugins.plugins.dataview.api.page(linkedFile.path, sourceFile.path);
  }
}
