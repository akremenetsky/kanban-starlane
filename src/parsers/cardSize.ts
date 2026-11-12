import { CARD_SIZES, CardSize } from 'src/model/types';

import { addTag, removeTag } from './cardTags';

/** The size a tag stands for, e.g. `#size/M` with the word `size` (any case), or null. */
export function parseSizeTag(tag: string, word: string): CardSize | null {
  const prefix = `#${word}/`.toLowerCase();
  if (!tag.toLowerCase().startsWith(prefix)) return null;
  const size = tag.slice(prefix.length).toUpperCase();
  return (CARD_SIZES as readonly string[]).includes(size) ? (size as CardSize) : null;
}

/** The tag written for a size. */
export function sizeTag(size: CardSize, word: string) {
  return `#${word}/${size}`;
}

/** Card text with its size set to `size` (or removed for null): one size tag at most. */
export function setCardSize(titleRaw: string, size: CardSize | null, word: string) {
  const without = CARD_SIZES.reduce((text, s) => removeTag(text, sizeTag(s, word)), titleRaw);
  return size ? addTag(without, sizeTag(size, word)) : without;
}
