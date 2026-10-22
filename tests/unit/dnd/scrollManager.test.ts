import { DndManager } from 'src/dnd/managers/DndManager';
import { ScrollManager } from 'src/dnd/managers/ScrollManager';
import { Entity, Side } from 'src/dnd/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let frames: Map<number, FrameRequestCallback>;
let nextFrame = 0;

// Runs queued animation frames; a scroll loop that never ends stops at `limit`.
function runFrames(limit = 5000) {
  let count = 0;
  while (frames.size && count < limit) {
    const [id, cb] = frames.entries().next().value;
    frames.delete(id);
    cb(0);
    count++;
  }
  return count;
}

interface Box {
  scrollWidth: number;
  clientWidth: number;
  offsetWidth: number;
  /** The largest scrollLeft the browser allows. */
  maxLeft: number;
}

function scrollBox({ scrollWidth, clientWidth, offsetWidth, maxLeft }: Box) {
  const el = document.body.createDiv();
  let left = 0;
  Object.defineProperties(el, {
    scrollWidth: { value: scrollWidth },
    clientWidth: { value: clientWidth },
    offsetWidth: { value: offsetWidth },
    scrollHeight: { value: 500 },
    clientHeight: { value: 500 },
    offsetHeight: { value: 500 },
    scrollTop: { value: 0 },
    scrollLeft: {
      get: () => left,
      set: (v: number) => {
        left = Math.min(Math.max(v, 0), maxLeft);
      },
    },
  });
  el.scrollBy = ((o: ScrollToOptions) => {
    el.scrollLeft = left + (o.left ?? 0);
  }) as typeof el.scrollBy;
  return el;
}

const plainBox: Box = { scrollWidth: 2000, clientWidth: 1000, offsetWidth: 1000, maxLeft: 1000 };

function setup(box: Box = plainBox) {
  const el = scrollBox(box);
  const dnd = new DndManager(window, () => {});
  const manager = new ScrollManager(dnd, 'scope', ['item'], null);
  manager.initNodes(el);
  manager.onScroll();
  dnd.dragManager.dragEntity = {} as Entity;

  const emit = (event: string, side: Side = 'right', entityId = manager.getId(side)) =>
    dnd.dragManager.emitter.emit(
      event,
      { scrollEntityId: entityId, scrollEntitySide: side, scrollStrength: 10 },
      entityId
    );

  return { el, dnd, manager, emit };
}

describe('drag auto-scroll', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeObserver);
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    frames = new Map();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.set(++nextFrame, cb);
      return nextFrame;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      frames.delete(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.empty();
  });

  it.each([
    [
      'a vertical scrollbar narrows the viewport',
      { scrollWidth: 2000, clientWidth: 990, offsetWidth: 1000, maxLeft: 1010 },
    ],
    [
      'the scroll offset is fractional',
      { scrollWidth: 2000, clientWidth: 1000, offsetWidth: 1000, maxLeft: 999.5 },
    ],
  ])('stops at the right edge when %s', (_, box) => {
    const { el, emit } = setup(box);

    emit('beginDragScroll');
    runFrames();

    expect(el.scrollLeft).toBe(box.maxLeft);
    expect(frames.size).toBe(0);
  });

  it('lets the user scroll back once the drag ends', () => {
    const { el, emit, dnd } = setup();

    emit('beginDragScroll');
    runFrames(10);
    dnd.dragManager.emitter.emit('dragEnd', {});
    runFrames();
    el.scrollLeft = 0;
    runFrames();

    expect(el.scrollLeft).toBe(0);
    expect(frames.size).toBe(0);
  });

  it('stops scrolling when the container is destroyed mid-drag', () => {
    const { el, emit, manager } = setup();

    emit('beginDragScroll');
    runFrames(10);
    manager.destroy();
    const left = el.scrollLeft;
    runFrames();

    expect(el.scrollLeft).toBe(left);
    expect(frames.size).toBe(0);
  });

  it('stops scrolling when no drag is in progress any more', () => {
    const { el, emit, dnd } = setup();

    emit('beginDragScroll');
    runFrames(10);
    dnd.dragManager.dragEntity = undefined;
    const left = el.scrollLeft;
    runFrames();

    expect(el.scrollLeft).toBe(left);
    expect(frames.size).toBe(0);
  });

  it('ignores scroll events meant for another container', () => {
    const { el, emit } = setup();

    emit('beginDragScroll', 'right', 'another-container-right');
    runFrames();

    expect(el.scrollLeft).toBe(0);
  });
});
