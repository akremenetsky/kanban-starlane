import type { ChipSource } from './chips';
import { useDateChip } from './dateChip';

/**
 * Every feature that shows something in the card header or footer, in a fixed order. Sources
 * may use hooks, so their names start with `use`. A feature that can be switched off returns
 * `[]` instead of leaving the list.
 */
export const chipSources: readonly ChipSource[] = Object.freeze<ChipSource[]>([useDateChip]);
