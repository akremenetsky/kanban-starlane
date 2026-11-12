import { ComponentChildren } from 'preact';
import { Item } from 'src/model/types';
import { StateManager } from 'src/state/StateManager';

import { chipSources } from './sources';

/** Header: what the card belongs to (epic, blocked). Footer: measurable signals. */
export type CardZone = 'header' | 'footer';

export interface CardChip {
  /** Stable key, also the `data-chip` attribute for e2e selectors and CSS snippets. */
  id: string;
  zone: CardZone;
  /** Position inside the zone; the same for every card so values line up across a lane. */
  order: number;
  icon?: string;
  label?: string;
  /** Interactive content (its own click targets) shown instead of `label`. */
  content?: ComponentChildren;
  tooltip?: string;
  /** Semantic colour: `danger` for blocked/overdue, `accent` for live states. */
  tone?: 'danger' | 'accent';
  /** Free colour (an epic's), applied to the chip text. */
  color?: string;
  /** Pushes the chip and the ones after it to the end of the line. */
  end?: boolean;
  /** Content of the popover the chip opens on click. */
  popover?: (close: () => void) => ComponentChildren;
}

/**
 * Produces the chips of one feature for a card. Called during render in a fixed order, so it
 * may use hooks such as `stateManager.useSetting`. A feature that can be switched off still
 * runs its hooks and returns `[]`; it is never added to or removed from the list at runtime.
 */
export type ChipSource = (item: Item, stateManager: StateManager) => CardChip[];

export interface ZoneChips {
  header: CardChip[];
  footer: CardChip[];
}

/** Splits chips into zones, each sorted by `order` (stable for equal orders). */
export function layoutChips(chips: CardChip[]): ZoneChips {
  const byOrder = (a: CardChip, b: CardChip) => a.order - b.order;
  return {
    header: chips.filter((chip) => chip.zone === 'header').sort(byOrder),
    footer: chips.filter((chip) => chip.zone === 'footer').sort(byOrder),
  };
}

/** Collects the chips of every registered source for a card. */
export function useCardChips(
  item: Item,
  stateManager: StateManager,
  sources: readonly ChipSource[] = chipSources
): ZoneChips {
  return layoutChips(sources.flatMap((source) => source(item, stateManager)));
}
