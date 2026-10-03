import { HISTORY_BLOCK_MARKER } from 'src/constants';
import { Board, CardHistory } from 'src/model/types';

const historyBlockRegEx = new RegExp(
  `^${HISTORY_BLOCK_MARKER}\\r?\\n\`\`\`\\r?\\n([\\s\\S]*?)\\r?\\n\`\`\`\\r?\\n%%$`,
  'm'
);

/** Read the card history block. Unreadable JSON is kept as `raw` so saving does not lose it. */
export function extractHistory(md: string): { history?: CardHistory; raw?: string } {
  const match = historyBlockRegEx.exec(md);
  if (!match) return {};

  try {
    const history: unknown = JSON.parse(match[1]);
    if (isCardHistory(history)) return { history };
  } catch {
    // fall through
  }

  return { raw: match[1] };
}

/** The markdown without the history block (so it is never mistaken for the settings). */
export function withoutHistoryBlock(md: string) {
  return md.replace(historyBlockRegEx, '');
}

function isCardHistory(value: unknown): value is CardHistory {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (events) => Array.isArray(events) && (events as unknown[]).every(isCardEvent)
  );
}

function isCardEvent(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const { at, type } = e as { at?: unknown; type?: unknown };
  return typeof at === 'string' && typeof type === 'string';
}

export function isHistoryBlockStart(text: string) {
  return text.startsWith(HISTORY_BLOCK_MARKER);
}

/** The history block with a leading blank line, or '' when the board has no history. */
export function historyToCodeblock(board: Board): string {
  const { history, historyRaw } = board.data;
  let body = historyRaw;

  if (body === undefined) {
    const entries = Object.entries(history ?? {}).filter(([, events]) => events?.length);
    if (!entries.length) return '';

    // One card per line keeps diffs of synced vaults small. Backticks would end the fence.
    body = [
      '{',
      entries
        .map(([id, events]) => `${JSON.stringify(id)}:${JSON.stringify(events)}`)
        .join(',\n')
        .replace(/`/g, '\\u0060'),
      '}',
    ].join('\n');
  }

  return ['', '', HISTORY_BLOCK_MARKER, '```', body, '```', '%%'].join('\n');
}
