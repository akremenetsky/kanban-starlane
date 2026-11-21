import { App, FuzzyMatch, FuzzySuggestModal, Notice } from 'obsidian';
import { c } from 'src/components/helpers';
import { getParentWindow } from 'src/dnd/util/getWindow';
import { t } from 'src/lang/helpers';
import { Item } from 'src/model/types';
import { Placement } from 'src/state/cardHistory';

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

/** Lets the user pick a card of the board from `cards`; the texts default to "another card". */
export class CardPickerModal extends FuzzySuggestModal<Placement> {
  constructor(
    app: App,
    private cards: Placement[],
    private onPick: (item: Item) => void,
    texts: { placeholder?: string; empty?: string } = {}
  ) {
    super(app);
    this.setPlaceholder(texts.placeholder ?? t('Choose a card'));
    this.emptyStateText = texts.empty ?? t('No other cards on this board');
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
