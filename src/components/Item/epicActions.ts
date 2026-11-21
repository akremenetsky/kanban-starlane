import { Menu, Notice } from 'obsidian';
import { Path } from 'src/dnd/types';
import { t } from 'src/lang/helpers';
import { EpicColor, Item } from 'src/model/types';
import { StateManager } from 'src/state/StateManager';
import { BoardModifiers } from 'src/state/boardModifiers';
import { boardEpics, epicOfCard, epicOfMember } from 'src/state/cardEpics';
import { placements } from 'src/state/cardHistory';

import { CardPickerModal } from './cardPicker';

/** The theme colour of an epic colour name. */
export function epicColorValue(color: EpicColor): string {
  return `var(--color-${color})`;
}

export function epicColorLabel(color: EpicColor): string {
  switch (color) {
    case 'blue':
      return t('Blue');
    case 'green':
      return t('Green');
    case 'orange':
      return t('Orange');
    case 'purple':
      return t('Purple');
    case 'red':
      return t('Red');
    case 'cyan':
      return t('Cyan');
    case 'yellow':
      return t('Yellow');
    case 'pink':
      return t('Pink');
  }
}

/** False (with a notice) when the epics block of the file could not be read. */
function canEditEpics(stateManager: StateManager): boolean {
  if (stateManager.state.data.epicsRaw === undefined) return true;
  new Notice(t('The epics of this board cannot be read. Fix the epics block in the file.'));
  return false;
}

/** Opens the card picker; the picked card joins the epic `epic`. */
export function pickEpicMember(
  stateManager: StateManager,
  boardModifiers: BoardModifiers,
  epic: Item
) {
  if (!canEditEpics(stateManager)) return;
  const board = stateManager.state;
  const own = epicOfCard(board, epic);
  const inEpic = new Set(own?.members.map((m) => m.item.id));
  const cards = placements(board).filter(
    (p) =>
      p.laneIndex >= 0 &&
      p.item.id !== epic.id &&
      !inEpic.has(p.item.id) &&
      !epicOfCard(board, p.item)
  );
  new CardPickerModal(stateManager.app, cards, (member) =>
    boardModifiers.addToEpic(epic, member)
  ).open();
}

/** Opens a picker of the board's epics; the card joins the picked one. */
export function pickEpic(stateManager: StateManager, boardModifiers: BoardModifiers, item: Item) {
  if (!canEditEpics(stateManager)) return;
  const board = stateManager.state;
  const current = epicOfMember(board, item)?.id;
  const ids = new Set(
    boardEpics(board)
      .filter((e) => e.id !== current && !e.archived)
      .map((e) => e.item.id)
  );
  const epics = placements(board).filter((p) => ids.has(p.item.id));
  new CardPickerModal(stateManager.app, epics, (epic) => boardModifiers.addToEpic(epic, item), {
    placeholder: t('Choose an epic'),
    empty: t('No other epics on this board'),
  }).open();
}

/**
 * The epic actions that fit the card: an epic gets *Add cards* and *Remove epic*, another card
 * *Make epic*, *Add to epic* and, in an epic, *Remove from epic*.
 */
export function addEpicItems(
  menu: Menu,
  stateManager: StateManager,
  boardModifiers: BoardModifiers,
  item: Item,
  path: Path
) {
  const board = stateManager.state;

  if (epicOfCard(board, item)) {
    menu.addItem((i) =>
      i
        .setIcon('lucide-plus')
        .setTitle(t('Add cards to epic'))
        .onClick(() => pickEpicMember(stateManager, boardModifiers, item))
    );
    menu.addItem((i) =>
      i
        .setIcon('lucide-x')
        .setTitle(t('Remove epic'))
        .onClick(() => canEditEpics(stateManager) && boardModifiers.unmarkEpic(item))
    );
    return;
  }

  menu.addItem((i) =>
    i
      .setIcon('lucide-layers')
      .setTitle(t('Make epic'))
      .onClick(() => canEditEpics(stateManager) && boardModifiers.markEpic(path, item))
  );
  if (boardEpics(board).some((e) => !e.archived)) {
    menu.addItem((i) =>
      i
        .setIcon('lucide-folder-input')
        .setTitle(t('Add to epic'))
        .onClick(() => pickEpic(stateManager, boardModifiers, item))
    );
  }
  if (epicOfMember(board, item)) {
    menu.addItem((i) =>
      i
        .setIcon('lucide-folder-output')
        .setTitle(t('Remove from epic'))
        .onClick(() => canEditEpics(stateManager) && boardModifiers.removeFromEpic(item))
    );
  }
}
