import { App, FuzzyMatch, FuzzySuggestModal, Menu, Notice } from 'obsidian';
import { c } from 'src/components/helpers';
import { getParentWindow } from 'src/dnd/util/getWindow';
import { t } from 'src/lang/helpers';
import { Item } from 'src/model/types';
import { StateManager } from 'src/state/StateManager';
import { BoardModifiers } from 'src/state/boardModifiers';
import { Placement, placements } from 'src/state/cardHistory';
import { RELATION_KINDS, RelationKind } from 'src/state/cardRelations';

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

/** A card's text without markdown syntax, on one line, for lists of cards. */
export function plainCardTitle(item: Item): string {
  return item.data.title
    .replace(/!?\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/!?\[\[([^\]]*)\]\]/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|~~|==|`)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lets the user pick another card of the board (not archived). */
class CardPickerModal extends FuzzySuggestModal<Placement> {
  constructor(
    app: App,
    private cards: Placement[],
    private onPick: (item: Item) => void
  ) {
    super(app);
    this.setPlaceholder(t('Choose a card'));
    this.emptyStateText = t('No other cards on this board');
  }

  getItems() {
    return this.cards;
  }

  getItemText(p: Placement) {
    return plainCardTitle(p.item);
  }

  renderSuggestion(match: FuzzyMatch<Placement>, el: HTMLElement) {
    super.renderSuggestion(match, el);
    if (match.item.laneTitle) {
      el.createDiv({ cls: c('card-picker-lane'), text: match.item.laneTitle });
    }
  }

  onChooseItem(p: Placement) {
    this.onPick(p.item);
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

const FLASH_MS = 1500;

/** Scrolls the board in `container` to the card and flashes it. */
export function revealCard(container: HTMLElement, item: Item) {
  const el = container.querySelector<HTMLElement>(`[data-card-id="${item.id}"]`);
  if (!el) {
    new Notice(t('The card is not shown on the board right now'));
    return;
  }

  el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  el.removeClass(c('item-flash'));
  // Restart the animation when the same card is revealed twice in a row.
  void el.offsetWidth;
  el.addClass(c('item-flash'));
  getParentWindow(el).setTimeout(() => el.removeClass(c('item-flash')), FLASH_MS);
}
