import { DEFAULT_HIGHLIGHT_TAGS } from 'src/constants';
import { TagColor } from 'src/model/types';

import { DateSyntax, KanbanSettings } from './types';

export const defaultDateTrigger = '@';

export const defaultDateSyntax: DateSyntax = 'trigger';

export const defaultTimeTrigger = '@@';

export const defaultMetadataPosition = 'body';

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

/**
 * Global settings for a vault with no saved plugin data. Only a real new install gets the
 * highlighting tags: earlier versions saved nothing until a setting was changed, so a vault
 * that already has boards is an update, and its `#urgent` cards must not change colour.
 */
export function initialSettings(hasBoards: boolean): KanbanSettings {
  if (hasBoards) return {};
  return { 'tag-colors': defaultTagColors.map((tagColor) => ({ ...tagColor })) };
}
