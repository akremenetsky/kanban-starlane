import { HISTORY_BLOCK_MARKER } from 'src/constants';
import { Board, CardHistory } from 'src/model/types';

import { isRecordOfArrays, jsonBlock } from './helpers/jsonBlock';

function isCardEvent(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const { at, type } = e as { at?: unknown; type?: unknown };
  return typeof at === 'string' && typeof type === 'string';
}

const historyBlock = jsonBlock(HISTORY_BLOCK_MARKER, (v): v is CardHistory =>
  isRecordOfArrays(v, isCardEvent)
);

/** Read the card history block. Unreadable JSON is kept as `raw` so saving does not lose it. */
export function extractHistory(md: string): { history?: CardHistory; raw?: string } {
  const { value, raw } = historyBlock.extract(md);
  return value ? { history: value } : { raw };
}

/** The markdown without the history block (so it is never mistaken for the settings). */
export function withoutHistoryBlock(md: string) {
  return historyBlock.strip(md);
}

export function isHistoryBlockStart(text: string) {
  return historyBlock.isStart(text);
}

/** The history block with a leading blank line, or '' when the board has no history. */
export function historyToCodeblock(board: Board): string {
  return historyBlock.toCodeblock(board.data.history, board.data.historyRaw);
}
