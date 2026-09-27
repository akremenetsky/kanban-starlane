import { App } from 'obsidian';

/**
 * Read an Obsidian vault config value (Settings → Editor/Files & Links).
 * `vault.getConfig` is not part of the public API typings.
 */
export function getVaultConfig<T = unknown>(app: App, key: string): T {
  return (app.vault as any).getConfig(key);
}

export function shouldUseTabs(app: App): boolean {
  return !!getVaultConfig<boolean>(app, 'useTab');
}
