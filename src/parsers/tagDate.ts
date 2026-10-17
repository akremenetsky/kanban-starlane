import { Moment, moment } from 'src/shared/moment';

// The tag date syntax (`date-syntax: tag`): a date tag, optionally followed by the time part.
// `#26-10-14` has no time; `#26-10-14-00-00-00` is an explicit midnight.
export const TAG_DATE_FORMAT = '#YY-MM-DD';
export const TAG_TIME_FORMAT = '-HH-mm-ss';

// A tag as Obsidian sees it: `#` after a line start or whitespace, up to the first character
// that ends a tag (same set as the parser's tag extension).
export const tagSource = `(?<=^|\\s)#[^\\u2000-\\u206F\\u2E00-\\u2E7F'!"#$%&()*+,.:;<=>?@^\`{|}~[\\]\\\\\\s]+`;

export interface TagDate {
  date: Moment;
  hasTime: boolean;
}

/** Reads a tag (with `#`) written in the tag date format; null if it is an ordinary tag. */
export function parseTagDate(tag: string): TagDate | null {
  const withTime = moment(tag, TAG_DATE_FORMAT + TAG_TIME_FORMAT, true);
  if (withTime.isValid()) return { date: withTime, hasTime: true };

  const dateOnly = moment(tag, TAG_DATE_FORMAT, true);
  if (dateOnly.isValid()) return { date: dateOnly, hasTime: false };

  return null;
}

/** Writes a date as a tag, with the time part when `withTime`. */
export function formatTagDate(date: Moment, withTime: boolean) {
  return date.format(withTime ? TAG_DATE_FORMAT + TAG_TIME_FORMAT : TAG_DATE_FORMAT);
}

export type FoundTagDate = TagDate & { text: string; index: number };

// Code spans and fenced blocks: a `#` in them is not a tag for the parser either.
const codeRegEx = /(`+)[\s\S]*?\1|~~~[\s\S]*?~~~/g;

/** Blanks out code spans and blocks, keeping offsets: no tag starts in or right after code. */
export function maskCode(text: string) {
  return text.replace(codeRegEx, (code) => code.replace(/[^\n]/g, '\0'));
}

/** The first tag in the text that is a tag date — the one the parser makes the card's date. */
export function findTagDate(text: string): FoundTagDate | null {
  for (const match of maskCode(text).matchAll(new RegExp(tagSource, 'g'))) {
    const parsed = parseTagDate(match[0]);
    if (parsed) return { ...parsed, text: match[0], index: match.index };
  }
  return null;
}

// A card starts with an unindented list item; a heading ends a lane.
const cardBoundaryRegEx = /^(?:[-*+] |#{1,6} )/gm;

/**
 * The tag date of the card around `offset`. In a card editor the text is one card; in a board
 * file it is the list item containing `offset`. The index is in the whole text.
 */
export function findTagDateInCard(text: string, offset: number): FoundTagDate | null {
  let start = 0;
  let end = text.length;
  for (const match of text.matchAll(cardBoundaryRegEx)) {
    if (match.index > offset) {
      end = match.index;
      break;
    }
    start = match.index;
  }

  const found = findTagDate(text.slice(start, end));
  return found && { ...found, index: found.index + start };
}

function replaceAt(text: string, index: number, length: number, replacement: string) {
  return text.slice(0, index) + replacement + text.slice(index + length);
}

/** `date` with the time of day taken from `time`. */
export function withTimeOf(date: Moment, time: Moment) {
  return date.clone().hour(time.hour()).minute(time.minute()).second(time.second());
}

/** Card text with the date set to `date`, keeping the time of an existing tag date. */
export function setTagDate(titleRaw: string, date: Moment) {
  const found = findTagDate(titleRaw);
  if (!found) return `${titleRaw} ${formatTagDate(date, false)}`;

  const next = found.hasTime
    ? formatTagDate(withTimeOf(date, found.date), true)
    : formatTagDate(date, false);
  return replaceAt(titleRaw, found.index, found.text.length, next);
}

/** Card text with the time set on the existing tag date, or on `today` when there is none. */
export function setTagTime(titleRaw: string, time: Moment, today: Moment) {
  const found = findTagDate(titleRaw);
  if (!found) return `${titleRaw} ${formatTagDate(withTimeOf(today, time), true)}`;

  const next = formatTagDate(withTimeOf(found.date, time), true);
  return replaceAt(titleRaw, found.index, found.text.length, next);
}

/** Card text with the time part cut from the tag date. */
export function removeTagTime(titleRaw: string) {
  const found = findTagDate(titleRaw);
  if (!found?.hasTime) return titleRaw;
  return replaceAt(titleRaw, found.index, found.text.length, formatTagDate(found.date, false));
}

/** Card text without the tag date. */
export function removeTagDate(titleRaw: string) {
  const found = findTagDate(titleRaw);
  if (!found) return titleRaw;

  const before = titleRaw.slice(0, found.index).replace(/[ \t]$/, '');
  return (before + titleRaw.slice(found.index + found.text.length)).trim();
}
