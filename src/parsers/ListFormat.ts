import { isPlainObject } from 'is-plain-object';
import { TFile } from 'obsidian';
import { getDataviewApi } from 'src/integrations/dataview';
import { shouldUseTabs } from 'src/integrations/vaultConfig';
import { Board, Item } from 'src/model/types';
import { diff, diffApply } from 'src/shared/patch';
import { StateManager } from 'src/state/StateManager';

import { boardToMd } from './boardToMarkdown';
import { extractHistory } from './history';
import { hydrateBoard, hydratePostOp } from './hydrate';
import { astToUnhydratedBoard, newItem, reparseBoard, updateItemContent } from './markdownToBoard';
import { parseMarkdown } from './parseMarkdown';

const generatedKeys: Array<string | number> = [
  'id',
  'date',
  'time',
  'titleSearch',
  'titleSearchRaw',
  'file',
];

export class ListFormat implements BaseFormat {
  stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  newItem(content: string, checkChar: string, forceEdit?: boolean) {
    return newItem(this.stateManager, content, checkChar, forceEdit);
  }

  updateItemContent(item: Item, content: string) {
    return updateItemContent(this.stateManager, item, content);
  }

  boardToMd(board: Board) {
    return boardToMd(board, { useTab: shouldUseTabs(this.stateManager.app) });
  }

  mdToBoard(md: string) {
    const { ast, settings, frontmatter } = parseMarkdown(this.stateManager, md);
    const newBoard = astToUnhydratedBoard(this.stateManager, settings, frontmatter, ast, md);
    const { history, raw } = extractHistory(md);
    if (history) newBoard.data.history = history;
    if (raw !== undefined) newBoard.data.historyRaw = raw;
    const { state } = this.stateManager;
    const dv = getDataviewApi(this.stateManager.app);

    if (!this.stateManager.hasError() && state) {
      const ops = diff(
        state,
        newBoard,
        (path) => {
          return generatedKeys.includes(path.last());
        },
        (val: any) => {
          if (!val) return String(val);
          if (val instanceof TFile) return val.path;
          if (isPlainObject(val) || Array.isArray(val)) return String(val);
          if (dv && !dv.value.isObject(val)) return dv.value.toString(val);
          return String(val);
        },
        (val: any) => !!dv?.value.isObject(val)
      );

      const patchedBoard = diffApply(state, ops) as Board;

      return hydratePostOp(this.stateManager, patchedBoard, ops);
    }

    return hydrateBoard(this.stateManager, newBoard);
  }

  reparseBoard() {
    return reparseBoard(this.stateManager, this.stateManager.state);
  }
}

export interface BaseFormat {
  newItem(content: string, checkChar: string, forceEdit?: boolean): Item;
  updateItemContent(item: Item, content: string): Item;
  boardToMd(board: Board): string;
  mdToBoard(md: string): Board;
  reparseBoard(): Board;
}
