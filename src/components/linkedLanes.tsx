import { TFile } from 'obsidian';
import { ComponentChildren } from 'preact';
import { createContext, useContext, useEffect, useMemo, useState } from 'preact/compat';
import { Board, Lane, LinkedLane, LinkedLanes } from 'src/model/types';
import { hasFrontmatterKey } from 'src/parsers/boardDetection';
import { getBoardColor } from 'src/shared/colors';
import { StateManager } from 'src/state/StateManager';
import { BoardModifiers, getBoardModifiers } from 'src/state/boardModifiers';
import { LaneEntry, mergeLane, readLinkedLanes, resolveLaneSources } from 'src/state/linkedLanes';
import { KanbanView } from 'src/view/KanbanView';

import { KanbanContext } from './context';

/** A board whose lanes are shown in this board's linked lanes. */
export interface LinkedBoard {
  file: string;
  stateManager: StateManager;
  board: Board;
  boardModifiers: BoardModifiers;
  color: string;
}

export interface LinkedLanesContextProps {
  linkedLanes: LinkedLanes;
  /** Loaded linked boards by path; missing while loading or when the file does not exist. */
  boards: Map<string, LinkedBoard>;
  /** Linked board paths that do not exist in the vault. */
  missing: Set<string>;
}

export const LinkedLanesContext = createContext<LinkedLanesContextProps>({
  linkedLanes: {},
  boards: new Map(),
  missing: new Set(),
});

/** Load (and keep loaded) every board this board's linked lanes point at. */
export function useLinkedBoards(view: KanbanView, stateManager: StateManager) {
  const setting = stateManager.useSetting('linked-lanes');
  const linkedLanes = useMemo(() => readLinkedLanes({ 'linked-lanes': setting }), [setting]);
  const files = useMemo(() => {
    const paths = new Set<string>();
    Object.values(linkedLanes).forEach((l) => l.sources.forEach((s) => paths.add(s.file)));
    paths.delete(stateManager.file.path);
    return Array.from(paths).sort();
  }, [linkedLanes, stateManager]);

  const [boards, setBoards] = useState<Map<string, LinkedBoard>>(new Map());
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const filesKey = files.join('\n');

  useEffect(() => {
    let disposed = false;
    const cleanups: Array<() => void> = [];

    const put = (path: string, sm: StateManager) => {
      if (disposed || !sm.state) return;
      setBoards((prev) => {
        const next = new Map(prev);
        next.set(path, {
          file: path,
          stateManager: sm,
          board: sm.state,
          boardModifiers: getBoardModifiers(view, sm),
          color: getBoardColor(path, sm.getSetting('board-color')),
        });
        return next;
      });
    };

    setBoards(new Map());
    const notFound = new Set<string>();

    for (const path of files) {
      const file = view.app.vault.getAbstractFileByPath(path);
      // Only board files: loading a plain note as a board would rewrite it on the first drop.
      if (!(file instanceof TFile) || !hasFrontmatterKey(view.app, file)) {
        notFound.add(path);
        continue;
      }

      view.plugin
        .retainBoard(file)
        .then((sm) => {
          if (disposed) {
            sm.release();
            return;
          }
          const receiver = () => put(path, sm);
          sm.stateReceivers.push(receiver);
          cleanups.push(() => {
            sm.stateReceivers.remove(receiver);
            sm.release();
          });
          put(path, sm);
        })
        .catch((e) => console.error(e));
    }

    setMissing(notFound);

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, [filesKey, view]);

  useEffect(() => {
    view.linkedBoards = Array.from(boards.values()).map((b) => b.board);
  }, [boards, view]);

  return useMemo<LinkedLanesContextProps>(
    () => ({ linkedLanes, boards, missing }),
    [linkedLanes, boards, missing]
  );
}

/** Sources of `linked` that cannot be shown (board file or lane not found). */
export function missingSources(linked: LinkedLane | undefined, ctx: LinkedLanesContextProps) {
  if (!linked) return [];
  return linked.sources.filter((s) => {
    if (ctx.missing.has(s.file)) return true;
    const board = ctx.boards.get(s.file);
    return !!board && !board.board.children.some((l) => l.data.title === s.lane);
  });
}

/** The combined card list of an own lane, or null when the lane has no loaded links. */
export function getLaneEntries(lane: Lane, ctx: LinkedLanesContextProps): LaneEntry[] | null {
  const linked = ctx.linkedLanes[lane.data.title];
  const sources = resolveLaneSources(linked, (file) => ctx.boards.get(file)?.board);
  if (!sources.length) return null;
  return mergeLane(lane.children, sources, linked.order);
}

/** Card actions inside this provider edit the linked board, not the one being viewed. */
export function LinkedBoardProvider({
  board,
  children,
}: {
  board: LinkedBoard;
  children: ComponentChildren;
}) {
  const ctx = useContext(KanbanContext);
  const value = useMemo(
    () => ({
      ...ctx,
      stateManager: board.stateManager,
      boardModifiers: board.boardModifiers,
      filePath: board.file,
    }),
    [ctx, board]
  );
  return <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>;
}
