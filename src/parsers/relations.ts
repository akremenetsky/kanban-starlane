import { RELATIONS_BLOCK_MARKER } from 'src/constants';
import { Board, CardRelations } from 'src/model/types';

import { isRecordOfArrays, jsonBlock } from './helpers/jsonBlock';

function isRelation(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const { type, card } = e as { type?: unknown; card?: unknown };
  return typeof type === 'string' && typeof card === 'string';
}

const relationsBlock = jsonBlock(RELATIONS_BLOCK_MARKER, (v): v is CardRelations =>
  isRecordOfArrays(v, isRelation)
);

/** Read the card relations block. Unreadable JSON is kept as `raw` so saving does not lose it. */
export function extractRelations(md: string): { relations?: CardRelations; raw?: string } {
  const { value, raw } = relationsBlock.extract(md);
  return value ? { relations: value } : { raw };
}

/** The markdown without the relations block (so it is never mistaken for the settings). */
export function withoutRelationsBlock(md: string) {
  return relationsBlock.strip(md);
}

export function isRelationsBlockStart(text: string) {
  return relationsBlock.isStart(text);
}

/** The relations block with a leading blank line, or '' when the board has no relations. */
export function relationsToCodeblock(board: Board): string {
  return relationsBlock.toCodeblock(board.data.relations, board.data.relationsRaw);
}
