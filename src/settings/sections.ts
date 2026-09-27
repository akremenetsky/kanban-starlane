/**
 * The settings screen, section by section. Shared by the plugin settings tab (global
 * defaults) and the board settings modal (per-board overrides).
 *
 * To add a setting: add its key to settings/types.ts (KanbanSettings + settingKeyLookup),
 * give it a default in state/compileSettings.ts if needed, then add a control here.
 */
import { Setting } from 'obsidian';
import { c } from 'src/components/helpers';
import { getParentWindow } from 'src/dnd/util/getWindow';
import { getDefaultDateFormat, getDefaultTimeFormat } from 'src/integrations/dateFormats';
import { t } from 'src/lang/helpers';
import {
  DataKey,
  DateColor,
  DateColorSettingTemplate,
  MetadataSettingTemplate,
  TagColor,
  TagColorSettingTemplate,
  TagSort,
  TagSortSettingTemplate,
} from 'src/model/types';
import { generateInstanceId } from 'src/shared/ids';

import { cleanUpDateSettings, renderDateSettings } from './DateColorSettings';
import { cleanupMetadataSettings, renderMetadataSettings } from './MetadataSettings';
import { cleanUpTagSettings, renderTagSettings } from './TagColorSettings';
import { cleanUpTagSortSettings, renderTagSortSettings } from './TagSortSettings';
import {
  SettingsContext,
  colorSetting,
  dropdownSetting,
  heading,
  momentFormatSetting,
  numberSetting,
  overrideTextSetting,
  textSetting,
  toggleSetting,
} from './controls';
import { defaultDateTrigger, defaultMetadataPosition, defaultTimeTrigger } from './defaults';
import { createSearchSelect, getListOptions } from './searchSelect';
import { KanbanSettings } from './types';

export function renderSettings(ctx: SettingsContext, title: string) {
  const { containerEl, local } = ctx;

  containerEl.createEl('h3', { text: title });
  containerEl.createEl('p', {
    text: local
      ? t('These settings will take precedence over the default Kanban board settings.')
      : t(
          'Set the default Kanban board settings. Settings can be overridden on a board-by-board basis.'
        ),
  });

  renderGeneral(ctx);
  renderTags(ctx);
  renderDates(ctx);
  renderArchive(ctx);
  renderInlineMetadata(ctx);
  renderLinkedMetadata(ctx);
  renderHeaderButtons(ctx);
}

function renderGeneral(ctx: SettingsContext) {
  if (ctx.local) {
    colorSetting(ctx, 'board-color', {
      name: t('Board color'),
      desc: t('Cards of this board are marked with this color when other boards show them.'),
    });
  }

  toggleSetting(ctx, 'card-history', {
    name: t('Card history'),
    desc: t(
      'Record when cards are created, edited, moved, checked and archived. The history is kept in the board file; cards get a block id (^id) when their history starts.'
    ),
    defaultValue: true,
  });

  toggleSetting(ctx, 'show-checkboxes', {
    name: t('Display card checkbox'),
    desc: t('When toggled, a checkbox will be displayed with each card'),
  });

  dropdownSetting(ctx, 'new-line-trigger', {
    name: t('New line trigger'),
    desc: t(
      'Select whether Enter or Shift+Enter creates a new line. The opposite of what you choose will create and complete editing of cards and lists.'
    ),
    options: [
      ['shift-enter', t('Shift + Enter')],
      ['enter', t('Enter')],
    ],
    defaultValue: 'shift-enter',
  });

  dropdownSetting(ctx, 'new-card-insertion-method', {
    name: t('Prepend / append new cards'),
    desc: t(
      'This setting controls whether new cards are added to the beginning or end of the list.'
    ),
    options: [
      ['prepend', t('Prepend')],
      ['prepend-compact', t('Prepend (compact)')],
      ['append', t('Append')],
    ],
    defaultValue: 'append',
  });

  toggleSetting(ctx, 'hide-card-count', {
    name: t('Hide card counts in list titles'),
    desc: t('When toggled, card counts are hidden from the list title'),
  });

  numberSetting(ctx, 'lane-width', {
    name: t('List width'),
    desc: t('Enter a number to set the list width in pixels.'),
    defaultValue: 272,
    min: 1,
  });

  toggleSetting(ctx, 'full-list-lane-width', {
    name: t('Expand lists to full width in list view'),
  });

  numberSetting(ctx, 'max-archive-size', {
    name: t('Maximum number of archived cards'),
    desc: t(
      "Archived cards can be viewed in markdown mode. This setting will begin removing old cards once the limit is reached. Setting this value to -1 will allow a board's archive to grow infinitely."
    ),
    defaultValue: -1,
    min: -1,
  });

  const { templateFiles, vaultFolders, templateWarning } = getListOptions(ctx.manager.app);

  new Setting(ctx.containerEl)
    .setName(t('Note template'))
    .setDesc(t('This template will be used when creating new notes from Kanban cards.'))
    .then(
      createSearchSelect({
        choices: templateFiles,
        key: 'new-note-template',
        warningText: templateWarning,
        local: ctx.local,
        placeHolderStr: t('No template'),
        manager: ctx.manager,
      })
    );

  new Setting(ctx.containerEl)
    .setName(t('Note folder'))
    .setDesc(
      t(
        'Notes created from Kanban cards will be placed in this folder. If blank, they will be placed in the default location for this vault.'
      )
    )
    .then(
      createSearchSelect({
        choices: vaultFolders,
        key: 'new-note-folder',
        local: ctx.local,
        placeHolderStr: t('Default folder'),
        manager: ctx.manager,
      })
    );
}

function renderTags(ctx: SettingsContext) {
  heading(ctx, t('Tags'));

  toggleSetting(ctx, 'move-tags', {
    name: t('Move tags to card footer'),
    desc: t(
      "When toggled, tags will be displayed in the card's footer instead of the card's body."
    ),
  });

  dropdownSetting(ctx, 'tag-action', {
    name: t('Tag click action'),
    desc: t(
      'This setting controls whether clicking the tags displayed below the card title opens the Obsidian search or the Kanban board search.'
    ),
    options: [
      ['kanban', t('Search Kanban Board')],
      ['obsidian', t('Search Obsidian Vault')],
    ],
    defaultValue: 'obsidian',
  });

  listEditor(ctx, 'tag-sort', {
    useGlobalFallback: true,
    toEntity: (data: TagSort) => ({ ...TagSortSettingTemplate, id: generateInstanceId(), data }),
    render: (el, keys, onChange) => renderTagSortSettings(el, ctx.containerEl, keys, onChange),
    cleanup: cleanUpTagSortSettings,
  });

  listEditor(ctx, 'tag-colors', {
    toEntity: (data: TagColor) => ({ ...TagColorSettingTemplate, id: generateInstanceId(), data }),
    render: (el, keys, onChange) => renderTagSettings(el, keys, onChange),
    cleanup: cleanUpTagSettings,
  });
}

function renderDates(ctx: SettingsContext) {
  const { manager, local } = ctx;
  const app = manager.app;
  const resolved = (key: keyof KanbanSettings, fallback: () => string) => () => {
    const [value, globalValue] = manager.getSetting(key, local);
    return (value || globalValue || fallback()) as string;
  };

  heading(ctx, t('Date & Time'));

  toggleSetting(ctx, 'move-dates', {
    name: t('Move dates to card footer'),
    desc: t(
      "When toggled, dates will be displayed in the card's footer instead of the card's body."
    ),
  });

  textSetting(ctx, 'date-trigger', {
    name: t('Date trigger'),
    desc: t('When this is typed, it will trigger the date selector'),
    defaultValue: defaultDateTrigger,
  });

  textSetting(ctx, 'time-trigger', {
    name: t('Time trigger'),
    desc: t('When this is typed, it will trigger the time selector'),
    defaultValue: defaultTimeTrigger,
  });

  momentFormatSetting(ctx, 'date-format', {
    name: t('Date format'),
    intro: t('This format will be used when saving dates in markdown.'),
    defaultFormat: () => getDefaultDateFormat(app),
  });

  momentFormatSetting(ctx, 'time-format', {
    name: t('Time format'),
    defaultFormat: () => getDefaultTimeFormat(app),
  });

  momentFormatSetting(ctx, 'date-display-format', {
    name: t('Date display format'),
    intro: t('This format will be used when displaying dates in Kanban cards.'),
    defaultFormat: () => getDefaultDateFormat(app),
  });

  toggleSetting(ctx, 'show-relative-date', {
    name: t('Show relative date'),
    desc: t(
      "When toggled, cards will display the distance between today and the card's date. eg. 'In 3 days', 'A month ago'. Relative dates will not be shown for dates from the Tasks and Dataview plugins."
    ),
  });

  toggleSetting(ctx, 'link-date-to-daily-note', {
    name: t('Link dates to daily notes'),
    desc: t('When toggled, dates will link to daily notes. Eg. [[2021-04-26]]'),
  });

  listEditor(ctx, 'date-colors', {
    toEntity: (data: DateColor) => ({
      ...DateColorSettingTemplate,
      id: generateInstanceId(),
      data,
    }),
    render: (el, keys, onChange) =>
      renderDateSettings(
        el,
        keys,
        onChange,
        resolved('date-display-format', () => getDefaultDateFormat(app)),
        resolved('time-format', () => getDefaultTimeFormat(app))
      ),
    cleanup: cleanUpDateSettings,
  });
}

function renderArchive(ctx: SettingsContext) {
  const { manager, local } = ctx;
  const app = manager.app;

  toggleSetting(ctx, 'archive-with-date', {
    name: t('Add date and time to archived cards'),
    desc: t(
      'When toggled, the current date and time will be added to the card title when it is archived. Eg. - [ ] 2021-05-14 10:00am My card title'
    ),
  });

  toggleSetting(ctx, 'append-archive-date', {
    name: t('Add archive date/time after card title'),
    desc: t(
      'When toggled, the archived date/time will be added after the card title, e.g.- [ ] My card title 2021-05-14 10:00am. By default, it is inserted before the title.'
    ),
  });

  overrideTextSetting(ctx, 'archive-date-separator', {
    name: t('Archive date/time separator'),
    desc: t('This will be used to separate the archived date/time from the title'),
  });

  momentFormatSetting(ctx, 'archive-date-format', {
    name: t('Archive date/time format'),
    defaultFormat: () => {
      const [dateFmt, globalDateFmt] = manager.getSetting('date-format', local);
      const [timeFmt, globalTimeFmt] = manager.getSetting('time-format', local);
      const date = dateFmt || globalDateFmt || getDefaultDateFormat(app);
      const time = timeFmt || globalTimeFmt || getDefaultTimeFormat(app);
      return `${date} ${time}`;
    },
  });

  dropdownSetting(ctx, 'date-picker-week-start', {
    name: t('Calendar: first day of week'),
    desc: t('Override which day is used as the start of the week'),
    options: [
      ['', t('default')],
      ['0', t('Sunday')],
      ['1', t('Monday')],
      ['2', t('Tuesday')],
      ['3', t('Wednesday')],
      ['4', t('Thursday')],
      ['5', t('Friday')],
      ['6', t('Saturday')],
    ],
    defaultValue: '',
    parse: Number,
  });
}

function renderInlineMetadata(ctx: SettingsContext) {
  ctx.containerEl.createEl('br');
  heading(ctx, t('Inline Metadata'));

  dropdownSetting(ctx, 'inline-metadata-position', {
    name: t('Inline metadata position'),
    desc: t('Controls where the inline metadata (from the Dataview plugin) will be displayed.'),
    options: [
      ['body', t('Card body')],
      ['footer', t('Card footer')],
      ['metadata-table', t('Merge with linked page metadata')],
    ],
    defaultValue: defaultMetadataPosition,
    resettable: true,
  });

  toggleSetting(ctx, 'move-task-metadata', {
    name: t('Move task data to card footer'),
    desc: t(
      "When toggled, task data (from the Tasks plugin) will be displayed in the card's footer instead of the card's body."
    ),
  });
}

function renderLinkedMetadata(ctx: SettingsContext) {
  const { containerEl } = ctx;

  containerEl.createEl('br');
  heading(ctx, t('Linked Page Metadata'));
  containerEl.createEl('p', {
    cls: c('metadata-setting-desc'),
    text: t(
      'Display metadata for the first note linked within a card. Specify which metadata keys to display below. An optional label can be provided, and labels can be hidden altogether.'
    ),
  });

  listEditor(ctx, 'metadata-keys', {
    className: c('draggable-setting-container'),
    toEntity: (data: DataKey) => ({
      ...MetadataSettingTemplate,
      id: generateInstanceId(),
      data,
      win: getParentWindow(containerEl),
    }),
    render: (el, keys, onChange) => renderMetadataSettings(el, containerEl, keys, onChange),
    cleanup: cleanupMetadataSettings,
  });
}

function renderHeaderButtons(ctx: SettingsContext) {
  heading(ctx, t('Board Header Buttons'));

  const buttons: Array<[keyof KanbanSettings, string]> = [
    ['show-add-list', t('Add a list')],
    ['show-archive-all', t('Archive completed cards')],
    ['show-view-as-markdown', t('Open as markdown')],
    ['show-board-settings', t('Open board settings')],
    ['show-search', t('Search...')],
    ['show-set-view', t('Board view')],
  ];

  for (const [key, name] of buttons) {
    toggleSetting(ctx, key, { name, defaultValue: true });
  }
}

/**
 * A Setting row hosting one of the Preact list editors (tag colors, date colors, ...).
 * Items are wrapped as Nestable entities for drag-and-drop and unwrapped on save.
 */
function listEditor<T, E extends { data: T }>(
  ctx: SettingsContext,
  key: keyof KanbanSettings,
  opts: {
    toEntity: (data: T) => E;
    render: (el: HTMLElement, entities: E[], onChange: (entities: E[]) => void) => void;
    cleanup: (el: HTMLElement) => void;
    /** Board modal shows the global list when the board has none (tag-sort only). */
    useGlobalFallback?: boolean;
    className?: string;
  }
) {
  new Setting(ctx.containerEl).then((setting) => {
    if (opts.className) setting.settingEl.addClass(opts.className);

    const [value, globalValue] = ctx.manager.getSetting(key, ctx.local);
    const list = ((value || (opts.useGlobalFallback ? globalValue : null) || []) as T[]).map(
      opts.toEntity
    );

    opts.render(setting.settingEl, list, (entities) =>
      ctx.manager.applySettingsUpdate({ [key]: { $set: entities.map((e) => e.data) } })
    );

    ctx.manager.cleanupFns.push(() => {
      if (setting.settingEl) opts.cleanup(setting.settingEl);
    });
  });
}
