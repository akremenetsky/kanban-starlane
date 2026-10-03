import { moment, setIcon } from 'obsidian';
import { getDefaultLocale } from 'src/components/Editor/datePickerLocale';
import flatpickr from 'src/components/Editor/flatpickr';
import { Instance } from 'src/components/Editor/flatpickr/types/instance';
import { c } from 'src/components/helpers';
import { Path } from 'src/dnd/types';
import { buildLinkToDailyNote } from 'src/integrations/dailyNotes';
import { Item } from 'src/model/types';
import { escapeRegExpStr } from 'src/shared/util';
import { StateManager } from 'src/state/StateManager';
import { BoardModifiers } from 'src/state/boardModifiers';

export function constructDatePicker(
  win: Window,
  stateManager: StateManager,
  coordinates: { x: number; y: number },
  onChange: (dates: Date[]) => void,
  date?: Date
) {
  return win.document.body.createDiv(
    { cls: `${c('date-picker')} ${c('ignore-click-outside')}` },
    (div) => {
      div.style.left = `${coordinates.x || 0}px`;
      div.style.top = `${coordinates.y || 0}px`;

      div.createEl('input', { type: 'text' }, (input) => {
        div.win.setTimeout(() => {
          let picker: Instance | null = null;

          const clickHandler = (e: MouseEvent) => {
            if (
              e.target instanceof (e.view as Window & typeof window).HTMLElement &&
              e.target.closest(`.${c('date-picker')}`) === null
            ) {
              selfDestruct();
            }
          };

          const keyHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              selfDestruct();
            }
          };

          const selfDestruct = () => {
            picker.destroy();
            div.remove();
            win.document.body.removeEventListener('click', clickHandler);
            win.document.removeEventListener('keydown', keyHandler);
          };

          picker = flatpickr(input, {
            locale: getDefaultLocale(stateManager),
            defaultDate: date,
            inline: true,
            onChange: (dates) => {
              onChange(dates);
              selfDestruct();
            },
            win,
          });

          div.win.setTimeout(() => {
            const height = div.clientHeight;
            const width = div.clientWidth;

            if (coordinates.y + height > win.innerHeight) {
              div.style.top = `${(coordinates.y || 0) - height}px`;
            }

            if (coordinates.x + width > win.innerWidth) {
              div.style.left = `${(coordinates.x || 0) - width}px`;
            }
          });

          win.document.body.addEventListener('click', clickHandler);
          win.document.addEventListener('keydown', keyHandler);
        });
      });
    }
  );
}

export function constructMenuDatePickerOnChange({
  stateManager,
  boardModifiers,
  item,
  hasDate,
  path,
}: ConstructMenuDatePickerOnChangeParams) {
  const dateFormat = stateManager.getSetting('date-format');
  const shouldLinkDates = stateManager.getSetting('link-date-to-daily-note');
  const dateTrigger = stateManager.getSetting('date-trigger');
  const contentMatch = shouldLinkDates
    ? '(?:\\[[^\\]]+\\]\\([^)]+\\)|\\[\\[[^\\]]+\\]\\])'
    : '{[^}]+}';
  const dateRegEx = new RegExp(`(^|\\s)${escapeRegExpStr(dateTrigger)}${contentMatch}`);

  return (dates: Date[]) => {
    const date = dates[0];
    const formattedDate = moment(date).format(dateFormat);
    const wrappedDate = shouldLinkDates
      ? buildLinkToDailyNote(stateManager.app, formattedDate)
      : `{${formattedDate}}`;

    let titleRaw = item.data.titleRaw;

    if (hasDate) {
      titleRaw = item.data.titleRaw.replace(dateRegEx, `$1${dateTrigger}${wrappedDate}`);
    } else {
      titleRaw = `${item.data.titleRaw} ${dateTrigger}${wrappedDate}`;
    }

    boardModifiers.updateItem(path, stateManager.updateItemContent(item, titleRaw));
  };
}

export function buildTimeArray(stateManager: StateManager) {
  const format = stateManager.getSetting('time-format');
  const time: string[] = [];

  for (let i = 0; i < 24; i++) {
    time.push(moment({ hour: i }).format(format));
    time.push(moment({ hour: i, minute: 15 }).format(format));
    time.push(moment({ hour: i, minute: 30 }).format(format));
    time.push(moment({ hour: i, minute: 45 }).format(format));
  }

  return time;
}

export function constructTimePicker(
  win: Window,
  stateManager: StateManager,
  coordinates: { x: number; y: number },
  onSelect: (opt: string) => void,
  time?: moment.Moment
) {
  const pickerClassName = c('time-picker');
  const timeFormat = stateManager.getSetting('time-format');
  const selected = time?.format(timeFormat);

  win.document.body.createDiv({ cls: `${pickerClassName} ${c('ignore-click-outside')}` }, (div) => {
    const options = buildTimeArray(stateManager);

    const clickHandler = (e: MouseEvent) => {
      if (
        e.target instanceof (e.view as Window & typeof window).HTMLElement &&
        e.target.hasClass(c('time-picker-item')) &&
        e.target.dataset.value
      ) {
        onSelect(e.target.dataset.value);
        selfDestruct();
      }
    };

    const clickOutsideHandler = (e: MouseEvent) => {
      if (
        e.target instanceof (e.view as Window & typeof window).HTMLElement &&
        e.target.closest(`.${pickerClassName}`) === null
      ) {
        selfDestruct();
      }
    };

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selfDestruct();
      }
    };

    const selfDestruct = () => {
      div.remove();
      div.removeEventListener('click', clickHandler);
      win.document.body.removeEventListener('click', clickOutsideHandler);
      win.document.removeEventListener('keydown', escHandler);
    };

    div.style.left = `${coordinates.x || 0}px`;
    div.style.top = `${coordinates.y || 0}px`;

    let selectedItem: HTMLDivElement = null;
    let middleItem: HTMLDivElement = null;

    options.forEach((opt, index) => {
      const isSelected = opt === selected;
      div.createDiv(
        {
          cls: `${c('time-picker-item')} ${isSelected ? 'is-selected' : ''}`,
          text: opt,
        },
        (item) => {
          item.createSpan({ cls: c('time-picker-check'), prepend: true }, (span) => {
            setIcon(span, 'lucide-check');
          });

          if (index % 4 === 0) {
            item.addClass('is-hour');
          }

          item.dataset.value = opt;

          if (isSelected) selectedItem = item;
          if (index === Math.floor(options.length / 2)) {
            middleItem = item;
          }
        }
      );
    });

    div.win.setTimeout(() => {
      const height = div.clientHeight;
      const width = div.clientWidth;

      if (coordinates.y + height > win.innerHeight) {
        div.style.top = `${(coordinates.y || 0) - height}px`;
      }

      if (coordinates.x + width > win.innerWidth) {
        div.style.left = `${(coordinates.x || 0) - width}px`;
      }

      (selectedItem || middleItem)?.scrollIntoView({
        block: 'center',
        inline: 'nearest',
      });

      div.addEventListener('click', clickHandler);
      win.document.body.addEventListener('click', clickOutsideHandler);
      win.document.addEventListener('keydown', escHandler);
    });
  });
}

export function constructMenuTimePickerOnChange({
  stateManager,
  boardModifiers,
  item,
  hasTime,
  path,
}: ConstructMenuTimePickerOnChangeParams) {
  const timeTrigger = stateManager.getSetting('time-trigger');
  const timeRegEx = new RegExp(`(^|\\s)${escapeRegExpStr(timeTrigger)}{([^}]+)}`);

  return (time: string) => {
    let titleRaw = item.data.titleRaw;

    if (hasTime) {
      titleRaw = item.data.titleRaw.replace(timeRegEx, `$1${timeTrigger}{${time}}`);
    } else {
      titleRaw = `${item.data.titleRaw} ${timeTrigger}{${time}}`;
    }

    boardModifiers.updateItem(path, stateManager.updateItemContent(item, titleRaw));
  };
}

interface ConstructMenuDatePickerOnChangeParams {
  stateManager: StateManager;
  boardModifiers: BoardModifiers;
  item: Item;
  hasDate: boolean;
  path: Path;
}

interface ConstructMenuTimePickerOnChangeParams {
  stateManager: StateManager;
  boardModifiers: BoardModifiers;
  item: Item;
  hasTime: boolean;
  path: Path;
}
