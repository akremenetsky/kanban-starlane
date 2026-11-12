import { useCallback, useContext, useState } from 'preact/compat';
import { Icon } from 'src/components/Icon/Icon';
import { ChipPopover } from 'src/components/Item/zones/ChipPopover';
import { KanbanContext } from 'src/components/context';
import { c } from 'src/components/helpers';
import { t } from 'src/lang/helpers';
import { CARD_SIZES, Item } from 'src/model/types';
import { sanitizeSizeWeights } from 'src/settings/defaults';
import { sizeTotal } from 'src/state/cardSize';

/** The sum of the lane's card sizes; the tooltip says how it adds up. */
export function LaneSizeTotal({ items }: { items: Item[] }) {
  const { stateManager } = useContext(KanbanContext);
  const show = stateManager.useSetting('show-card-size');
  const weights = sanitizeSizeWeights(stateManager.useSetting('size-weights'));
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);

  const summary = show ? sizeTotal(items, weights) : null;
  if (!summary) return null;

  const lines = CARD_SIZES.filter((size) => summary.counts[size]).map(
    (size) => `${size} × ${summary.counts[size]} = ${weights[size] * summary.counts[size]}`
  );
  const scale = CARD_SIZES.map((size) => `${size} ${weights[size]}`).join(' · ');
  const tooltip = [`${t('Total size')}: ${summary.total}`, ...lines, '', scale].join('\n');

  return (
    <>
      <button
        type="button"
        className={c('lane-size-total')}
        aria-label={tooltip}
        data-tooltip-position="top"
        aria-expanded={!!anchor}
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
      >
        <Icon name="lucide-gauge" />
        {summary.total}
      </button>
      {anchor && (
        // A click works on phones too, where there is no tooltip.
        <ChipPopover anchor={anchor} onClose={close}>
          <div className={c('lane-size-breakdown')}>
            <b>
              {t('Total size')}: {summary.total}
            </b>
            {lines.map((line) => (
              <div key={line}>{line}</div>
            ))}
            <div className={c('lane-size-scale')}>{scale}</div>
          </div>
        </ChipPopover>
      )}
    </>
  );
}
