import { Menu } from 'obsidian';
import { useContext, useEffect, useState } from 'preact/compat';
import { Icon } from 'src/components/Icon/Icon';
import { plainCardTitle, revealCard } from 'src/components/Item/cardPicker';
import { KanbanContext } from 'src/components/context';
import { c } from 'src/components/helpers';
import { t } from 'src/lang/helpers';
import { Board, Item } from 'src/model/types';
import { StateManager } from 'src/state/StateManager';
import { BoardModifiers } from 'src/state/boardModifiers';
import { ResolvedRelation, isActiveBlocker, resolveRelations } from 'src/state/cardRelations';

import { addRelationItems, relationLabel } from '../relationActions';
import { ChipSource } from './chips';

function sameRelations(a: ResolvedRelation[], b: ResolvedRelation[]) {
  return (
    a.length === b.length &&
    a.every(
      (r, i) =>
        r.relation === b[i].relation &&
        r.outgoing === b[i].outgoing &&
        r.other === b[i].other &&
        r.archived === b[i].archived
    )
  );
}

/**
 * The card's relations, kept up to date with the whole board: a relation added on another
 * card, or a blocker checked, changes this card's chips although this card did not change.
 */
function useCardRelations(stateManager: StateManager, item: Item): ResolvedRelation[] {
  const [relations, setRelations] = useState(() => resolveRelations(stateManager.state, item));

  useEffect(() => {
    const receiver = (board: Board) =>
      setRelations((prev) => {
        const next = resolveRelations(board, item);
        return sameRelations(prev, next) ? prev : next;
      });
    stateManager.stateReceivers.push(receiver);
    receiver(stateManager.state);
    return () => {
      stateManager.stateReceivers.remove(receiver);
    };
  }, [stateManager, item]);

  return relations;
}

interface RelationsPopoverProps {
  item: Item;
  relations: ResolvedRelation[];
  stateManager: StateManager;
  boardModifiers: BoardModifiers;
  container: HTMLElement;
  close: () => void;
}

/** The card's relations grouped by kind; a click on a card scrolls the board to it. */
function RelationsPopover({
  item,
  relations,
  stateManager,
  boardModifiers,
  container,
  close,
}: RelationsPopoverProps) {
  const groups = new Map<string, ResolvedRelation[]>();
  for (const r of relations) {
    const label = relationLabel(r);
    groups.set(label, [...(groups.get(label) ?? []), r]);
  }

  return (
    <div className={c('relations')}>
      {[...groups].map(([label, list]) => (
        <div key={label} className={c('relations-group')}>
          <div className={c('relations-label')}>{label}</div>
          {list.map((r) => (
            <div
              key={`${r.owner}:${r.relation.type}:${r.relation.card}`}
              className={c('relation')}
              data-blocking={isActiveBlocker(r) || undefined}
            >
              <button
                type="button"
                className={c('relation-card')}
                disabled={r.archived}
                onClick={() => {
                  close();
                  revealCard(container, r.other);
                }}
              >
                {plainCardTitle(r.other)}
              </button>
              {r.archived && <span className={c('relation-note')}>{t('in archive')}</span>}
              <button
                type="button"
                className={`${c('relation-remove')} clickable-icon`}
                aria-label={t('Remove relation')}
                onClick={() => boardModifiers.removeRelation(r.owner, r.relation)}
              >
                <Icon name="lucide-x" />
              </button>
            </div>
          ))}
        </div>
      ))}
      <button
        type="button"
        className={c('relations-add')}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          close();
          const menu = new Menu();
          addRelationItems(menu, stateManager, boardModifiers, item);
          menu.showAtPosition({ x: rect.left, y: rect.bottom });
        }}
      >
        <Icon name="lucide-plus" />
        <span>{t('Add relation')}</span>
      </button>
    </div>
  );
}

/**
 * Relations on the card: a "Blocked" chip in the header while an open card blocks it, and
 * the number of relations in the footer. Both open the relations popover.
 */
export const useRelationChips: ChipSource = (item, stateManager) => {
  const show = stateManager.useSetting('show-card-relations');
  const { boardModifiers, view } = useContext(KanbanContext);
  const relations = useCardRelations(stateManager, item);

  if (!show || !relations.length) return [];

  const popover = (close: () => void) => (
    <RelationsPopover
      item={item}
      relations={relations}
      stateManager={stateManager}
      boardModifiers={boardModifiers}
      container={view.contentEl}
      close={close}
    />
  );

  const blockers = relations.filter(isActiveBlocker);
  const chips: ReturnType<ChipSource> = [
    {
      id: 'relations',
      zone: 'footer',
      order: 30,
      icon: 'lucide-link-2',
      label: String(relations.length),
      tooltip: t('Relations'),
      popover,
    },
  ];

  if (blockers.length) {
    chips.push({
      id: 'blocked',
      zone: 'header',
      order: 20,
      icon: 'lucide-lock',
      label: t('Blocked'),
      tone: 'danger',
      tooltip: `${t('Blocked by')}: ${blockers.map((r) => plainCardTitle(r.other)).join(', ')}`,
      popover,
    });
  }

  return chips;
};
