import { isPlainObject } from 'is-plain-object';
import { App, TFile, moment } from 'obsidian';
import { getDataviewApi } from 'src/integrations/dataview';
import { StateManager } from 'src/state/StateManager';

import { PageData } from './types';

export function getDateFromObj(v: any, stateManager: StateManager) {
  let m: moment.Moment;

  if (v.ts) {
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

export function getDate(v: any, app: App) {
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

export function anyToString(v: any, stateManager: StateManager): string {
  if (isPlainObject(v) && v.value) v = v.value;
  const date = getDate(v, stateManager.app);
  if (date) return getDateFromObj(date, stateManager);
  if (typeof v === 'string') return v;
  if (v instanceof TFile) return v.path;
  if (Array.isArray(v)) {
    return v.map((v2) => anyToString(v2, stateManager)).join(' ');
  }
  if (v.rrule) return v.toText();
  const dv = getDataviewApi(stateManager.app);
  if (dv) return dv.value.toString(v);
  return `${v}`;
}

export function pageDataToString(data: PageData, stateManager: StateManager): string {
  return anyToString(data.value, stateManager);
}
