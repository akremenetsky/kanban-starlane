import { CARD_SIZES, CardSize, Item } from 'src/model/types';

export interface SizeTotal {
  /** Sum of the weights of the sized cards. */
  total: number;
  /** Cards per size; sizes without cards are left out. */
  counts: Partial<Record<CardSize, number>>;
}

/** The weight total of a list's cards, or null when none has a size. */
export function sizeTotal(items: Item[], weights: Record<CardSize, number>): SizeTotal | null {
  const counts: Partial<Record<CardSize, number>> = {};
  let total = 0;
  for (const item of items) {
    const size = item.data.metadata.size;
    if (!size) continue;
    counts[size] = (counts[size] ?? 0) + 1;
    total += weights[size];
  }
  return CARD_SIZES.some((size) => counts[size]) ? { total, counts } : null;
}
