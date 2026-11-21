import { useEffect, useRef, useState } from 'preact/compat';
import { Board } from 'src/model/types';
import { StateManager } from 'src/state/StateManager';

/**
 * A value derived from the whole board, kept up to date: another card's change (an epic
 * renamed, a member checked) can change what this card shows although this card did not
 * change. Re-renders only when `equal` says the value changed.
 */
export function useBoardSelector<T>(
  stateManager: StateManager,
  select: (board: Board) => T,
  equal: (a: T, b: T) => boolean
): T {
  const [value, setValue] = useState(() => select(stateManager.state));
  const latest = useRef({ select, equal });
  latest.current = { select, equal };

  useEffect(() => {
    const receiver = (board: Board) =>
      setValue((prev) => {
        const next = latest.current.select(board);
        return latest.current.equal(prev, next) ? prev : next;
      });
    stateManager.stateReceivers.push(receiver);
    receiver(stateManager.state);
    return () => {
      stateManager.stateReceivers.remove(receiver);
    };
  }, [stateManager]);

  // The card itself changed (new props): read it now instead of waiting for the board.
  const current = select(stateManager.state);
  return equal(value, current) ? value : current;
}
