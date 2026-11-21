/**
 * A `%% <marker>` comment block holding fenced JSON keyed by card block id, one card per line
 * (card history, card relations). Obsidian hides `%%` comments, so the block is invisible
 * in reading view.
 */
export interface JsonBlock<T> {
  /** The block's value, or its body as `raw` when it cannot be read (written back as is). */
  extract(md: string): { value?: T; raw?: string };
  /** The markdown without this block. */
  strip(md: string): string;
  isStart(text: string): boolean;
  /** The block with two leading line breaks, or '' when there is nothing to write. */
  toCodeblock(value: Record<string, unknown> | undefined, raw: string | undefined): string;
}

export function jsonBlock<T>(
  marker: string,
  isValid: (value: unknown) => value is T
): JsonBlock<T> {
  const regEx = new RegExp(
    `^${marker}\\r?\\n\`\`\`\\r?\\n([\\s\\S]*?)\\r?\\n\`\`\`\\r?\\n%%$`,
    'm'
  );

  return {
    extract(md) {
      const match = regEx.exec(md);
      if (!match) return {};

      try {
        const value: unknown = JSON.parse(match[1]);
        if (isValid(value)) return { value };
      } catch {
        // fall through
      }

      return { raw: match[1] };
    },

    strip(md) {
      return md.replace(regEx, '');
    },

    isStart(text) {
      return isMarkerLine(text, marker);
    },

    toCodeblock(value, raw) {
      let body = raw;

      if (body === undefined) {
        const entries = Object.entries(value ?? {}).filter(
          ([, entry]) => entry != null && (!Array.isArray(entry) || entry.length > 0)
        );
        if (!entries.length) return '';

        // One card per line keeps diffs of synced vaults small. Backticks would end the fence.
        body = [
          '{',
          entries
            .map(([id, entry]) => `${JSON.stringify(id)}:${JSON.stringify(entry)}`)
            .join(',\n')
            .replace(/`/g, '\\u0060'),
          '}',
        ].join('\n');
      }

      return ['', '', marker, '```', body, '```', '%%'].join('\n');
    },
  };
}

/**
 * `text` (a paragraph) starts with the line `marker` and nothing else on it. Text that only
 * begins like a marker (`%% kanban-starlane:epics notes`) is ordinary text: taking it for a
 * block would end the lane there and lose the cards after it.
 */
export function isMarkerLine(text: string, marker: string): boolean {
  const firstLine = text.split(/\r?\n/, 1)[0];
  return firstLine.trimEnd() === marker;
}

/** `{ id: [entry, ...] }` where every entry passes `isEntry`. */
export function isRecordOfArrays(value: unknown, isEntry: (e: unknown) => boolean): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (entries) => Array.isArray(entries) && (entries as unknown[]).every(isEntry)
  );
}
