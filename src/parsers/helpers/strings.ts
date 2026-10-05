import { Stat } from 'obsidian';
import { Item } from 'src/model/types';

export interface FileAccessor {
  isEmbed: boolean;
  target: string;
  stats?: Stat;
}

export function markRangeForDeletion(str: string, range: { start: number; end: number }): string {
  const len = str.length;

  let start = range.start;
  while (start > 0 && str[start - 1] === ' ') start--;

  let end = range.end;
  while (end < len - 1 && str[end + 1] === ' ') end++;

  return str.slice(0, start) + '\u0000'.repeat(end - start) + str.slice(end);
}

export function executeDeletion(str: string) {
  return str.replace(/ *\0+ */g, ' ').trim();
}

export function replaceNewLines(str: string) {
  return str.trim().replace(/(?:\r\n|\n)/g, '<br>');
}

export function replaceBrs(str: string) {
  return str.replace(/<br>/g, '\n').trim();
}

export function indentNewLines(str: string, useTab: boolean) {
  return str.trim().replace(/(?:\r\n|\n)/g, useTab ? '\n\t' : '\n    ');
}

export function addBlockId(str: string, item: Item) {
  if (!item.data.blockId) return str;

  const lines = str.split(/(?:\r\n|\n)/g);
  lines[0] += ' ^' + item.data.blockId;

  return lines.join('\n');
}

export function removeBlockId(str: string) {
  const lines = str.split(/(?:\r\n|\n)/g);

  lines[0] = lines[0].replace(/\s+\^([a-zA-Z0-9-]+)$/, '');

  return lines.join('\n');
}

export function dedentNewLines(str: string) {
  return str.trim().replace(/(?:\r\n|\n)(?: {4}|\t)/g, '\n');
}

export function parseLaneTitle(str: string) {
  str = replaceBrs(str);

  const match = str.match(/^(.*?)\s*\((\d+)\)$/);
  if (match == null) return { title: str, maxItems: 0 };

  return { title: match[1], maxItems: Number(match[2]) };
}

const blockStarts: Array<[RegExp, string]> = [
  [/^( {0,3})([-*+](?:\s|$))/, '$1\\$2'], // bullet list item
  [/^( {0,3}\d{1,9})([.)](?:\s|$))/, '$1\\$2'], // ordered list item
  [/^( {0,3})(#{1,6}(?:\s|$))/, '$1\\$2'], // ATX heading
  [/^( {0,3})((?:[-*_] *){3,}$)/, '$1\\$2'], // thematic break
  [/^( {0,3})(=+ *$)/, '$1\\$2'], // setext heading underline
];

/**
 * Escapes lines of a lane description that would otherwise be read as cards, a new lane or the
 * end of the lane. Idempotent; fenced code is left alone.
 */
export function escapeLaneDescription(text: string) {
  let fence: string | null = null;

  return text
    .split('\n')
    .map((line) => {
      const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (fenceMatch) {
        if (fence === null) fence = fenceMatch[1][0];
        else if (fenceMatch[1][0] === fence) fence = null;
        return line;
      }
      if (fence !== null) return line;

      for (const [re, replacement] of blockStarts) {
        if (re.test(line)) return line.replace(re, replacement);
      }
      return line;
    })
    .join('\n');
}

export function laneTitleWithMaxItems(title: string, maxItems?: number) {
  if (!maxItems) return title;
  return `${title} (${maxItems})`;
}
