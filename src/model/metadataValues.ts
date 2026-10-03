import { App, TFile } from 'obsidian';
import { getDataviewApi } from 'src/integrations/dataview';
import { Moment, moment } from 'src/shared/moment';
import { isPlainObject } from 'src/shared/util';
import { StateManager } from 'src/state/StateManager';

import { PageData } from './types';

/** A Luxon DateTime from Dataview (or anything with a timestamp). */
export function hasTimestamp(v: unknown): v is { ts: number } {
  return typeof v === 'object' && v !== null && 'ts' in v && !!v.ts;
}

/** An rrule RRule (recurrence), which describes itself with `toText`. */
function isRecurrence(v: unknown): v is { rrule: unknown; toText(): string } {
  return typeof v === 'object' && v !== null && 'rrule' in v && !!v.rrule && 'toText' in v;
}

export function getDateFromObj(v: unknown, stateManager: StateManager) {
  let m: Moment;

  if (hasTimestamp(v)) {
    m = moment(v.ts);
  } else if (moment.isMoment(v)) {
    m = v;
  } else if (v instanceof Date) {
    m = moment(v);
  }

  if (m) {
    const dateFormat = stateManager.getSetting(
      m.hours() === 0 ? 'date-display-format' : 'date-time-display-format'
    );

    return m.format(dateFormat);
  }

  return null;
}

export function getDate(v: unknown, app: App) {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = moment(v);
    if (d.isValid()) {
      return d;
    }
  }
  if (moment.isMoment(v)) return v;
  if (v instanceof Date) return moment(v);
  const dv = getDataviewApi(app);
  if (dv?.value.isDate(v)) return moment(v.ts);
  return null;
}

export function anyToString(v: unknown, stateManager: StateManager): string {
  if (isPlainObject(v) && v.value) v = v.value;
  const date = getDate(v, stateManager.app);
  if (date) return getDateFromObj(date, stateManager);
  if (typeof v === 'string') return v;
  if (v instanceof TFile) return v.path;
  if (Array.isArray(v)) {
    return v.map((v2) => anyToString(v2, stateManager)).join(' ');
  }
  if (isRecurrence(v)) return v.toText();
  const dv = getDataviewApi(stateManager.app);
  if (dv) return dv.value.toString(v);
  return `${v}`;
}

export function pageDataToString(data: PageData, stateManager: StateManager): string {
  return anyToString(data.value, stateManager);
}
