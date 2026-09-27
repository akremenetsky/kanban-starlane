import Preact from 'preact/compat';
import { WithChildren } from 'src/dnd/types';
import { generateInstanceId } from 'src/shared/ids';

import { ScopeIdContext, ScrollStateContext } from './context';

interface ScopeProps extends WithChildren {
  id?: string;
}

export function DndScope({ id, children }: ScopeProps) {
  const scrollStateManager = Preact.useContext(ScrollStateContext);
  const scopeId = Preact.useMemo(() => id || generateInstanceId(), [id]);

  Preact.useEffect(() => {
    return () => {
      scrollStateManager.unmountScope(id);
    };
  }, [id]);

  return <ScopeIdContext.Provider value={scopeId}>{children}</ScopeIdContext.Provider>;
}
