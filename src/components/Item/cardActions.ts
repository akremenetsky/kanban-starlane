import update from 'immutability-helper';
import { Menu, TFolder } from 'obsidian';
import { Path } from 'src/dnd/types';
import { moveEntity } from 'src/dnd/util/data';
import { getTaskStatusDone, toggleTask } from 'src/integrations/tasks';
import { applyTemplate } from 'src/integrations/templates';
import { Item } from 'src/model/types';
import { StateManager } from 'src/state/StateManager';
import { BoardModifiers } from 'src/state/boardModifiers';
import { linkCardTitleToNote, noteNameFromCardTitle } from 'src/state/noteFromCard';

/** Checks or unchecks a card, through the Tasks plugin when it handles the line. */
export function toggleCardDone(
  stateManager: StateManager,
  boardModifiers: BoardModifiers,
  item: Item,
  path: Path
) {
  const updates = toggleTask(stateManager.app, item, stateManager.file);
  if (updates) {
    const [itemStrings, checkChars, thisIndex] = updates;
    const replacements: Item[] = itemStrings.map((str, i) => {
      const next = stateManager.getNewItem(str, checkChars[i]);
      if (i === thisIndex) {
        next.id = item.id;
        next.data.blockId = item.data.blockId;
      }
      return next;
    });

    boardModifiers.replaceItem(path, replacements);
    return;
  }

  boardModifiers.updateItem(
    path,
    update(item, {
      data: {
        checkChar: { $apply: (v) => (v === ' ' ? getTaskStatusDone(stateManager.app) : ' ') },
        $toggle: ['checked'],
      },
    })
  );
}

/** Moves a card to the top of another lane of its board. */
export function moveCardToLane(stateManager: StateManager, path: Path, laneIndex: number) {
  // A list may have gone since the button was drawn.
  if (path[0] === laneIndex || !stateManager.state.children[laneIndex]) return;
  stateManager.setState((board) => moveEntity(board, path, [laneIndex, 0]));
}

/** Adds one item per lane of the card's board; picking one moves the card there. */
export function addMoveToLaneItems(menu: Menu, stateManager: StateManager, path: Path) {
  const lanes = stateManager.state.children;
  if (lanes.length <= 1) return;
  lanes.forEach((lane, i) =>
    menu.addItem((item) =>
      item
        .setIcon('lucide-square-kanban')
        .setChecked(path[0] === i)
        .setTitle(lane.data.title)
        .onClick(() => moveCardToLane(stateManager, path, i))
    )
  );
}

/** Creates a note named after the card, opens it beside the board and links the card to it. */
export async function createNoteFromCard(
  stateManager: StateManager,
  boardModifiers: BoardModifiers,
  item: Item,
  path: Path
) {
  const { app } = stateManager;
  const triggers = {
    dateTrigger: stateManager.getSetting('date-trigger'),
    timeTrigger: stateManager.getSetting('time-trigger'),
  };
  const sanitizedTitle = noteNameFromCardTitle(item.data.titleRaw, triggers);

  const newNoteFolder = stateManager.getSetting('new-note-folder');
  const newNoteTemplatePath = stateManager.getSetting('new-note-template');

  const configuredFolder = newNoteFolder ? app.vault.getAbstractFileByPath(newNoteFolder) : null;
  const targetFolder =
    configuredFolder instanceof TFolder
      ? configuredFolder
      : app.fileManager.getNewFileParent(stateManager.file.path);

  const newFile = await app.fileManager.createNewMarkdownFile(targetFolder, sanitizedTitle);
  const newLeaf = app.workspace.getLeaf('split');
  await newLeaf.openFile(newFile);
  app.workspace.setActiveLeaf(newLeaf, { focus: true });

  await applyTemplate(stateManager, newNoteTemplatePath);

  const newTitleRaw = linkCardTitleToNote(
    item.data.titleRaw,
    app.fileManager.generateMarkdownLink(newFile, stateManager.file.path),
    triggers
  );

  boardModifiers.updateItem(path, stateManager.updateItemContent(item, newTitleRaw));
}
