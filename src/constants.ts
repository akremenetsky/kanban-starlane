/**
 * Identifiers that end up in users' vaults (files, workspace layout, CSS).
 * Changing any of these is a breaking change for existing boards — see docs/dev/board-format.md.
 */

/** Obsidian plugin id; must match manifest.json. */
export const PLUGIN_ID = 'kanban-starlane';

/** Workspace view type registered for boards. Stored in workspace.json. */
export const VIEW_TYPE = 'kanban-starlane';

/**
 * Lucide icon used for the view, ribbon and menus. Must exist in the Lucide set bundled with
 * both minAppVersion and the latest Obsidian: a missing name renders as an empty space.
 */
export const VIEW_ICON = 'lucide-square-kanban';

/**
 * Frontmatter key that marks a note as a board. Its value is the default view
 * ('board' | 'list' | 'table'). Also stored as a key in the settings footer.
 */
export const FRONTMATTER_KEY = 'kanban-starlane';

/** Frontmatter key used by the original obsidian-kanban plugin (for migration only). */
export const LEGACY_FRONTMATTER_KEY = 'kanban-plugin';

/** Prefix for every CSS class the plugin renders (`kanban-starlane__lane`, ...). */
export const CSS_PREFIX = 'kanban-starlane';

/** First line of the `%% ... %%` comment block that stores board settings. */
export const SETTINGS_BLOCK_MARKER = '%% kanban-starlane:settings';

/** First line of the `%% ... %%` comment block that stores card history. */
export const HISTORY_BLOCK_MARKER = '%% kanban-starlane:history';

/** Settings block marker written by the original obsidian-kanban plugin. */
export const LEGACY_SETTINGS_BLOCK_MARKER = '%% kanban:settings';
