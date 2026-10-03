import EventEmitter from 'eventemitter3';
import update from 'immutability-helper';
import {
  HoverParent,
  HoverPopover,
  Menu,
  Platform,
  TFile,
  TextFileView,
  ViewStateResult,
  WorkspaceLeaf,
  debounce,
} from 'obsidian';
import { Kanban } from 'src/components/Kanban';
import { BasicMarkdownRenderer } from 'src/components/MarkdownRenderer/MarkdownRenderer';
import { c } from 'src/components/helpers';
import { FRONTMATTER_KEY, VIEW_ICON, VIEW_TYPE } from 'src/constants';
import { getParentWindow } from 'src/dnd/util/getWindow';
import { gotoNextDailyNote, gotoPrevDailyNote } from 'src/integrations/dailyNotes';
import { t } from 'src/lang/helpers';
import { Board } from 'src/model/types';
import { hasFrontmatterKeyRaw } from 'src/parsers/boardDetection';
import KanbanPlugin from 'src/plugin/KanbanPlugin';
import { SettingsModal } from 'src/settings/SettingsModal';
import { KanbanFormat, KanbanSettings, KanbanViewSettings } from 'src/settings/types';
import { PromiseQueue } from 'src/shared/util';

import { bindMarkdownEvents } from './markdownEvents';

interface HeaderButton {
  setting: keyof KanbanSettings;
  icon: string;
  label: string;
  onClick: (evt: MouseEvent) => void;
  className?: string;
}

export class KanbanView extends TextFileView implements HoverParent {
  plugin: KanbanPlugin;
  hoverPopover: HoverPopover | null;
  emitter: EventEmitter;
  actionButtons: Record<string, HTMLElement> = {};

  previewCache: Map<string, BasicMarkdownRenderer>;
  previewQueue: PromiseQueue;

  activeEditor: any;
  viewSettings: KanbanViewSettings = {};
  /** Boards whose cards this view shows in linked lanes (their previews live in our cache). */
  linkedBoards: Board[] = [];

  get isPrimary(): boolean {
    return this.plugin.getStateManager(this.file)?.getAView() === this;
  }

  get id(): string {
    return `${(this.leaf as any).id}:::${this.file?.path}`;
  }

  get isShiftPressed(): boolean {
    return this.plugin.isShiftPressed;
  }

  constructor(leaf: WorkspaceLeaf, plugin: KanbanPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.emitter = new EventEmitter();
    this.previewCache = new Map();

    this.previewQueue = new PromiseQueue(() => this.emitter.emit('queueEmpty'));

    this.emitter.on('hotkey', ({ commandId }) => {
      switch (commandId) {
        case 'daily-notes:goto-prev': {
          gotoPrevDailyNote(this.app, this.file);
          break;
        }
        case 'daily-notes:goto-next': {
          gotoNextDailyNote(this.app, this.file);
          break;
        }
      }
    });

    bindMarkdownEvents(this);
  }

  async prerender(board: Board) {
    board.children.forEach((lane) => {
      lane.children.forEach((item) => {
        if (this.previewCache.has(item.id)) return;

        this.previewQueue.add(async () => {
          const preview = this.addChild(new BasicMarkdownRenderer(this, item.data.title));
          this.previewCache.set(item.id, preview);
          await preview.renderCapability.promise;
        });
      });
    });

    if (this.previewQueue.isRunning) {
      await new Promise((res) => {
        this.emitter.once('queueEmpty', res);
      });
    }

    this.initHeaderButtons();
  }

  validatePreviewCache(board: Board) {
    const seenKeys = new Set<string>();
    [board, ...this.linkedBoards].forEach((b) => {
      b.children.forEach((lane) => {
        seenKeys.add(lane.id);
        lane.children.forEach((item) => {
          seenKeys.add(item.id);
        });
      });
    });

    for (const k of this.previewCache.keys()) {
      if (!seenKeys.has(k)) {
        this.removeChild(this.previewCache.get(k));
        this.previewCache.delete(k);
      }
    }
  }

  setView(view: KanbanFormat) {
    this.setViewState(FRONTMATTER_KEY, view);
    this.app.fileManager.processFrontMatter(this.file, (frontmatter) => {
      frontmatter[FRONTMATTER_KEY] = view;
    });
  }

  setBoard(board: Board, shouldSave: boolean = true) {
    const stateManager = this.plugin.stateManagers.get(this.file);
    stateManager.setState(board, shouldSave);
  }

  getBoard(): Board {
    const stateManager = this.plugin.stateManagers.get(this.file);
    return stateManager.state;
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getIcon() {
    return VIEW_ICON;
  }

  getDisplayText() {
    return this.file?.basename || 'Kanban';
  }

  getWindow() {
    return getParentWindow(this.containerEl) as Window & typeof window;
  }

  async loadFile(file: TFile) {
    this.plugin.removeView(this);
    // @ts-ignore -- overrides an Obsidian method the public typings do not cover
    return super.loadFile(file);
  }

  async onLoadFile(file: TFile) {
    try {
      return await super.onLoadFile(file);
    } catch (e) {
      const stateManager = this.plugin.stateManagers.get(this.file);
      stateManager?.setError(e);
      throw e;
    }
  }

  onload() {
    super.onload();
    if (Platform.isMobile) {
      this.containerEl.setCssProps({
        '--mobile-navbar-height': (this.app as any).mobileNavbar.containerEl.clientHeight + 'px',
      });
    }

    this.register(
      this.containerEl.onWindowMigrated(() => {
        this.plugin.removeView(this);
        this.plugin.addView(this, this.data, this.isPrimary);
      })
    );
  }

  onunload(): void {
    super.onunload();

    this.previewQueue.clear();
    this.previewCache.clear();
    this.emitter.emit('queueEmpty');

    // Remove draggables from render, as the DOM has already detached
    this.plugin.removeView(this);
    this.emitter.removeAllListeners();
    this.activeEditor = null;
    this.actionButtons = {};
  }

  handleRename(newPath: string, oldPath: string) {
    if (this.file.path === newPath) {
      this.plugin.handleViewFileRename(this, oldPath);
    }
  }

  requestSaveToDisk(data: string) {
    if (this.data !== data && this.isPrimary) {
      this.data = data;
      this.requestSave();
    } else {
      this.data = data;
    }
  }

  getViewData() {
    // In theory, we could unparse the board here.  In practice, the board can be
    // in an error state, so we return the last good data here.  (In addition,
    // unparsing is slow, and getViewData() can be called more often than the
    // data actually changes.)
    return this.data;
  }

  setViewData(data: string, clear?: boolean) {
    if (!hasFrontmatterKeyRaw(data)) {
      this.plugin.kanbanFileModes[(this.leaf as any).id || this.file.path] = 'markdown';
      this.plugin.removeView(this);
      this.plugin.setMarkdownView(this.leaf, false);

      return;
    }

    if (clear) {
      this.activeEditor = null;
      this.previewQueue.clear();
      this.previewCache.clear();
      this.emitter.emit('queueEmpty');
      Object.values(this.actionButtons).forEach((b) => b.remove());
      this.actionButtons = {};
    }

    this.plugin.addView(this, data, !clear && this.isPrimary);
  }

  async setState(state: any, result: ViewStateResult): Promise<void> {
    this.viewSettings = { ...state.kanbanViewState };
    await super.setState(state, result);
  }

  getState() {
    const state = super.getState();
    state.kanbanViewState = { ...this.viewSettings };
    return state;
  }

  setViewState<K extends keyof KanbanViewSettings>(
    key: K,
    val?: KanbanViewSettings[K],
    globalUpdater?: (old: KanbanViewSettings[K]) => KanbanViewSettings[K]
  ) {
    if (globalUpdater) {
      const stateManager = this.plugin.getStateManager(this.file);
      stateManager.viewSet.forEach((view) => {
        view.viewSettings[key] = globalUpdater(view.viewSettings[key]);
      });
    } else if (val) {
      this.viewSettings[key] = val;
    }

    this.app.workspace.requestSaveLayout();
  }

  populateViewState(settings: KanbanSettings) {
    this.viewSettings[FRONTMATTER_KEY] ??= settings[FRONTMATTER_KEY] || 'board';
    this.viewSettings['list-collapse'] ??= settings['list-collapse'] || [];
  }

  getViewState<K extends keyof KanbanViewSettings>(key: K) {
    const stateManager = this.plugin.stateManagers.get(this.file);
    const settingVal = stateManager.getSetting(key);
    return this.viewSettings[key] ?? settingVal;
  }

  useViewState<K extends keyof KanbanViewSettings>(key: K) {
    const stateManager = this.plugin.stateManagers.get(this.file);
    const settingVal = stateManager.useSetting(key);
    return this.viewSettings[key] ?? settingVal;
  }

  getPortal() {
    const stateManager = this.plugin.stateManagers.get(this.file);
    return <Kanban stateManager={stateManager} view={this} />;
  }

  getBoardSettings() {
    const stateManager = this.plugin.stateManagers.get(this.file);
    const board = stateManager.state;

    new SettingsModal(
      this,
      {
        onSettingsChange: (settings) => {
          const updatedBoard = update(board, {
            data: {
              settings: {
                $set: settings,
              },
            },
          });

          // Save to disk, compute text of new board
          stateManager.setState(updatedBoard);
        },
      },
      board.data.settings
    ).open();
  }

  onPaneMenu(menu: Menu, source: string, callSuper: boolean = true) {
    if (source !== 'more-options') {
      super.onPaneMenu(menu, source);
      return;
    }
    // Add a menu item to force the board to markdown view
    menu
      .addItem((item) => {
        item
          .setTitle(t('Open as markdown'))
          .setIcon('lucide-file-text')
          .setSection('pane')
          .onClick(() => {
            this.plugin.kanbanFileModes[(this.leaf as any).id || this.file.path] = 'markdown';
            this.plugin.setMarkdownView(this.leaf);
          });
      })
      .addItem((item) => {
        item
          .setTitle(t('Open board settings'))
          .setIcon('lucide-settings')
          .setSection('pane')
          .onClick(() => {
            this.getBoardSettings();
          });
      })
      .addItem((item) => {
        item
          .setTitle(t('Archive completed cards'))
          .setIcon('lucide-archive')
          .setSection('pane')
          .onClick(() => {
            const stateManager = this.plugin.stateManagers.get(this.file);
            stateManager.archiveCompletedCards();
          });
      });

    if (callSuper) {
      super.onPaneMenu(menu, source);
    }
  }

  initHeaderButtons = debounce(() => this._initHeaderButtons(), 10, true);

  /** Header buttons, each shown when its `show-*` setting is on. Order = display order. */
  headerButtons(): HeaderButton[] {
    return [
      {
        setting: 'show-board-settings',
        icon: 'lucide-settings',
        label: t('Open board settings'),
        onClick: () => this.getBoardSettings(),
      },
      {
        setting: 'show-set-view',
        icon: 'lucide-view',
        label: t('Board view'),
        onClick: (evt) => this.showViewMenu(evt),
      },
      {
        setting: 'show-search',
        icon: 'lucide-search',
        label: t('Search...'),
        onClick: () => this.emitter.emit('hotkey', { commandId: 'editor:open-search' }),
      },
      {
        setting: 'show-view-as-markdown',
        icon: 'lucide-file-text',
        label: t('Open as markdown'),
        onClick: () => {
          this.plugin.kanbanFileModes[(this.leaf as any).id || this.file.path] = 'markdown';
          this.plugin.setMarkdownView(this.leaf);
        },
      },
      {
        setting: 'show-archive-all',
        icon: 'lucide-archive',
        label: t('Archive completed cards'),
        onClick: () => this.plugin.stateManagers.get(this.file).archiveCompletedCards(),
      },
      {
        setting: 'show-add-list',
        icon: 'lucide-plus-circle',
        label: t('Add a list'),
        onClick: () => this.emitter.emit('showLaneForm', undefined),
        className: c('ignore-click-outside'),
      },
    ];
  }

  showViewMenu(evt: MouseEvent) {
    const stateManager = this.plugin.getStateManager(this.file);
    const view = this.viewSettings[FRONTMATTER_KEY] || stateManager.getSetting(FRONTMATTER_KEY);

    new Menu()
      .addItem((item) =>
        item
          .setTitle(t('View as board'))
          .setIcon(VIEW_ICON)
          .setChecked(view === 'basic' || view === 'board')
          .onClick(() => this.setView('board'))
      )
      .addItem((item) =>
        item
          .setTitle(t('View as table'))
          .setIcon('lucide-table')
          .setChecked(view === 'table')
          .onClick(() => this.setView('table'))
      )
      .addItem((item) =>
        item
          .setTitle(t('View as list'))
          .setIcon('lucide-server')
          .setChecked(view === 'list')
          .onClick(() => this.setView('list'))
      )
      .showAtMouseEvent(evt);
  }

  _initHeaderButtons = async () => {
    if (Platform.isPhone) return;
    const stateManager = this.plugin.getStateManager(this.file);

    if (!stateManager) return;

    for (const button of this.headerButtons()) {
      const shown = !!stateManager.getSetting(button.setting);
      const existing = this.actionButtons[button.setting];

      if (shown && !existing) {
        const el = this.addAction(button.icon, button.label, button.onClick);
        if (button.className) el.addClass(button.className);
        this.actionButtons[button.setting] = el;
      } else if (!shown && existing) {
        existing.remove();
        delete this.actionButtons[button.setting];
      }
    }
  };

  clear() {
    /*
      Obsidian *only* calls this after unloading a file, before loading the next.
      Specifically, from onUnloadFile, which calls save(true), and then optionally
      calls clear, if and only if this.file is still non-empty.  That means that
      in this function, this.file is still the *old* file, so we should not do
      anything here that might try to use the file (including its path), so we
      should avoid doing anything that refreshes the display.  (Since that could
      use the file, and would also flash an empty pane during navigation, depending
      on how long the next file load takes.)

      Given all that, it makes more sense to clean up our state from onLoadFile, as
      following a clear there are only two possible states: a successful onLoadFile
      updates our full state via setViewData(), or else it aborts with an error
      first.  So as long as setViewData() and the error handler for onLoadFile()
      fully reset the state (to a valid load state or a valid error state),
      there's nothing to do in this method.  (We can't omit it, since it's
      abstract.)
    */
  }
}
