import Preact from 'preact/compat';
import { DndManager } from 'src/dnd/managers/DndManager';
import { EntityManager } from 'src/dnd/managers/EntityManager';
import { ScrollManager } from 'src/dnd/managers/ScrollManager';
import { ScrollStateManager } from 'src/dnd/managers/ScrollStateManager';
import { SortManager } from 'src/dnd/managers/SortManager';

export const DndManagerContext = Preact.createContext<DndManager | null>(null);

export const ScopeIdContext = Preact.createContext<string>('');

export const ScrollManagerContext = Preact.createContext<ScrollManager | null>(null);

export const ScrollStateContext = Preact.createContext<ScrollStateManager>(
  new ScrollStateManager()
);

export const SortManagerContext = Preact.createContext<SortManager | null>(null);

export const EntityManagerContext = Preact.createContext<EntityManager | null>(null);

export const ExplicitPathContext = Preact.createContext<number[]>(null);
