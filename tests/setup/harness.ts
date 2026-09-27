/**
 * Test harness: build a real StateManager + parser against a fake Obsidian App.
 *
 *   const { board, toMarkdown } = await loadBoard(md);
 *
 * Use this for anything that goes markdown -> Board -> markdown.
 */
import { TFile } from 'obsidian';
import type { Board } from 'src/model/types';
import type { KanbanSettings } from 'src/settings/types';
import { StateManager } from 'src/state/StateManager';

/** The fake TFile (tests/setup/obsidian.ts) takes a path; the real typings do not. */
export const makeFile = (path: string): TFile => new (TFile as any)(path);

export interface FakeAppOptions {
  /** Files that exist in the vault, by path. Links resolve by basename or path. */
  files?: Record<string, { frontmatter?: Record<string, unknown>; tags?: string[] }>;
  /** Vault config values (Settings → Editor), e.g. { useTab: true }. */
  vaultConfig?: Record<string, unknown>;
  /** Community plugins to report as enabled, e.g. { dataview: {...} }. */
  plugins?: Record<string, unknown>;
  /** File contents for vault.read/modify, by path. Writes land here too. */
  contents?: Record<string, string>;
}

export function createFakeApp(opts: FakeAppOptions = {}) {
  const files = new Map<string, TFile>();
  for (const path of Object.keys(opts.files ?? {})) files.set(path, makeFile(path));

  const resolve = (linkpath: string) => {
    if (files.has(linkpath)) return files.get(linkpath);
    if (files.has(linkpath + '.md')) return files.get(linkpath + '.md');
    for (const f of files.values()) if (f.basename === linkpath) return f;
    return null;
  };

  const plugins = opts.plugins ?? {};
  const contents = new Map(Object.entries(opts.contents ?? {}));
  for (const path of contents.keys()) if (!files.has(path)) files.set(path, makeFile(path));

  return {
    vault: {
      getConfig: (key: string) => opts.vaultConfig?.[key],
      getAbstractFileByPath: (path: string) => files.get(path) ?? null,
      contents,
      writes: [] as Array<{ path: string; data: string }>,
      async read(file: TFile) {
        return contents.get(file.path) ?? '';
      },
      getMarkdownFiles: () => Array.from(files.values()).filter((f) => f.extension === 'md'),
      async cachedRead(file: TFile) {
        return contents.get(file.path) ?? '';
      },
      async modify(file: TFile, data: string) {
        contents.set(file.path, data);
        this.writes.push({ path: file.path, data });
      },
      async process(file: TFile, fn: (data: string) => string) {
        const current = contents.get(file.path) ?? '';
        const data = fn(current);
        if (data !== current) await this.modify(file, data);
        return data;
      },
    },
    metadataCache: {
      getFirstLinkpathDest: (linkpath: string) => resolve(linkpath),
      getFileCache: (file: TFile): any => {
        const meta = opts.files?.[file.path];
        if (!meta) return null;
        return {
          frontmatter: meta.frontmatter,
          tags: meta.tags?.map((tag) => ({ tag })),
        };
      },
      getCache: (): any => null,
    },
    plugins: {
      enabledPlugins: new Set(Object.keys(plugins)),
      plugins,
    },
    internalPlugins: { plugins: {} },
    workspace: { editorSuggest: { suggests: [] } },
    fileManager: {},
  } as any;
}

export class FakeView {
  data: string;
  file: TFile;
  viewSettings: Record<string, unknown> = {};

  constructor(file: TFile, data: string) {
    this.file = file;
    this.data = data;
  }

  async prerender() {}
  initHeaderButtons() {}
  validatePreviewCache() {}
  populateViewState() {}
  requestSaveToDisk(data: string) {
    this.data = data;
  }
}

export interface LoadBoardOptions extends FakeAppOptions {
  path?: string;
  globalSettings?: KanbanSettings;
}

export async function loadBoard(md: string, opts: LoadBoardOptions = {}) {
  const app = createFakeApp(opts);
  const file = makeFile(opts.path ?? 'Board.md');
  const view = new FakeView(file, md);
  const globalSettings = opts.globalSettings ?? {};

  const stateManager = new StateManager(
    app,
    file,
    () => {},
    () => globalSettings
  );

  await stateManager.registerView(view as any, md, true);

  return {
    app,
    view,
    stateManager,
    get board(): Board {
      return stateManager.state;
    },
    toMarkdown: () => stateManager.parser.boardToMd(stateManager.state),
  };
}

export async function waitFor(cond: () => boolean, timeoutMs = 2000) {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor: timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
}

/** Compact, id-free view of a board for readable assertions and snapshots. */
export function summarize(board: Board) {
  return {
    lanes: board.children.map((lane) => ({
      title: lane.data.title,
      maxItems: lane.data.maxItems,
      complete: lane.data.shouldMarkItemsComplete,
      items: lane.children.map((item) => item.data.titleRaw),
    })),
    archive: board.data.archive.map((item) => item.data.titleRaw),
    settings: board.data.settings,
    errors: board.data.errors.map((e) => e.description),
  };
}
