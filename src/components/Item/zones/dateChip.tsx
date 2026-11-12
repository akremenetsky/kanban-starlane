import { useContext } from 'preact/compat';
import { KanbanContext } from 'src/components/context';
import { c, useGetDateColorFn } from 'src/components/helpers';
import { t } from 'src/lang/helpers';

import { DateAndTime, getRelativeDate } from '../DateAndTime';
import { useDatePickers } from '../ItemContent';
import { ChipSource } from './chips';

/** The card's date (and relative date) in the footer, unless dates stay in the card text. */
export const useDateChip: ChipSource = (item, stateManager) => {
  const datePosition = stateManager.useSetting('date-position');
  const showRelativeDate = stateManager.useSetting('show-relative-date');
  const getDateColor = useGetDateColorFn(stateManager);
  const { filePath } = useContext(KanbanContext);
  const { onEditDate, onEditTime } = useDatePickers(item);

  const { date, time } = item.data.metadata;
  if (datePosition === 'body' || !(date || time)) return [];

  return [
    {
      id: 'date',
      zone: 'footer',
      order: 10,
      icon: 'lucide-calendar',
      tooltip: t('Date'),
      content: (
        <>
          <DateAndTime
            item={item}
            stateManager={stateManager}
            filePath={filePath ?? ''}
            onEditDate={onEditDate}
            onEditTime={onEditTime}
            getDateColor={getDateColor}
          />
          {showRelativeDate && date && (
            // The old class too: user snippets target it (it was on the line below the text).
            <span className={`${c('item-chip-note')} ${c('item-metadata-date-relative')}`}>
              {getRelativeDate(date, time)}
            </span>
          )}
        </>
      ),
    },
  ];
};
