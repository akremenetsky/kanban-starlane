import EventEmitter from 'eventemitter3';
import { RefObject } from 'preact/compat';
import { Entity, EntityData, Path, initialScrollShift, initialScrollState } from 'src/dnd/types';
import { getParentWindow } from 'src/dnd/util/getWindow';
import { adjustHitbox, calculateHitbox, emptyDomRect } from 'src/dnd/util/hitbox';
import { generateInstanceId } from 'src/shared/ids';

import { DndManager } from './DndManager';
import { ScrollManager } from './ScrollManager';
import { SortManager } from './SortManager';

interface Child {
  manager: EntityManager;
  entity: Entity;
}

export class EntityManager {
  children: Map<string, Child>;
  dndManager: DndManager;
  entityNode: HTMLElement;
  measureNode: HTMLElement;
  getEntityData: () => EntityData;
  index: number;
  parent: EntityManager | null;
  scrollParent: ScrollManager | null;
  sortManager: SortManager | null;
  isVisible: boolean = false;
  mounted: boolean = false;

  id: string;
  instanceId: string;
  entityId: string;
  scopeId: string;
  emitter: EventEmitter;

  constructor(
    dndManager: DndManager,
    scopeId: string,
    id: string,
    index: number,
    parent: EntityManager | null,
    scrollParent: ScrollManager | null,
    sortManager: SortManager | null,
    data: RefObject<EntityData>
  ) {
    this.id = id;
    this.instanceId = generateInstanceId();
    this.scopeId = scopeId;
    this.entityId = `${scopeId}-${id}`;
    this.emitter = new EventEmitter();

    this.dndManager = dndManager;
    this.index = index;
    this.children = new Map();
    this.parent = parent;
    this.scrollParent = scrollParent;
    this.getEntityData = () => data.current;
    this.sortManager = sortManager;
  }

  initNodes(entityNode: HTMLElement, measureNode: HTMLElement) {
    this.mounted = true;
    this.entityNode = entityNode;
    this.measureNode = measureNode;

    measureNode.dataset.hitboxid = this.entityId;
    this.sortManager?.registerSortable(
      this.entityId,
      this.getEntity(emptyDomRect),
      entityNode,
      measureNode
    );

    if (this.scrollParent) {
      this.scrollParent.registerObserverHandler(this.entityId, measureNode, (entry) => {
        const win = getParentWindow(entry.target);

        if (entry.isIntersecting) {
          const entity = this.getEntity(entry.boundingClientRect);
          this.parent?.children.set(this.entityId, {
            entity,
            manager: this,
          });

          this.dndManager.observeResize(measureNode);

          if (!this.parent || this.parent.isVisible) {
            this.dndManager.registerHitboxEntity(this.entityId, entity, win);
            this.children.forEach((child, childId) => {
              this.dndManager.registerHitboxEntity(childId, child.entity, win);
            });
            this.setVisibility(true);
          }
        } else {
          this.dndManager.unregisterHitboxEntity(this.entityId, win);
          this.children.forEach((_, childId) => {
            this.dndManager.unregisterHitboxEntity(childId, win);
          });
          this.parent?.children.delete(this.entityId);
          this.dndManager.unobserveResize(measureNode);
          this.setVisibility(false);
        }
      });
    } else {
      const entity = this.getEntity(measureNode.getBoundingClientRect());
      this.dndManager.observeResize(measureNode);
      this.dndManager.registerHitboxEntity(this.entityId, entity, getParentWindow(entityNode));
      this.parent?.children.set(this.entityId, {
        entity,
        manager: this,
      });
      this.setVisibility(true);
    }
  }

  setVisibility(isVisible: boolean) {
    this.emitter.emit('visibility-change', isVisible);
    this.isVisible = isVisible;
    this.children.forEach((child) => {
      child.manager.setVisibility(isVisible);
    });
  }

  destroy() {
    if (!this.mounted) return;
    this.mounted = true;
    this.dndManager.unobserveResize(this.measureNode);
    this.sortManager?.unregisterSortable(this.entityId);
    this.scrollParent?.unregisterObserverHandler(this.entityId, this.measureNode);
    if (this.entityNode) {
      this.dndManager.unregisterHitboxEntity(this.entityId, getParentWindow(this.entityNode));
    }
    this.parent?.children.delete(this.entityId);
  }

  getPath(): Path {
    return [...(this.parent?.getPath() || []), this.index];
  }

  getEntity(rect: DOMRectReadOnly): Entity {
    // Arrow functions: `this` is the manager, `entity` the object handed out.
    const entity: Entity = {
      scopeId: this.scopeId,
      entityId: this.entityId,
      initial: calculateHitbox(
        rect,
        this.scrollParent?.scrollState || initialScrollState,
        this.scrollParent?.getScrollShift() || initialScrollShift,
        null
      ),
      getParentScrollState: () => {
        return this.scrollParent?.scrollState || initialScrollState;
      },
      getParentScrollShift: () => {
        return this.scrollParent?.getScrollShift() || initialScrollShift;
      },
      recalcInitial: () => {
        entity.initial = calculateHitbox(
          this.measureNode.getBoundingClientRect(),
          this.scrollParent?.scrollState || initialScrollState,
          this.scrollParent?.getScrollShift() || initialScrollShift,
          null
        );
      },
      getHitbox: () => {
        return adjustHitbox(
          entity.initial[0],
          entity.initial[1],
          entity.initial[2],
          entity.initial[3],
          entity.getParentScrollState(),
          entity.getParentScrollShift()
        );
      },
      getPath: () => {
        return this.getPath();
      },
      getData: () => {
        return {
          ...this.getEntityData(),
          sortAxis: this.sortManager?.axis,
          win: getParentWindow(this.measureNode),
        };
      },
    };
    return entity;
  }
}
