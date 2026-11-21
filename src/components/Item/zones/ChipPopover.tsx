import { ComponentChildren } from 'preact';
import { createPortal, useEffect, useLayoutEffect, useRef, useState } from 'preact/compat';
import { c } from 'src/components/helpers';

const GAP = 4;
const MARGIN = 8;

interface Rect {
  left: number;
  top: number;
  bottom: number;
}

export interface PopoverPlacement {
  left: number;
  top: number;
  /** Set when the popover fits on neither side: it scrolls inside this height. */
  maxHeight?: number;
}

/**
 * Where a popover of `size` goes: under the anchor, above it when there is no room below,
 * shifted to stay inside the viewport. When it fits on neither side it goes where there is
 * more room and scrolls, so nothing at its end (actions of a long list) is cut off.
 */
export function placePopover(
  anchor: Rect,
  size: { width: number; height: number },
  viewport: { width: number; height: number }
): PopoverPlacement {
  const maxLeft = viewport.width - MARGIN - size.width;
  const left = Math.max(MARGIN, Math.min(anchor.left, maxLeft));
  const below = anchor.bottom + GAP;
  const roomBelow = viewport.height - MARGIN - below;
  const roomAbove = anchor.top - GAP - MARGIN;

  if (size.height <= roomBelow) return { left, top: below };
  if (size.height <= roomAbove) return { left, top: anchor.top - GAP - size.height };
  return roomBelow >= roomAbove
    ? { left, top: below, maxHeight: roomBelow }
    : { left, top: MARGIN, maxHeight: roomAbove };
}

interface ChipPopoverProps {
  anchor: HTMLElement;
  onClose: () => void;
  children: ComponentChildren;
}

/**
 * A popover rendered into the body of the anchor's window, so lanes that scroll do not clip
 * it and pop-out windows get it in the right document. Closes on Escape, on a pointer down
 * outside it and on scroll (it would drift from its chip).
 */
export function ChipPopover({ anchor, onClose, children }: ChipPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopoverPlacement | null>(null);
  const doc = anchor.ownerDocument;
  const win = doc.defaultView;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setPosition(
      placePopover(
        anchor.getBoundingClientRect(),
        { width: el.offsetWidth, height: el.offsetHeight },
        { width: win.innerWidth, height: win.innerHeight }
      )
    );
  }, [anchor, win]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || anchor.contains(target)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    const onScroll = (e: Event) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    doc.addEventListener('pointerdown', onPointerDown, true);
    doc.addEventListener('keydown', onKeyDown, true);
    doc.addEventListener('scroll', onScroll, true);
    return () => {
      doc.removeEventListener('pointerdown', onPointerDown, true);
      doc.removeEventListener('keydown', onKeyDown, true);
      doc.removeEventListener('scroll', onScroll, true);
    };
  }, [anchor, doc, onClose]);

  return createPortal(
    <div
      ref={ref}
      className={`${c('item-chip-popover')} ${c('ignore-click-outside')}`}
      style={
        position
          ? {
              left: `${position.left}px`,
              top: `${position.top}px`,
              ...(position.maxHeight !== undefined && { maxHeight: `${position.maxHeight}px` }),
            }
          : { left: '0px', top: '0px', visibility: 'hidden' }
      }
    >
      {children}
    </div>,
    doc.body
  );
}
