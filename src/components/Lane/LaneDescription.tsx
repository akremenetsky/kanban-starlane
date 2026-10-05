import { EditorView, ViewUpdate } from '@codemirror/view';
import { Dispatch, StateUpdater, useCallback, useContext, useEffect, useRef } from 'preact/hooks';
import { MarkdownEditor, allowNewLine } from 'src/components/Editor/MarkdownEditor';
import { MarkdownRenderer } from 'src/components/MarkdownRenderer/MarkdownRenderer';
import { KanbanContext } from 'src/components/context';
import { c } from 'src/components/helpers';
import { t } from 'src/lang/helpers';
import { EditState, EditingState, isEditing } from 'src/model/types';

// Editor suggestions and the mobile toolbar belong to the edit.
const ignoreOutsideClicks = `.${c('ignore-click-outside')}, .mobile-toolbar, .suggestion-container`;

export interface LaneDescriptionProps {
  description?: string;
  editState: EditState;
  setEditState: Dispatch<StateUpdater<EditState>>;
  onChange: (str: string) => void;
}

export function LaneDescription({
  description,
  editState,
  setEditState,
  onChange,
}: LaneDescriptionProps) {
  const { stateManager } = useContext(KanbanContext);
  const valueRef = useRef<string | null>(null);

  useEffect(() => {
    if (editState === EditingState.complete) {
      if (valueRef.current !== null) onChange(valueRef.current);
      valueRef.current = null;
    } else if (editState === EditingState.cancel) {
      valueRef.current = null;
    }
  }, [editState]);

  const onUpdate = useCallback((update: ViewUpdate) => {
    if (update.docChanged) valueRef.current = update.state.doc.toString().trim();
  }, []);
  const onEnter = useCallback(
    (cm: EditorView, mod: boolean, shift: boolean) => {
      if (!allowNewLine(stateManager, mod, shift)) {
        setEditState(EditingState.complete);
        return true;
      }
    },
    [setEditState, stateManager]
  );
  const onSubmit = useCallback(() => setEditState(EditingState.complete), [setEditState]);
  const onEscape = useCallback(() => setEditState(EditingState.cancel), [setEditState]);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const editing = isEditing(editState);

  // There is no close button as for the title, so clicking elsewhere saves. Capture phase on
  // the board's own document: cards stop the event, and the board may be in a pop-out window.
  useEffect(() => {
    const el = editorWrapperRef.current;
    if (!editing || !el) return;

    const doc = el.ownerDocument;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target || el.contains(target)) return;
      if (target.closest(ignoreOutsideClicks)) return;
      setEditState(EditingState.complete);
    };

    doc.addEventListener('pointerdown', onPointerDown, true);
    return () => doc.removeEventListener('pointerdown', onPointerDown, true);
  }, [editing, setEditState]);
  const onDoubleClick = useCallback(
    (e: MouseEvent) => setEditState({ x: e.clientX, y: e.clientY }),
    [setEditState]
  );

  if (editing) {
    return (
      <div ref={editorWrapperRef} className={c('lane-description')}>
        <MarkdownEditor
          editState={editState}
          className={c('lane-input')}
          onChange={onUpdate}
          onEnter={onEnter}
          onEscape={onEscape}
          onSubmit={onSubmit}
          placeholder={t('Description (optional)')}
          value={description ?? ''}
        />
      </div>
    );
  }

  if (!description) return null;

  return (
    <div className={c('lane-description')} onDblClick={onDoubleClick}>
      <MarkdownRenderer className={c('lane-description-text')} markdownString={description} />
    </div>
  );
}
