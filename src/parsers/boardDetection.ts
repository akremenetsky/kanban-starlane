import { App, TFile } from 'obsidian';
import { FRONTMATTER_KEY } from 'src/constants';

export function hasFrontmatterKeyRaw(data: string) {
  if (!data) return false;

  const match = data.match(/---\s+([\w\W]+?)\s+---/);

  if (!match) {
    return false;
  }

  if (!match[1].contains(FRONTMATTER_KEY)) {
    return false;
  }

  return true;
}

export function hasFrontmatterKey(app: App, file: TFile) {
  if (!file) return false;
  const cache = app.metadataCache.getFileCache(file);
  return !!cache?.frontmatter?.[FRONTMATTER_KEY];
}
