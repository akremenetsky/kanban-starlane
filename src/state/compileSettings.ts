import { FRONTMATTER_KEY } from 'src/constants';
import {
  defaultDateTrigger,
  defaultMetadataPosition,
  defaultTimeTrigger,
} from 'src/settings/defaults';
import { KanbanSettings } from 'src/settings/types';

export interface SettingDefaults {
  /** Default date format (from Daily notes / Templates / Natural Language Dates settings). */
  dateFormat: string;
  timeFormat: string;
}

/**
 * Resolve the effective settings of a board.
 *
 * Lookup order for each key: the first `boardLayers` entry that defines it, then the global
 * (plugin) settings, then the defaults below. Keys not listed here have no default and
 * resolve through `StateManager.getSetting` the same way.
 */
export function compileSettings(
  boardLayers: Array<KanbanSettings | undefined>,
  globalSettings: KanbanSettings | undefined,
  defaults: SettingDefaults
): KanbanSettings {
  const raw = <K extends keyof KanbanSettings>(key: K): KanbanSettings[K] => {
    for (const layer of boardLayers) {
      if (layer?.[key] !== undefined) return layer[key];
    }
    return globalSettings?.[key] ?? null;
  };

  const globalKeys = globalSettings?.['metadata-keys'] ?? [];
  const localKeys = raw('metadata-keys') || [];
  const metadataKeys = Array.from(new Set([...globalKeys, ...localKeys]));

  const dateFormat = raw('date-format') || defaults.dateFormat;
  const dateDisplayFormat = raw('date-display-format') || dateFormat;
  const timeFormat = raw('time-format') || defaults.timeFormat;

  return {
    [FRONTMATTER_KEY]: raw(FRONTMATTER_KEY) || 'board',
    'date-format': dateFormat,
    'date-display-format': dateDisplayFormat,
    'date-time-display-format': dateDisplayFormat + ' ' + timeFormat,
    'date-trigger': raw('date-trigger') || defaultDateTrigger,
    'inline-metadata-position': raw('inline-metadata-position') || defaultMetadataPosition,
    'time-format': timeFormat,
    'time-trigger': raw('time-trigger') || defaultTimeTrigger,
    'link-date-to-daily-note': raw('link-date-to-daily-note'),
    'move-dates': raw('move-dates'),
    'move-tags': raw('move-tags'),
    'move-task-metadata': raw('move-task-metadata'),
    'metadata-keys': metadataKeys,
    'archive-date-separator': raw('archive-date-separator') || '',
    'archive-date-format': raw('archive-date-format') || `${dateFormat} ${timeFormat}`,
    'card-history': raw('card-history') ?? true,
    'show-add-list': raw('show-add-list') ?? true,
    'show-archive-all': raw('show-archive-all') ?? true,
    'show-view-as-markdown': raw('show-view-as-markdown') ?? true,
    'show-board-settings': raw('show-board-settings') ?? true,
    'show-search': raw('show-search') ?? true,
    'show-set-view': raw('show-set-view') ?? true,
    'tag-colors': raw('tag-colors') ?? [],
    'tag-sort': raw('tag-sort') ?? [],
    'date-colors': raw('date-colors') ?? [],
    'tag-action': raw('tag-action') ?? 'obsidian',
  };
}
