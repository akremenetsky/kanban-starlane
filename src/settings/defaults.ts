import { DEFAULT_HIGHLIGHT_TAGS } from 'src/constants';
import { TagColor } from 'src/model/types';

import { DatePosition, DateSyntax, KanbanSettings, QUICK_ACTIONS, QuickAction } from './types';

export const defaultDateTrigger = '@';

export const defaultDateSyntax: DateSyntax = 'trigger';

export const defaultTimeTrigger = '@@';

export const defaultMetadataPosition = 'body';

export const defaultDatePosition: DatePosition = 'footer';

export const defaultQuickActions: QuickAction[] = ['done', 'date', 'next-lane'];

/** The panel holds at most this many actions, plus the menu button. */
export const MAX_QUICK_ACTIONS = 5;

/**
 * Known actions of a stored value, deduplicated, in panel order, at most the limit. Values come
 * from hand-edited files or newer plugin versions with actions this one does not know.
 */
export function sanitizeQuickActions(value: unknown): QuickAction[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return QUICK_ACTIONS.filter((action) => value.includes(action)).slice(0, MAX_QUICK_ACTIONS);
}

/** The date position set in one settings layer, reading the legacy `move-dates` toggle. */
export function storedDatePosition(settings: KanbanSettings | undefined): DatePosition | undefined {
  if (settings?.['date-position']) return settings['date-position'];
  if (settings?.['move-dates'] === true) return 'footer';
  if (settings?.['move-dates'] === false) return 'body';
  return undefined;
}

const defaultTagColors: TagColor[] = [
  {
    tagKey: DEFAULT_HIGHLIGHT_TAGS.urgent,
    color: 'rgba(255, 255, 255, 1)',
    backgroundColor: 'rgba(233, 49, 71, 1)',
    highlight: true,
  },
  {
    tagKey: DEFAULT_HIGHLIGHT_TAGS.important,
    color: 'rgba(255, 255, 255, 1)',
    backgroundColor: 'rgba(236, 117, 0, 1)',
    highlight: true,
  },
];

/** Bump when `defaultTagColors` gains an entry, so existing users get it once too. */
const DEFAULTS_VERSION = 1;

/**
 * Global settings with the ready-made highlighting tags, or null when they were added before.
 * Missing tags are appended; a tag the user already colours keeps its colours and gets the
 * highlight switched on. Done once per DEFAULTS_VERSION, so deleted tags do not come back.
 */
export function applyDefaultTags(settings: KanbanSettings): KanbanSettings | null {
  if ((settings['defaults-version'] ?? 0) >= DEFAULTS_VERSION) return null;

  const tagColors = (settings['tag-colors'] ?? []).map((tagColor) => ({ ...tagColor }));
  for (const tagColor of defaultTagColors) {
    const key = tagColor.tagKey.toLowerCase();
    const existing = tagColors.find((c) => c.tagKey?.toLowerCase() === key);
    if (existing) existing.highlight = true;
    else tagColors.push({ ...tagColor });
  }

  return { ...settings, 'tag-colors': tagColors, 'defaults-version': DEFAULTS_VERSION };
}
