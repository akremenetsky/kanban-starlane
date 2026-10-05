import { EditorView } from '@codemirror/view';
import { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'preact/compat';
import useOnclickOutside from 'react-cool-onclickoutside';
import { MarkdownEditor, allowNewLine } from 'src/components/Editor/MarkdownEditor';
import { KanbanContext } from 'src/components/context';
import { c } from 'src/components/helpers';
import { t } from 'src/lang/helpers';
import { LaneTemplate } from 'src/model/types';
import { parseLaneTitle } from 'src/parsers/helpers/strings';
import { generateInstanceId } from 'src/shared/ids';

interface LaneFormProps {
  onNewLane: () => void;
  closeLaneForm: () => void;
}

export function LaneForm({ onNewLane, closeLaneForm }: LaneFormProps) {
  const [shouldMarkAsComplete, setShouldMarkAsComplete] = useState(false);
  const editorRef = useRef<EditorView>();
  const descriptionEditorRef = useRef<EditorView>();
  const inputRef = useRef<HTMLTextAreaElement>();
  const clickOutsideRef = useOnclickOutside(() => closeLaneForm(), {
    ignoreClass: [c('ignore-click-outside'), 'mobile-toolbar', 'suggestion-container'],
  });

  const { boardModifiers, stateManager } = useContext(KanbanContext);

  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);

  const createLane = useCallback(() => {
    const titleEditor = editorRef.current;
    const descriptionEditor = descriptionEditorRef.current;
    if (!titleEditor) return;

    const description = descriptionEditor?.state.doc.toString().trim();
    boardModifiers.addLane({
      ...LaneTemplate,
      id: generateInstanceId(),
      children: [],
      data: {
        ...parseLaneTitle(titleEditor.state.doc.toString()),
        description: description || undefined,
        shouldMarkItemsComplete: shouldMarkAsComplete,
      },
    });

    for (const cm of [titleEditor, descriptionEditor]) {
      cm?.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: '' } });
    }
    titleEditor.focus();

    setShouldMarkAsComplete(false);
    onNewLane();
  }, [onNewLane, setShouldMarkAsComplete, boardModifiers, shouldMarkAsComplete]);

  const editState = useMemo(() => ({ x: 0, y: 0 }), []);
  const onEnter = useCallback(
    (cm: EditorView, mod: boolean, shift: boolean) => {
      if (!allowNewLine(stateManager, mod, shift)) {
        createLane();
        return true;
      }
    },
    [createLane]
  );
  const onSubmit = useCallback(() => createLane(), [createLane]);

  return (
    <div ref={clickOutsideRef} className={c('lane-form-wrapper')}>
      <div className={c('lane-input-wrapper')}>
        <MarkdownEditor
          className={c('lane-input')}
          editorRef={editorRef}
          editState={editState}
          onEnter={onEnter}
          onEscape={closeLaneForm}
          onSubmit={onSubmit}
        />
        <div className={c('lane-description-input')}>
          <MarkdownEditor
            className={c('lane-input')}
            editorRef={descriptionEditorRef}
            onEnter={onEnter}
            onEscape={closeLaneForm}
            onSubmit={onSubmit}
            placeholder={t('Description (optional)')}
          />
        </div>
      </div>
      <div className={c('checkbox-wrapper')}>
        <div className={c('checkbox-label')}>{t('Mark cards in this list as complete')}</div>
        <div
          onClick={() => setShouldMarkAsComplete(!shouldMarkAsComplete)}
          className={`checkbox-container ${shouldMarkAsComplete ? 'is-enabled' : ''}`}
        />
      </div>
      <div className={c('lane-input-actions')}>
        <button
          className={c('lane-action-add')}
          onClick={() => {
            createLane();
          }}
        >
          {t('Add list')}
        </button>
        <button className={c('lane-action-cancel')} onClick={closeLaneForm}>
          {t('Done')}
        </button>
      </div>
    </div>
  );
}
