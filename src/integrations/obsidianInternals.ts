/**
 * Types for the parts of Obsidian's internal (undocumented) API the plugin uses. They are
 * not in the public typings and may change with any Obsidian update, so every member is
 * typed as narrowly as its use here needs, and optional where older versions lack it.
 * Check these first when something breaks after an Obsidian update.
 */
import 'obsidian';

declare module 'obsidian' {
  interface App {
    /** Community plugins. */
    plugins: {
      enabledPlugins: Set<string>;
      plugins: Record<string, Plugin | undefined>;
    };
    /** Core plugins (Daily notes, Templates, Search, ...). */
    internalPlugins: {
      plugins: Record<string, InternalPlugin | undefined>;
      getPluginById(id: string): InternalPlugin | null;
    };
    commands: {
      executeCommand(command: Command, evt?: Event): boolean;
    };
    /** Embed factories by file extension; `md` builds the embedded markdown editor. */
    embedRegistry: {
      embedByExtension: {
        md(
          context: { app: App; containerEl: HTMLElement; state: object },
          file: TFile | null,
          subpath: string
        ): MarkdownEmbed;
      };
    };
    /** Drag in progress from Obsidian's own UI (file explorer, links). */
    dragManager: {
      draggable: { type?: string; file?: TFile; files?: TFile[]; linktext?: string } | null;
    };
    /** Mobile only. */
    mobileNavbar?: { containerEl: HTMLElement };
    /** Mobile only. */
    mobileToolbar?: { update(): void };
  }

  /** A core plugin: its enabled state and its instance (settings in `options`). */
  interface InternalPlugin {
    enabled: boolean;
    instance: {
      options?: Record<string, unknown>;
      openGlobalSearch?(query: string): void;
      insertTemplate?(file: TFile): Promise<void>;
      gotoNextExisting?(date: moment.Moment): void;
      gotoPreviousExisting?(date: moment.Moment): void;
    };
  }

  /** What `embedRegistry.embedByExtension.md` returns. */
  interface MarkdownEmbed {
    load(): void;
    unload(): void;
    showEditor(): void;
    editable: boolean;
    editMode: object;
  }

  interface Vault {
    getConfig(key: string): unknown;
    /** Raw vault config (Settings → Editor/Files & Links), read by the embedded editor. */
    config: Record<string, unknown>;
    getAvailablePathForAttachments(
      filename: string,
      extension: string,
      sourceFile: TFile | null
    ): Promise<string>;
  }

  interface FileManager {
    createNewMarkdownFile(folder: TFolder, filename: string, content?: string): Promise<TFile>;
  }

  interface Workspace {
    /** Floating (pop-out) windows. */
    floatingSplit?: { children: Array<{ win: Window }> };
    registerHoverLinkSource(id: string, info: HoverLinkSource): void;
    unregisterHoverLinkSource(id: string): void;
    handleExternalLinkContextMenu(menu: Menu, url: string): void;
    editorSuggest: { suggests: Array<EditorSuggest<unknown> & { settings?: unknown }> };
  }

  interface WorkspaceLeaf {
    id: string;
  }

  interface Menu {
    /** Orders the sections that items can be put in with `MenuItem.setSection`. */
    addSections(sections: string[]): this;
  }

  interface MenuItem {
    setSubmenu(): Menu;
  }

  interface Scope {
    keys: KeymapEventHandler[];
  }

  interface Component {
    _loaded: boolean;
  }

  interface MetadataCache {
    on(name: 'dataview:metadata-change', callback: (type: string, file: TFile) => void): EventRef;
    on(name: 'dataview:api-ready', callback: () => void): EventRef;
  }

  interface DataAdapter {
    /** Desktop only (FileSystemAdapter). */
    basePath?: string;
  }
}
