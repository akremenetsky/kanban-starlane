import { escapeRegExpStr } from 'src/shared/util';

interface Triggers {
  dateTrigger: string;
  timeTrigger: string;
}

const illegalCharsRegEx = /[\\/:"*?<>|]+/g;
const embedRegEx = /!?\[\[([^\]]*)\.[^\]]+\]\]/g;
const wikilinkRegEx = /!?\[\[([^\]]*)\]\]/g;
const mdLinkRegEx = /!?\[([^\]]*)\]\([^)]*\)/g;
const tagSource = `(?<=^|\\s)#[^\\u2000-\\u206F\\u2E00-\\u2E7F'!"#$%&()*+,.:;<=>?@^\`{|}~[\\]\\\\\\s]+`;
const whiteSpaceRegEx = /\s+/g;

// Time is tried first: with the default triggers `@@{…}` also starts with the date trigger.
function metadataRegEx({ dateTrigger, timeTrigger }: Triggers) {
  const date = escapeRegExpStr(dateTrigger);
  const time = escapeRegExpStr(timeTrigger);
  return new RegExp(
    `${time}\\{[^}]*\\}|${date}\\{[^}]*\\}|${date}\\[\\[[^\\]]*\\]\\]|${tagSource}`,
    'g'
  );
}

function firstLine(titleRaw: string) {
  return titleRaw.split('\n')[0];
}

/** File name for a note created from a card: the card's first line without dates, times, tags and link syntax. */
export function noteNameFromCardTitle(titleRaw: string, triggers: Triggers) {
  return firstLine(titleRaw)
    .replace(metadataRegEx(triggers), ' ')
    .replace(embedRegEx, '$1')
    .replace(wikilinkRegEx, '$1')
    .replace(mdLinkRegEx, '$1')
    .replace(illegalCharsRegEx, ' ')
    .replace(whiteSpaceRegEx, ' ')
    .trim();
}

/** Card text after linking it to a new note: the first line's text becomes the link, its date, time and tags stay. */
export function linkCardTitleToNote(titleRaw: string, link: string, triggers: Triggers) {
  const [first, ...rest] = titleRaw.split('\n');
  const metadata = first.match(metadataRegEx(triggers)) ?? [];
  return [[link, ...metadata].join(' '), ...rest].join('\n');
}
