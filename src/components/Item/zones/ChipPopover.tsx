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

/**
 * Where a popover of `size` goes: under the anchor, above it when there is no room below,
 * shifted to stay inside the viewport.
 */
export function placePopover(
  anchor: Rect,
  size: { width: number; height: number },
  viewport: { width: number; height: number }
) {
  const below = anchor.bottom + GAP;
  const above = anchor.top - GAP - size.height;
  const top = below + size.height <= viewport.height - MARGIN || above < MARGIN ? below : above;
  const maxLeft = viewport.width - MARGIN - size.width;
  const left = Math.max(MARGIN, Math.min(anchor.left, maxLeft));
  return { left, top };
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
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
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
          ? { left: `${position.left}px`, top: `${position.top}px` }
          : { left: '0px', top: '0px', visibility: 'hidden' }
      }
    >
      {children}
    </div>,
    doc.body
  );
}
