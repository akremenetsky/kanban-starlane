import update from 'immutability-helper';
import { App, Notice, TFile, moment } from 'obsidian';
import { useEffect, useState } from 'preact/compat';
import { FRONTMATTER_KEY } from 'src/constants';
import { getDefaultDateFormat, getDefaultTimeFormat } from 'src/integrations/dateFormats';
import { getTaskStatusDone } from 'src/integrations/tasks';
import { t } from 'src/lang/helpers';
import { Board, BoardTemplate, Item } from 'src/model/types';
import { BaseFormat, ListFormat } from 'src/parsers/ListFormat';
import { KanbanSettings, SettingRetrievers, shouldRefreshBoard } from 'src/settings/types';
import { toError } from 'src/shared/util';
import { KanbanView } from 'src/view/KanbanView';

import { recordCardHistory } from './cardHistory';
import { compileSettings } from './compileSettings';

export class StateManager {
  onEmpty: () => void;
  getGlobalSettings: () => KanbanSettings;

  stateReceivers: Array<(state: Board) => void> = [];
  settingsNotifiers: Map<keyof KanbanSettings, Array<() => void>> = new Map();

  viewSet: Set<KanbanView> = new Set();
  compiledSettings: KanbanSettings = {};

  app: App;
  state: Board;
  file: TFile;

  parser: BaseFormat;

  /** Last markdown known to be on disk (or handed to a view to save). */
  data: string;
  /** Users that need the board while no view has it open (e.g. linked lanes of other boards). */
  backgroundUsers = 0;
  /** Set by the plugin: other boards may show this lane (linked lanes). */
  onLaneRenamed?: (from: string, to: string) => void;
  /** Settles once the board has a state, whether a view or a background load parsed it. */
  ready: Promise<void>;
  private resolveReady: () => void;
  /** Our background writes whose `modify` event has not come back yet. */
  private pendingWrites = new Set<string>();

  constructor(app: App, file: TFile, onEmpty: () => void, getGlobalSettings: () => KanbanSettings) {
    this.app = app;
    this.file = file;
    this.onEmpty = onEmpty;
    this.getGlobalSettings = getGlobalSettings;
    this.parser = new ListFormat(this);
    this.ready = new Promise((resolve) => (this.resolveReady = resolve));
  }

  getAView(): KanbanView {
    return this.viewSet.values().next().value as KanbanView;
  }

  hasError(): boolean {
    return !!this.state?.data?.errors?.length;
  }

  async registerView(view: KanbanView, data: string, shouldParseData: boolean) {
    // A board kept in the background may be older than what the view just read from disk.
    const isFirstView = this.viewSet.size === 0;

    if (!this.viewSet.has(view)) {
      this.viewSet.add(view);
    }

    // This helps delay blocking the UI until the the loading indicator is displayed
    await new Promise((res) => window.setTimeout(res, 10));

    if (shouldParseData || isFirstView || !this.state) {
      await this.newBoard(view, data);
    } else {
      await view.prerender(this.state);
    }

    view.populateViewState(this.state.data.settings);
  }

  unregisterView(view: KanbanView) {
    if (this.viewSet.has(view)) {
      this.viewSet.delete(view);
      this.disposeIfUnused();
    }
  }

  /** Keep the board loaded while no view shows it. Pair with `release()`. */
  retain() {
    this.backgroundUsers++;
  }

  release() {
    if (this.backgroundUsers > 0) {
      this.backgroundUsers--;
      this.disposeIfUnused();
    }
  }

  private disposeIfUnused() {
    if (this.viewSet.size === 0 && this.backgroundUsers === 0) {
      this.onEmpty();
    }
  }

  /** Load the board straight from the vault (no view involved). */
  async loadFromDisk() {
    let md: string;
    try {
      md = await this.app.vault.read(this.file);
    } catch (e) {
      if (!this.state) {
        const board = this.getParsedBoard('');
        this.setState(
          update(board, {
            data: { errors: { $push: [{ description: String(e), stack: toError(e).stack }] } },
          }),
          false
        );
      }
      return;
    }
    // A view may have opened (and parsed) the file while we were reading it.
    if (this.viewSet.size > 0 && this.state) return;
    this.data = md;
    this.setState(this.getParsedBoard(md), false);
  }

  /** The file changed on disk while no view has it open. Views get changes from Obsidian. */
  async applyExternalChange(md: string) {
    if (this.pendingWrites.delete(md)) return;
    if (this.viewSet.size > 0 || md === this.data) return;
    this.data = md;
    this.setState(this.getParsedBoard(md), false);
  }

  /**
   * Save without a view. The file is only replaced if it still holds what we last read or
   * wrote; otherwise the change on disk wins and our edit is dropped (with a notice).
   */
  private writeInBackground(fileStr: string) {
    const expected = this.data;
    let conflict: string | null = null;

    this.data = fileStr;
    this.pendingWrites.add(fileStr);

    this.app.vault
      .process(this.file, (current) => {
        if (current === expected || this.pendingWrites.has(current)) return fileStr;
        conflict = current;
        return current;
      })
      .then(() => {
        if (conflict === null) return;
        this.pendingWrites.delete(fileStr);
        new Notice(
          `${this.file.basename}: ${t('The board changed on disk, so the last change to it was not saved.')}`
        );
        this.data = conflict;
        this.setState(this.getParsedBoard(conflict), false);
      })
      .catch((e) => {
        this.pendingWrites.delete(fileStr);
        this.setError(e);
      });
  }

  buildSettingRetrievers(): SettingRetrievers {
    return {
      getGlobalSettings: this.getGlobalSettings,
      getGlobalSetting: this.getGlobalSetting,
      getSetting: this.getSetting,
    };
  }

  async newBoard(view: KanbanView, md: string) {
    this.data = md;
    try {
      const board = this.getParsedBoard(md);
      await view.prerender(board);
      this.setState(board, false);
    } catch (e) {
      this.setError(e);
    }
  }

  saveToDisk() {
    if (this.state.data.errors.length > 0) {
      return;
    }

    const view = this.getAView();
    const fileStr = this.parser.boardToMd(this.state);

    if (view) {
      this.data = fileStr;
      view.requestSaveToDisk(fileStr);

      this.viewSet.forEach((view) => {
        view.data = fileStr;
      });
    } else if (this.backgroundUsers > 0 && fileStr !== this.data) {
      this.writeInBackground(fileStr);
    }
  }

  softRefresh() {
    this.stateReceivers.forEach((receiver) => receiver({ ...this.state }));
  }

  forceRefresh() {
    if (this.state) {
      try {
        this.compileSettings();
        this.state = this.parser.reparseBoard();

        this.stateReceivers.forEach((receiver) => receiver(this.state));
        this.settingsNotifiers.forEach((notifiers) => {
          notifiers.forEach((fn) => fn());
        });
        this.viewSet.forEach((view) => view.initHeaderButtons());
      } catch (e) {
        console.error(e);
        this.setError(e);
      }
    }
  }

  setState(state: Board | ((board: Board) => Board), shouldSave: boolean = true) {
    try {
      const oldSettings = this.state?.data.settings;
      let newState = typeof state === 'function' ? state(this.state) : state;

      // Only changes made in the plugin are recorded; re-parses of the file pass shouldSave=false.
      if (shouldSave && this.state && newState && newState !== this.state && !this.hasError()) {
        if (this.getSetting('card-history') !== false) {
          newState = recordCardHistory(this.state, newState);
        }
      }
      const newSettings = newState?.data.settings;

      if (oldSettings && newSettings && shouldRefreshBoard(oldSettings, newSettings)) {
        this.state = update(this.state, {
          data: {
            settings: {
              $set: newSettings,
            },
          },
        });
        this.compileSettings();
        this.state = this.parser.reparseBoard();
      } else {
        this.state = newState;
        this.compileSettings();
      }

      if (this.state) this.resolveReady();

      this.viewSet.forEach((view) => {
        view.initHeaderButtons();
        view.validatePreviewCache(newState);
      });

      if (shouldSave) {
        this.saveToDisk();
      }

      this.stateReceivers.forEach((receiver) => receiver(this.state));

      if (oldSettings !== newSettings && newSettings) {
        this.settingsNotifiers.forEach((notifiers, key) => {
          if ((!oldSettings && newSettings) || oldSettings[key] !== newSettings[key]) {
            notifiers.forEach((fn) => fn());
          }
        });
      }
    } catch (e) {
      console.error(e);
      this.setError(e);
    }
  }

  useState(): Board {
    const [state, setState] = useState(this.state);

    useEffect(() => {
      this.stateReceivers.push((state) => setState(state));
      setState(this.state);
      return () => {
        this.stateReceivers.remove(setState);
      };
    }, []);

    return state;
  }

  useSetting<K extends keyof KanbanSettings>(key: K): KanbanSettings[K] {
    const [state, setState] = useState<KanbanSettings[K]>(this.getSetting(key));

    useEffect(() => {
      const receiver = () => setState(this.getSetting(key));

      if (this.settingsNotifiers.has(key)) {
        this.settingsNotifiers.get(key).push(receiver);
      } else {
        this.settingsNotifiers.set(key, [receiver]);
      }

      // The board may have been parsed between the first render and this effect.
      receiver();

      return () => {
        this.settingsNotifiers.get(key).remove(receiver);
      };
    }, []);

    return state;
  }

  /** Recompute effective settings; `suppliedSettings` override the board's own (used while parsing). */
  compileSettings(suppliedSettings?: KanbanSettings) {
    this.compiledSettings = compileSettings(
      [suppliedSettings, this.state?.data?.settings],
      this.getGlobalSettings(),
      {
        dateFormat: getDefaultDateFormat(this.app),
        timeFormat: getDefaultTimeFormat(this.app),
      }
    );
  }

  getSetting = <K extends keyof KanbanSettings>(
    key: K,
    suppliedLocalSettings?: KanbanSettings
  ): KanbanSettings[K] => {
    if (suppliedLocalSettings?.[key] !== undefined) {
      return suppliedLocalSettings[key];
    }

    if (this.compiledSettings?.[key] !== undefined) {
      return this.compiledSettings[key];
    }

    return this.getSettingRaw(key);
  };

  getSettingRaw = <K extends keyof KanbanSettings>(
    key: K,
    suppliedLocalSettings?: KanbanSettings
  ): KanbanSettings[K] => {
    if (suppliedLocalSettings?.[key] !== undefined) {
      return suppliedLocalSettings[key];
    }

    if (this.state?.data?.settings?.[key] !== undefined) {
      return this.state.data.settings[key];
    }

    return this.getGlobalSetting(key);
  };

  getGlobalSetting = <K extends keyof KanbanSettings>(key: K): KanbanSettings[K] => {
    const globalSettings = this.getGlobalSettings();

    if (globalSettings?.[key] !== undefined) {
      return globalSettings[key];
    }

    return null;
  };

  getParsedBoard(data: string) {
    const trimmedContent = data.trim();

    let board: Board = {
      ...BoardTemplate,
      id: this.file.path,
      children: [],
      data: {
        archive: [],
        settings: { [FRONTMATTER_KEY]: 'board' },
        frontmatter: {},
        isSearching: false,
        errors: [],
      },
    };

    try {
      if (trimmedContent) {
        board = this.parser.mdToBoard(trimmedContent);
      }
    } catch (e) {
      console.error(e);

      board = update(board, {
        data: {
          errors: {
            $push: [{ description: String(e), stack: toError(e).stack }],
          },
        },
      });
    }

    return board;
  }

  /** Shows an error in place of the board; takes whatever was thrown. */
  setError(thrown: unknown) {
    const e = toError(thrown);
    this.setState(
      update(this.state, {
        data: {
          errors: {
            $push: [{ description: String(e), stack: toError(e).stack }],
          },
        },
      }),
      false
    );
  }

  onFileMetadataChange() {
    void this.reparseBoardFromMd();
  }

  async reparseBoardFromMd() {
    try {
      this.setState(this.getParsedBoard(this.getAView()?.data ?? this.data), false);
    } catch (e) {
      console.error(e);
      this.setError(e);
    }
  }

  async archiveCompletedCards() {
    const board = this.state;

    const archived: Item[] = [];
    const shouldAppendArchiveDate = !!this.getSetting('archive-with-date');
    const archiveDateSeparator = this.getSetting('archive-date-separator');
    const archiveDateFormat = this.getSetting('archive-date-format');
    const archiveDateAfterTitle = this.getSetting('append-archive-date');

    const appendArchiveDate = (item: Item) => {
      const newTitle = [moment().format(archiveDateFormat)];

      if (archiveDateSeparator) newTitle.push(archiveDateSeparator);

      newTitle.push(item.data.titleRaw);

      if (archiveDateAfterTitle) newTitle.reverse();

      const titleRaw = newTitle.join(' ');

      return this.parser.updateItemContent(item, titleRaw);
    };

    const lanes = board.children.map((lane) => {
      return update(lane, {
        children: {
          $set: lane.children.filter((item) => {
            const isComplete =
              item.data.checked && item.data.checkChar === getTaskStatusDone(this.app);
            if (lane.data.shouldMarkItemsComplete || isComplete) {
              archived.push(item);
            }

            return !isComplete && !lane.data.shouldMarkItemsComplete;
          }),
        },
      });
    });

    try {
      this.setState(
        update(board, {
          children: {
            $set: lanes,
          },
          data: {
            archive: {
              $push: shouldAppendArchiveDate
                ? archived.map((item) => appendArchiveDate(item))
                : archived,
            },
          },
        })
      );
    } catch (e) {
      this.setError(e);
    }
  }

  getNewItem(content: string, checkChar: string, forceEdit?: boolean) {
    return this.parser.newItem(content, checkChar, forceEdit);
  }

  updateItemContent(item: Item, content: string) {
    return this.parser.updateItemContent(item, content);
  }
}
