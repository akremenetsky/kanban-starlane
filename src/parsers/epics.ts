import { EPICS_BLOCK_MARKER } from 'src/constants';
import { Board, CardEpics } from 'src/model/types';

import { jsonBlock } from './helpers/jsonBlock';

function isEpic(e: unknown): boolean {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return false;
  const { color, cards } = e as { color?: unknown; cards?: unknown };
  return (
    (color === undefined || typeof color === 'string') &&
    Array.isArray(cards) &&
    cards.every((card) => typeof card === 'string')
  );
}

function isEpics(value: unknown): value is CardEpics {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(isEpic);
}

const epicsBlock = jsonBlock(EPICS_BLOCK_MARKER, isEpics);

/** Read the epics block. Unreadable JSON is kept as `raw` so saving does not lose it. */
export function extractEpics(md: string): { epics?: CardEpics; raw?: string } {
  const { value, raw } = epicsBlock.extract(md);
  return value ? { epics: value } : { raw };
}

/** The markdown without the epics block (so it is never mistaken for the settings). */
export function withoutEpicsBlock(md: string) {
  return epicsBlock.strip(md);
}

export function isEpicsBlockStart(text: string) {
  return epicsBlock.isStart(text);
}

/** The epics block with a leading blank line, or '' when the board has no epics. */
export function epicsToCodeblock(board: Board): string {
  return epicsBlock.toCodeblock(board.data.epics, board.data.epicsRaw);
}
