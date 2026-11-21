import classcat from 'classcat';
import { useContext } from 'preact/compat';
import { Icon } from 'src/components/Icon/Icon';
import { KanbanContext } from 'src/components/context';
import { c } from 'src/components/helpers';
import { t } from 'src/lang/helpers';
import { EPIC_COLORS, Item } from 'src/model/types';
import { sanitizeSizeWeights } from 'src/settings/defaults';
import { StateManager } from 'src/state/StateManager';
import { BoardModifiers } from 'src/state/boardModifiers';
import {
  EpicProgress,
  ResolvedEpic,
  epicOfCard,
  epicOfMember,
  epicProgress,
  epicSizes,
  isMemberDone,
} from 'src/state/cardEpics';

import { plainCardTitle, revealCard } from '../cardPicker';
import { epicColorLabel, epicColorValue, pickEpic, pickEpicMember } from '../epicActions';
import { CardChip, ChipSource } from './chips';
import { useBoardSelector } from './useBoardSelector';

/** Two resolutions of an epic show the same thing. */
export function sameEpic(a: ResolvedEpic | undefined, b: ResolvedEpic | undefined): boolean {
  if (!a || !b) return a === b;
  return (
    a.id === b.id &&
    a.item === b.item &&
    a.color === b.color &&
    a.archived === b.archived &&
    a.members.length === b.members.length &&
    a.members.every((m, i) => m.item === b.members[i].item && m.archived === b.members[i].archived)
  );
}

interface CardEpics {
  /** The epic this card is. */
  own?: ResolvedEpic;
  /** The epic this card belongs to. */
  parent?: ResolvedEpic;
}

function sameCardEpics(a: CardEpics, b: CardEpics) {
  return sameEpic(a.own, b.own) && sameEpic(a.parent, b.parent);
}

/** The epics of a card, kept up to date with the whole board. */
export function useCardEpics(stateManager: StateManager, item: Item): CardEpics {
  return useBoardSelector(
    stateManager,
    (board) =>
      board.data.epics ? { own: epicOfCard(board, item), parent: epicOfMember(board, item) } : {},
    sameCardEpics
  );
}

/** `3 / 5` and, when members have sizes, `· 8 / 13` by weight. */
function progressText(p: EpicProgress, withWeight: boolean) {
  const cards = `${p.done} / ${p.total}`;
  return withWeight && p.weightTotal ? `${cards} · ${p.weightDone} / ${p.weightTotal}` : cards;
}

function progressLines(p: EpicProgress, withWeight: boolean): string[] {
  const lines = [`${t('Cards done')}: ${p.done} / ${p.total}`];
  if (!withWeight || !p.weightTotal) return lines;
  lines.push(`${t('Weight done')}: ${p.weightDone} / ${p.weightTotal}`);
  for (const size of epicSizes(p)) {
    const { done, total } = p.bySize[size] ?? { done: 0, total: 0 };
    lines.push(`${size}: ${done} / ${total}`);
  }
  return lines;
}

function ProgressBar({ progress }: { progress: EpicProgress }) {
  const ratio = progress.total ? progress.done / progress.total : 0;
  return (
    <span className={c('epic-bar')}>
      <span
        className={c('epic-bar-fill')}
        style={{ [`--${c('epic-progress')}`]: `${Math.round(ratio * 100)}%` }}
      />
    </span>
  );
}

interface PopoverProps {
  epic: ResolvedEpic;
  stateManager: StateManager;
  boardModifiers: BoardModifiers;
  container: HTMLElement;
  close: () => void;
}

/** The epic's progress and cards, its colour and removing it; opened from the epic card. */
function EpicPopover({
  epic,
  progress,
  withWeight,
  stateManager,
  boardModifiers,
  container,
  close,
}: PopoverProps & { progress: EpicProgress; withWeight: boolean }) {
  return (
    <div className={c('epic')}>
      <div className={c('epic-summary')}>
        {progressLines(progress, withWeight).map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      {epic.members.length > 0 && (
        <div className={c('epic-members')}>
          {epic.members.map((m) => (
            <div key={m.item.id} className={c('relation')} data-done={isMemberDone(m) || undefined}>
              <Icon name={isMemberDone(m) ? 'lucide-check-circle-2' : 'lucide-circle'} />
              <button
                type="button"
                className={c('relation-card')}
                disabled={m.archived}
                onClick={() => {
                  close();
                  revealCard(container, m.item);
                }}
              >
                {plainCardTitle(m.item)}
              </button>
              {m.archived && <span className={c('relation-note')}>{t('in archive')}</span>}
              <button
                type="button"
                className={`${c('relation-remove')} clickable-icon`}
                aria-label={t('Remove from epic')}
                onClick={() => boardModifiers.removeFromEpic(m.item)}
              >
                <Icon name="lucide-x" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className={c('relations-add')}
        onClick={() => {
          close();
          pickEpicMember(stateManager, boardModifiers, epic.item);
        }}
      >
        <Icon name="lucide-plus" />
        <span>{t('Add cards to epic')}</span>
      </button>
      <div className={c('epic-colors')} role="radiogroup" aria-label={t('Epic colour')}>
        {EPIC_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={color === epic.color}
            aria-label={epicColorLabel(color)}
            data-color={color}
            className={classcat([c('epic-color'), { 'is-active': color === epic.color }])}
            style={{ [`--${c('chip-color')}`]: epicColorValue(color) }}
            onClick={() => boardModifiers.setEpicColor(epic.item, color)}
          />
        ))}
      </div>
      <button
        type="button"
        className={c('relations-add')}
        onClick={() => {
          close();
          boardModifiers.unmarkEpic(epic.item);
        }}
      >
        <Icon name="lucide-x" />
        <span>{t('Remove epic')}</span>
      </button>
    </div>
  );
}

/** The card's epic with a link to it; opened from a member card. */
function MemberPopover({
  epic,
  item,
  progress,
  withWeight,
  stateManager,
  boardModifiers,
  container,
  close,
}: PopoverProps & { item: Item; progress: EpicProgress; withWeight: boolean }) {
  return (
    <div className={c('epic')}>
      <button
        type="button"
        className={`${c('relation-card')} ${c('epic-title')}`}
        style={{ [`--${c('chip-color')}`]: epicColorValue(epic.color) }}
        disabled={epic.archived}
        onClick={() => {
          close();
          revealCard(container, epic.item);
        }}
      >
        {plainCardTitle(epic.item)}
      </button>
      {epic.archived && <span className={c('relation-note')}>{t('in archive')}</span>}
      <div className={c('epic-summary')}>{progressText(progress, withWeight)}</div>
      <button
        type="button"
        className={c('relations-add')}
        onClick={() => {
          close();
          pickEpic(stateManager, boardModifiers, item);
        }}
      >
        <Icon name="lucide-folder-input" />
        <span>{t('Move to another epic')}</span>
      </button>
      <button
        type="button"
        className={c('relations-add')}
        onClick={() => {
          close();
          boardModifiers.removeFromEpic(item);
        }}
      >
        <Icon name="lucide-folder-output" />
        <span>{t('Remove from epic')}</span>
      </button>
    </div>
  );
}

/**
 * Epics on the card. A member shows its epic's name in the header. The epic card is marked
 * in its header and shows the progress of its cards in the footer. Both open a popover.
 */
export const useEpicChips: ChipSource = (item, stateManager) => {
  const show = stateManager.useSetting('show-card-epics');
  const withWeight = stateManager.useSetting('show-card-size') !== false;
  const weights = sanitizeSizeWeights(stateManager.useSetting('size-weights'));
  const { boardModifiers, view } = useContext(KanbanContext);
  const { own, parent } = useCardEpics(stateManager, item);

  if (!show) return [];
  const base = { stateManager, boardModifiers, container: view.contentEl };

  if (own) {
    const progress = epicProgress(own, weights);
    const color = epicColorValue(own.color);
    const popover = (close: () => void) => (
      <EpicPopover {...base} epic={own} progress={progress} withWeight={withWeight} close={close} />
    );
    return [
      {
        id: 'epic-card',
        zone: 'header',
        order: 10,
        icon: 'lucide-layers',
        label: t('Epic'),
        color,
        tooltip: t('Epic'),
        popover,
      },
      {
        id: 'epic-progress',
        zone: 'footer',
        order: 40,
        icon: 'lucide-list-checks',
        content: (
          <>
            <ProgressBar progress={progress} />
            <span className={c('item-chip-label')}>{progressText(progress, withWeight)}</span>
          </>
        ),
        tooltip: progressLines(progress, withWeight).join('\n'),
        popover,
      },
    ];
  }

  if (parent) {
    const progress = epicProgress(parent, weights);
    const title = plainCardTitle(parent.item);
    const chip: CardChip = {
      id: 'epic',
      zone: 'header',
      order: 10,
      content: (
        <>
          <span className={c('epic-dot')} />
          <span className={c('item-chip-label')}>{title}</span>
        </>
      ),
      color: epicColorValue(parent.color),
      tooltip: `${t('Epic')}: ${title}`,
      popover: (close) => (
        <MemberPopover
          {...base}
          epic={parent}
          item={item}
          progress={progress}
          withWeight={withWeight}
          close={close}
        />
      ),
    };
    return [chip];
  }

  return [];
};
