import { Menu, Notice } from 'obsidian';
import { t } from 'src/lang/helpers';
import { Item } from 'src/model/types';
import { StateManager } from 'src/state/StateManager';
import { BoardModifiers } from 'src/state/boardModifiers';
import { placements } from 'src/state/cardHistory';
import { RELATION_KINDS, RelationKind } from 'src/state/cardRelations';

import { CardPickerModal } from './cardPicker';

/** How a relation reads from the card that shows it. */
export function relationLabel({ type, outgoing }: RelationKind): string {
  switch (type) {
    case 'blocks':
      return outgoing ? t('Blocks') : t('Blocked by');
    case 'relates-to':
      return t('Relates to');
    case 'duplicates':
      return outgoing ? t('Duplicates') : t('Duplicated by');
    case 'causes':
      return outgoing ? t('Causes') : t('Caused by');
    case 'depends-on':
      return outgoing ? t('Depends on') : t('Required for');
  }
}

/** Opens the card picker; the picked card gets the relation `kind` from `item`. */
export function pickRelatedCard(
  stateManager: StateManager,
  boardModifiers: BoardModifiers,
  item: Item,
  kind: RelationKind
) {
  if (stateManager.state.data.relationsRaw !== undefined) {
    new Notice(
      t('The relations of this board cannot be read. Fix the relations block in the file.')
    );
    return;
  }
  const cards = placements(stateManager.state).filter(
    (p) => p.laneIndex >= 0 && p.item.id !== item.id
  );
  new CardPickerModal(stateManager.app, cards, (other) =>
    boardModifiers.addRelation(item, kind, other)
  ).open();
}

/** One menu item per relation kind; each opens the card picker. */
export function addRelationItems(
  menu: Menu,
  stateManager: StateManager,
  boardModifiers: BoardModifiers,
  item: Item
) {
  for (const kind of RELATION_KINDS) {
    menu.addItem((i) =>
      i
        .setTitle(relationLabel(kind))
        .onClick(() => pickRelatedCard(stateManager, boardModifiers, item, kind))
    );
  }
}
