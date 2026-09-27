import { App } from 'obsidian';
import { getTaskStatusDone } from 'src/integrations/tasks';
import { Item } from 'src/model/types';

export function getItemClassModifiers(app: App, item: Item) {
  const date = item.data.metadata.date;
  const classModifiers: string[] = [];

  if (date) {
    if (date.isSame(new Date(), 'day')) {
      classModifiers.push('is-today');
    }

    if (date.isAfter(new Date(), 'day')) {
      classModifiers.push('is-future');
    }

    if (date.isBefore(new Date(), 'day')) {
      classModifiers.push('is-past');
    }
  }

  if (item.data.checked && item.data.checkChar === getTaskStatusDone(app)) {
    classModifiers.push('is-complete');
  }

  for (const tag of item.data.metadata.tags) {
    classModifiers.push(`has-tag-${tag.slice(1)}`);
  }

  return classModifiers;
}
