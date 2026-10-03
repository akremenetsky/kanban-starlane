import { Modal } from 'obsidian';
import { c } from 'src/components/helpers';
import { t } from 'src/lang/helpers';
import { CardEvent, Item } from 'src/model/types';
import { moment } from 'src/shared/moment';
import { StateManager } from 'src/state/StateManager';
import { enteredLaneEvent, getCardHistory } from 'src/state/cardHistory';

const quoted = (title?: string) => `«${title ?? ''}»`;
const boardName = (path: string) => path.split('/').pop().replace(/\.md$/, '');

/** One line of text for an event. */
export function describeCardEvent(event: CardEvent): string {
  switch (event.type) {
    case 'created':
      return `${t('Created in list')} ${quoted(event.lane)}`;
    case 'edited':
      return t('Edited');
    case 'moved': {
      const lanes = `${quoted(event.from)} → ${quoted(event.to)}`;
      return event.board
        ? `${t('Moved from board')} ${quoted(boardName(event.board))}: ${lanes}`
        : `${t('Moved')}: ${lanes}`;
    }
    case 'checked':
      return event.mark === 'x' || event.mark === 'X'
        ? t('Marked as done')
        : `${t('Status changed')}: [${event.mark}]`;
    case 'unchecked':
      return t('Marked as not done');
    case 'archived':
      return `${t('Archived from list')} ${quoted(event.lane)}`;
    case 'restored':
      return `${t('Restored from archive to list')} ${quoted(event.lane)}`;
    default:
      return String(event.type);
  }
}

/** Shows what happened to a card (card menu → History). */
export class CardHistoryModal extends Modal {
  constructor(
    private stateManager: StateManager,
    private item: Item,
    /** Title of the card's lane, or undefined for an archived card. */
    private laneTitle?: string
  ) {
    super(stateManager.app);
  }

  onOpen() {
    const { contentEl, stateManager } = this;
    const events = getCardHistory(stateManager.state, this.item);
    const format = stateManager.getSetting('date-time-display-format');
    const formatAt = (at: string) => moment(at).format(format);

    this.modalEl.addClass(c('card-history-modal'));
    this.titleEl.setText(t('Card history'));

    if (this.laneTitle !== undefined) {
      const entered = enteredLaneEvent(events);
      const since = entered
        ? `${t('since')} ${formatAt(entered.at)} (${moment
            .duration(moment().diff(moment(entered.at)))
            .humanize()})`
        : t('since an unknown time');
      contentEl.createDiv({
        cls: c('card-history-summary'),
        text: `${t('List')} ${quoted(this.laneTitle)} ${since}`,
      });
    }

    if (!events.length) {
      contentEl.createDiv({
        cls: c('card-history-empty'),
        text: t('No history has been recorded for this card yet.'),
      });
      return;
    }

    const list = contentEl.createDiv({ cls: c('card-history') });
    for (const event of [...events].reverse()) {
      const row = list.createDiv({ cls: c('card-history-event') });
      row.createSpan({ cls: c('card-history-time'), text: formatAt(event.at) });
      row.createSpan({ cls: c('card-history-text'), text: describeCardEvent(event) });
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}
