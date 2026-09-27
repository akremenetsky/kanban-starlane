import { App } from 'obsidian';
import { InlineFieldSources } from 'src/parsers/helpers/inlineMetadata';

import { getDataviewPlugin } from './dataview';
import { getTasksPlugin } from './tasks';

/** Which third-party inline-field syntaxes are active in this vault. */
export function getInlineFieldSources(app: App): InlineFieldSources {
  return {
    dataview: !!getDataviewPlugin(app),
    tasks: !!getTasksPlugin(app),
  };
}
