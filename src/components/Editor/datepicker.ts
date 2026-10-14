import { EditorSuggestContext } from 'obsidian';
import { buildLinkToDailyNote } from 'src/integrations/dailyNotes';
import { FoundTagDate, findTagDateInCard, formatTagDate, withTimeOf } from 'src/parsers/tagDate';
import { Moment, moment } from 'src/shared/moment';
import { StateManager } from 'src/state/StateManager';

import { getDefaultLocale } from './datePickerLocale';
import flatpickr from './flatpickr';
import { Instance } from './flatpickr/types/instance';

/**
 * Drops the trigger typed in the editor and writes `toTag(found)` over the tag date of the card
 * being edited, or at the trigger when the card has none. Only that card is searched: a board
 * open as markdown has many cards in one editor.
 */
export function writeTagDate(
  ctx: EditorSuggestContext,
  toTag: (found: FoundTagDate | null) => string
) {
  const { editor } = ctx;

  editor.replaceRange('', ctx.start, ctx.end);
  const triggerOffset = editor.posToOffset(ctx.start);
  const found = findTagDateInCard(editor.getValue(), triggerOffset);
  const tag = toTag(found);

  if (found) {
    const end = found.index + found.text.length;
    editor.replaceRange(tag, editor.offsetToPos(found.index), editor.offsetToPos(end));
    const shift = found.index < triggerOffset ? tag.length - found.text.length : 0;
    editor.setCursor(editor.offsetToPos(triggerOffset + shift));
  } else {
    editor.replaceRange(`${tag} `, ctx.start);
    editor.setCursor(editor.offsetToPos(triggerOffset + tag.length + 1));
  }

  editor.focus();
}

export function applyDate(ctx: EditorSuggestContext, stateManager: StateManager, date: Date) {
  if (stateManager.getSetting('date-syntax') === 'tag') {
    writeTagDate(ctx, (found) =>
      found?.hasTime
        ? formatTagDate(withTimeOf(moment(date), found.date), true)
        : formatTagDate(moment(date), false)
    );
    return;
  }

  const dateFormat = stateManager.getSetting('date-format');
  const dateTrigger = stateManager.getSetting('date-trigger');
  const shouldLinkDates = stateManager.getSetting('link-date-to-daily-note');

  const formattedDate = moment(date).format(dateFormat);
  const wrappedDate = shouldLinkDates
    ? buildLinkToDailyNote(stateManager.app, formattedDate)
    : `{${formattedDate}} `;

  const start = { line: ctx.start.line, ch: ctx.start.ch + dateTrigger.length };

  ctx.editor.replaceRange(wrappedDate, start, ctx.end);
  ctx.editor.setCursor({
    line: start.line,
    ch: start.ch + wrappedDate.length,
  });
  ctx.editor.focus();
}

export function constructDatePicker(
  ctx: EditorSuggestContext,
  stateManager: StateManager,
  div: HTMLElement,
  cb: (picker: Instance) => void
) {
  div.createEl('input', { type: 'text' }, (input) => {
    div.win.setTimeout(() =>
      cb(
        flatpickr(input, {
          win: input.win,
          now: new Date(),
          inline: true,
          locale: getDefaultLocale(stateManager),
          onChange: (dates) => applyDate(ctx, stateManager, dates[0]),
        })
      )
    );
  });
}

export function toPreviousMonth(date: Moment) {
  const initialMonth = date.month();
  const first = date.clone().startOf('month').weekday(0);
  const diff = date.diff(first, 'week');

  date.subtract(1, 'month').startOf('month').weekday(6).add(diff, 'week');

  let nextMonth = date.month();

  while (initialMonth === nextMonth) {
    date.subtract(1, 'week');
    nextMonth = date.month();
  }

  return date;
}

export function toNextMonth(date: Moment) {
  const initialMonth = date.month();
  const first = date.clone().startOf('month').weekday(6);
  const diff = date.diff(first, 'week');

  date.add(1, 'month').startOf('month').weekday(0).add(diff, 'week');

  let nextMonth = date.month();

  while (initialMonth === nextMonth) {
    date.add(1, 'week');
    nextMonth = date.month();
  }

  return date;
}
