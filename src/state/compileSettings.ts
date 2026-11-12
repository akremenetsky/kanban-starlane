import { FRONTMATTER_KEY } from 'src/constants';
import {
  defaultDatePosition,
  defaultDateSyntax,
  defaultDateTrigger,
  defaultMetadataPosition,
  defaultQuickActions,
  defaultTimeTrigger,
  sanitizeQuickActions,
  sanitizeSizeTag,
  sanitizeSizeWeights,
  storedDatePosition,
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
  const dateSyntax = raw('date-syntax') || defaultDateSyntax;
  // Resolved per layer: a board's legacy `move-dates` beats a global `date-position`.
  const datePosition =
    [...boardLayers, globalSettings].map(storedDatePosition).find(Boolean) ?? defaultDatePosition;

  return {
    [FRONTMATTER_KEY]: raw(FRONTMATTER_KEY) || 'board',
    'date-format': dateFormat,
    'date-display-format': dateDisplayFormat,
    'date-time-display-format': dateDisplayFormat + ' ' + timeFormat,
    'date-position': datePosition,
    'date-syntax': dateSyntax,
    'date-tags-as-written': raw('date-tags-as-written'),
    'date-trigger': raw('date-trigger') || defaultDateTrigger,
    'inline-metadata-position': raw('inline-metadata-position') || defaultMetadataPosition,
    'time-format': timeFormat,
    'time-trigger': raw('time-trigger') || defaultTimeTrigger,
    // A tag date cannot be a link, so the daily note link only applies to `@{…}` dates.
    'link-date-to-daily-note': dateSyntax === 'tag' ? false : raw('link-date-to-daily-note'),
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
    'show-filter': raw('show-filter') ?? true,
    'show-set-view': raw('show-set-view') ?? true,
    'tag-colors': raw('tag-colors') ?? [],
    'tag-sort': raw('tag-sort') ?? [],
    'date-colors': raw('date-colors') ?? [],
    'quick-actions': sanitizeQuickActions(raw('quick-actions')) ?? defaultQuickActions,
    'show-card-size': raw('show-card-size') ?? true,
    'size-tag': sanitizeSizeTag(raw('size-tag')),
    // Per size: a board that sets only M keeps the global (or default) weights of the others.
    'size-weights': sanitizeSizeWeights(
      Object.assign(
        {},
        globalSettings?.['size-weights'],
        ...[...boardLayers].reverse().map((layer) => layer?.['size-weights'])
      )
    ),
    'tag-action': raw('tag-action') ?? 'obsidian',
  };
}
