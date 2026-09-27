import { useEffect, useMemo, useRef } from 'preact/compat';
import { DndManager } from 'src/dnd/managers/DndManager';
import { Entity, WithChildren } from 'src/dnd/types';

import { DndScrollState } from './ScrollStateContext';
import { DndManagerContext } from './context';

interface DndContextProps extends WithChildren {
  win: Window;
  onDrop(dragEntity: Entity, dropEntity: Entity): void;
  /** Optional: which drop targets a drag may use (called once per drag). */
  getDropFilter?(dragEntity: Entity): ((dropEntity: Entity) => boolean) | null;
}

export function DndContext({ win, children, onDrop, getDropFilter }: DndContextProps) {
  const onDropRef = useRef(onDrop);
  const getDropFilterRef = useRef(getDropFilter);

  onDropRef.current = onDrop;
  getDropFilterRef.current = getDropFilter;

  const dndManager = useMemo(() => {
    return new DndManager(
      win,
      (dragEntity: Entity, dropEntity: Entity) => {
        return onDropRef.current(dragEntity, dropEntity);
      },
      (dragEntity: Entity) => getDropFilterRef.current?.(dragEntity) ?? null
    );
  }, []);

  useEffect(() => {
    return () => {
      dndManager.destroy();
    };
  }, [dndManager]);

  return (
    <DndManagerContext.Provider value={dndManager}>
      <DndScrollState>{children}</DndScrollState>
    </DndManagerContext.Provider>
  );
}
