import classcat from 'classcat';
import { useContext } from 'preact/compat';
import { KanbanContext } from 'src/components/context';
import { c } from 'src/components/helpers';
import { useNestedEntityPath } from 'src/dnd/components/Droppable';
import { t } from 'src/lang/helpers';
import { CARD_SIZES, CardSize } from 'src/model/types';

import { setItemSize } from '../cardActions';
import { ChipSource } from './chips';

function SizePicker({
  current,
  onPick,
}: {
  current: CardSize;
  onPick: (size: CardSize | null) => void;
}) {
  return (
    <div className={c('size-picker')}>
      {CARD_SIZES.map((size) => (
        <button
          key={size}
          type="button"
          className={classcat([c('size-option'), { 'is-active': size === current }])}
          aria-pressed={size === current}
          onClick={() => onPick(size)}
        >
          {size}
        </button>
      ))}
      <button
        type="button"
        className={`${c('size-option')} clickable-icon`}
        aria-label={t('Remove size')}
        onClick={() => onPick(null)}
      >
        ×
      </button>
    </div>
  );
}

/** The card's size in the footer; clicking it opens the size picker. */
export const useSizeChip: ChipSource = (item, stateManager) => {
  const show = stateManager.useSetting('show-card-size');
  const { boardModifiers } = useContext(KanbanContext);
  const path = useNestedEntityPath();

  const size = item.data.metadata.size;
  if (!show || !size) return [];

  return [
    {
      id: 'size',
      zone: 'footer',
      order: 20,
      icon: 'lucide-gauge',
      label: size,
      tooltip: t('Size'),
      popover: (close) => (
        <SizePicker
          current={size}
          onPick={(next) => {
            close();
            if (next !== size) setItemSize(stateManager, boardModifiers, item, path, next);
          }}
        />
      ),
    },
  ];
};
