import { maskCode, tagSource } from './tagDate';

function isSameTag(a: string, b: string) {
  // Obsidian treats tags case-insensitively.
  return a.toLowerCase() === b.toLowerCase();
}

// Wikilinks and comments: a `#` in them is not a tag on the card, so it is never removed.
const notTagRegEx = /\[\[[^\]\n]*\]\]|%%[\s\S]*?%%/g;

function maskNonTags(text: string) {
  return maskCode(text).replace(notTagRegEx, (m) => m.replace(/[^\n]/g, '\0'));
}

const fenceRegEx = /^\s*(```|~~~)/;

/** Whether the card has the tag (any case); `tags` are the parsed tags of the card. */
export function hasTag(tags: string[] | undefined, tag: string) {
  return !!tags?.some((t) => isSameTag(t, tag));
}

/** Card text with `tag` appended to its first line (on a line of its own after code). */
export function addTag(titleRaw: string, tag: string) {
  const lineEnd = titleRaw.indexOf('\n');
  const first = lineEnd === -1 ? titleRaw : titleRaw.slice(0, lineEnd);
  // On a fence line the tag would become the code block's language.
  if (fenceRegEx.test(first)) return `${titleRaw.trimEnd()}\n${tag}`;

  const rest = lineEnd === -1 ? '' : titleRaw.slice(lineEnd);
  const trimmed = first.trimEnd();
  return (trimmed ? `${trimmed} ${tag}` : tag) + rest;
}

/** Card text without any occurrence of `tag` (any case); code, links and comments are kept. */
export function removeTag(titleRaw: string, tag: string) {
  const matches = [...maskNonTags(titleRaw).matchAll(new RegExp(tagSource, 'g'))].filter((m) =>
    isSameTag(m[0], tag)
  );
  if (!matches.length) return titleRaw;

  let text = titleRaw;
  for (const match of matches.reverse()) {
    let start = match.index;
    let end = start + match[0].length;

    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const lineEndAt = text.indexOf('\n', end);
    const lineEnd = lineEndAt === -1 ? text.length : lineEndAt;
    if (!text.slice(lineStart, start).trim() && !text.slice(end, lineEnd).trim()) {
      // The tag was alone on its line: drop the line, not just leave it empty.
      start = lineStart > 0 ? lineStart - 1 : lineStart;
      end = lineStart > 0 ? lineEnd : Math.min(lineEnd + 1, text.length);
    } else if (/[ \t]/.test(text[start - 1] ?? '')) {
      // Take one space along, before the tag or (at a line start) after it.
      start--;
    } else if (/[ \t]/.test(text[end] ?? '')) {
      end++;
    }
    text = text.slice(0, start) + text.slice(end);
  }
  return text.trim();
}
