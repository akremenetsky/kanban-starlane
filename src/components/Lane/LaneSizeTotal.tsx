import { useCallback, useContext, useState } from 'preact/compat';
import { Icon } from 'src/components/Icon/Icon';
import { ChipPopover } from 'src/components/Item/zones/ChipPopover';
import { useBoardSelector } from 'src/components/Item/zones/useBoardSelector';
import { KanbanContext } from 'src/components/context';
import { c } from 'src/components/helpers';
import { LinkedLanesContext } from 'src/components/linkedLanes';
import { t } from 'src/lang/helpers';
import { CARD_SIZES, Item } from 'src/model/types';
import { sanitizeSizeWeights } from 'src/settings/defaults';
import { sizedCards } from 'src/state/cardEpics';
import { sizeTotal } from 'src/state/cardSize';
import { LaneEntry } from 'src/state/linkedLanes';

/** The sum of the lane's card sizes; the tooltip says how it adds up. */
export function LaneSizeTotal({ items, entries }: { items: Item[]; entries?: LaneEntry[] | null }) {
  const { stateManager } = useContext(KanbanContext);
  const { boards } = useContext(LinkedLanesContext);
  const show = stateManager.useSetting('show-card-size');
  const weights = sanitizeSizeWeights(stateManager.useSetting('size-weights'));
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);

  const epics = stateManager.useSetting('show-card-epics');
  // An epic's size would count its cards twice. Epics change without the lane's cards
  // changing, so this follows the board; linked boards re-render the lane when they change.
  const counted = useBoardSelector(
    stateManager,
    (board) => {
      const own = epics === false ? undefined : board;
      const linked = (file: string) => {
        const b = boards.get(file);
        return b && b.stateManager.getSetting('show-card-epics') !== false ? b.board : undefined;
      };
      return sizedCards(
        entries
          ? entries.map(({ item, source }) => ({ item, board: source ? linked(source) : own }))
          : items.map((item) => ({ item, board: own }))
      );
    },
    (a: Item[], b: Item[]) => a.length === b.length && a.every((item, i) => item === b[i])
  );
  const summary = show ? sizeTotal(counted, weights) : null;
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
