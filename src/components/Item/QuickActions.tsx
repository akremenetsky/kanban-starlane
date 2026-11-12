import { Menu } from 'obsidian';
import { JSX, memo } from 'preact/compat';
import { Icon } from 'src/components/Icon/Icon';
import { c } from 'src/components/helpers';
import { Path } from 'src/dnd/types';
import { t } from 'src/lang/helpers';
import { Item } from 'src/model/types';
import { QuickAction } from 'src/settings/types';
import { StateManager } from 'src/state/StateManager';
import { BoardModifiers } from 'src/state/boardModifiers';

import {
  addMoveToLaneItems,
  addSizeItems,
  createNoteFromCard,
  moveCardToLane,
  toggleCardDone,
} from './cardActions';
import { constructDatePicker, constructMenuDatePickerOnChange } from './pickers';

interface QuickActionsProps {
  item: Item;
  path: Path;
  stateManager: StateManager;
  boardModifiers: BoardModifiers;
  showMenu: (e: MouseEvent) => void;
  /** From the board being viewed, also for cards of linked boards. */
  actions: QuickAction[];
  canMoveToNextLane: boolean;
}

interface ActionButton {
  icon: string;
  label: string;
  run: (e: MouseEvent) => void;
  disabled?: boolean;
  pressed?: boolean;
}

function actionButton(
  action: QuickAction,
  { item, path, stateManager, boardModifiers, canMoveToNextLane }: QuickActionsProps
): ActionButton | null {
  switch (action) {
    case 'done':
      return {
        icon: 'lucide-check',
        label: item.data.checked ? t('Mark as not done') : t('Mark as done'),
        pressed: item.data.checked,
        run: () => toggleCardDone(stateManager, boardModifiers, item, path),
      };
    case 'date': {
      const hasDate = !!item.data.metadata.date;
      return {
        icon: 'lucide-calendar',
        label: hasDate ? t('Edit date') : t('Add date'),
        run: (e) =>
          constructDatePicker(
            e.view,
            stateManager,
            { x: e.clientX, y: e.clientY },
            constructMenuDatePickerOnChange({ stateManager, boardModifiers, item, hasDate, path }),
            item.data.metadata.date?.toDate()
          ),
      };
    }
    case 'size':
      if (!stateManager.getSetting('show-card-size')) return null;
      return {
        icon: 'lucide-gauge',
        label: t('Set size'),
        run: (e) => {
          const menu = new Menu();
          addSizeItems(menu, stateManager, boardModifiers, item, path);
          menu.showAtMouseEvent(e);
        },
      };
    case 'next-lane':
      return {
        icon: 'lucide-arrow-right',
        label: t('Move to next list'),
        disabled: !canMoveToNextLane,
        run: () => moveCardToLane(stateManager, path, path[0] + 1),
      };
    case 'move-to-lane':
      return {
        icon: 'lucide-square-kanban',
        label: t('Move to list'),
        run: (e) => {
          const menu = new Menu();
          addMoveToLaneItems(menu, stateManager, path);
          menu.showAtMouseEvent(e);
        },
      };
    case 'note': {
      const note = item.data.metadata.fileAccessor;
      return note && !note.isEmbed
        ? {
            icon: 'lucide-file-text',
            label: t('Open note'),
            run: () =>
              void stateManager.app.workspace.openLinkText(
                note.target,
                stateManager.file.path,
                'tab'
              ),
          }
        : {
            icon: 'lucide-file-plus-2',
            label: t('New note from card'),
            run: () => void createNoteFromCard(stateManager, boardModifiers, item, path),
          };
    }
    case 'archive':
      return {
        icon: 'lucide-archive',
        label: t('Archive card'),
        run: () => boardModifiers.archiveItem(path),
      };
    case 'duplicate':
      return {
        icon: 'lucide-copy',
        label: t('Duplicate card'),
        run: () => boardModifiers.duplicateEntity(path),
      };
    default:
      return null;
  }
}

/**
 * A keyboard-triggered click has no pointer position; place pickers and menus at the button
 * instead of the window's corner.
 */
function atButton(e: MouseEvent, el: HTMLElement): MouseEvent {
  if (e.detail !== 0) return e;
  const rect = el.getBoundingClientRect();
  return new MouseEvent(e.type, { clientX: rect.left, clientY: rect.bottom, view: e.view });
}

// Clicks on the panel must not start a drag, take focus from an open editor or edit the card.
const panelEvents = {
  'data-ignore-drag': true,
  onPointerDown: (e: JSX.TargetedPointerEvent<HTMLElement>) => e.preventDefault(),
  onDblClick: (e: JSX.TargetedMouseEvent<HTMLElement>) => e.stopPropagation(),
};

/**
 * The card's quick action panel: the actions picked in settings plus the card menu. It floats
 * over the top-right corner and shows on hover or keyboard focus (styles.less).
 */
export const QuickActions = memo(function QuickActions(props: QuickActionsProps) {
  return (
    <div className={c('item-actions')} {...panelEvents}>
      {props.actions.map((action) => {
        const button = actionButton(action, props);
        if (!button) return null;
        return (
          <button
            key={action}
            type="button"
            className={`${c('item-action')} clickable-icon`}
            data-action={action}
            aria-label={button.label}
            aria-pressed={button.pressed}
            disabled={button.disabled}
            onClick={(e) => {
              e.stopPropagation();
              button.run(atButton(e, e.currentTarget));
            }}
          >
            <Icon name={button.icon} />
          </button>
        );
      })}
      <a
        className={`${c('item-postfix-button')} clickable-icon`}
        aria-label={t('More options')}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          props.showMenu(atButton(e, e.currentTarget));
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.click();
        }}
      >
        <Icon name="lucide-more-vertical" />
      </a>
    </div>
  );
});
