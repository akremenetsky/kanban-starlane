import classcat from 'classcat';
import { useCallback, useState } from 'preact/compat';
import { Icon } from 'src/components/Icon/Icon';
import { c } from 'src/components/helpers';

import { ChipPopover } from './ChipPopover';
import { CardChip, CardZone } from './chips';

function Chip({ chip }: { chip: CardChip }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);

  const className = classcat([
    c('item-chip'),
    {
      [c('item-chip-danger')]: chip.tone === 'danger',
      [c('item-chip-accent')]: chip.tone === 'accent',
      [c('item-chip-end')]: !!chip.end,
    },
  ]);
  const style = chip.color ? { [`--${c('chip-color')}`]: chip.color } : undefined;
  const content = (
    <>
      {chip.icon && <Icon name={chip.icon} />}
      <span className={c('item-chip-label')}>{chip.label}</span>
    </>
  );

  if (!chip.popover) {
    return (
      <span className={className} style={style} data-chip={chip.id} aria-label={chip.tooltip}>
        {content}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`${className} ${c('item-chip-button')}`}
        style={style}
        data-chip={chip.id}
        data-ignore-drag={true}
        aria-label={chip.tooltip}
        aria-expanded={!!anchor}
        // A double click on the card body starts editing; on a chip it is just two clicks.
        onDblClick={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(anchor ? null : e.currentTarget);
        }}
      >
        {content}
      </button>
      {anchor && (
        <ChipPopover anchor={anchor} onClose={close}>
          {chip.popover(close)}
        </ChipPopover>
      )}
    </>
  );
}

/** One line of chips; renders nothing when empty, so a card without data looks as before. */
export function CardZoneRow({ zone, chips }: { zone: CardZone; chips: CardChip[] }) {
  if (!chips.length) return null;

  return (
    <div className={c(`item-${zone}`)}>
      {chips.map((chip) => (
        <Chip key={chip.id} chip={chip} />
      ))}
    </div>
  );
}
