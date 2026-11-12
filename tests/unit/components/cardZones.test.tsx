import { render } from 'preact';
import { act } from 'preact/test-utils';
import { CardZoneRow } from 'src/components/Item/zones/CardZones';
import { placePopover } from 'src/components/Item/zones/ChipPopover';
import { CardChip, layoutChips, useCardChips } from 'src/components/Item/zones/chips';
import { Item } from 'src/model/types';
import { StateManager } from 'src/state/StateManager';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const chip = (id: string, zone: CardChip['zone'], order: number, extra: Partial<CardChip> = {}) =>
  ({ id, zone, order, label: id, ...extra }) as CardChip;

describe('layoutChips', () => {
  it('splits chips by zone and sorts them by order, keeping ties in source order', () => {
    const { header, footer } = layoutChips([
      chip('timer', 'footer', 40),
      chip('blocked', 'header', 20),
      chip('date', 'footer', 10),
      chip('epic', 'header', 10),
      chip('size', 'footer', 20),
      chip('size-2', 'footer', 20),
    ]);
    expect(header.map((c) => c.id)).toEqual(['epic', 'blocked']);
    expect(footer.map((c) => c.id)).toEqual(['date', 'size', 'size-2', 'timer']);
  });

  it('collects the chips of every source into their zones', () => {
    const zones = useCardChips({} as Item, {} as StateManager, [
      () => [chip('size', 'footer', 20)],
      () => [],
      () => [chip('date', 'footer', 10), chip('epic', 'header', 10)],
    ]);
    expect(zones.header.map((c) => c.id)).toEqual(['epic']);
    expect(zones.footer.map((c) => c.id)).toEqual(['date', 'size']);
  });
});

describe('placePopover', () => {
  const viewport = { width: 800, height: 600 };
  const size = { width: 200, height: 100 };

  it('opens under the anchor', () => {
    expect(placePopover({ left: 50, top: 100, bottom: 120 }, size, viewport)).toEqual({
      left: 50,
      top: 124,
    });
  });

  it('opens above the anchor when there is no room below', () => {
    expect(placePopover({ left: 50, top: 540, bottom: 560 }, size, viewport)).toEqual({
      left: 50,
      top: 436,
    });
  });

  it('stays under the anchor when there is no room above either', () => {
    const tall = { width: 200, height: 580 };
    expect(placePopover({ left: 50, top: 20, bottom: 40 }, tall, viewport).top).toBe(44);
  });

  it('shifts left to stay inside the viewport', () => {
    expect(placePopover({ left: 750, top: 100, bottom: 120 }, size, viewport).left).toBe(592);
  });
});

describe('CardZoneRow', () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    render(null, root);
    root.remove();
  });

  const popover = () => document.body.querySelector('.kanban-starlane__item-chip-popover');

  it('renders nothing for an empty zone', () => {
    render(<CardZoneRow zone="footer" chips={[]} />, root);
    expect(root.innerHTML).toBe('');
  });

  it('renders the chips of a zone in one row', () => {
    const chips = layoutChips([
      chip('size', 'footer', 20, { tooltip: 'Size' }),
      chip('blocked', 'footer', 30, { tone: 'danger', end: true }),
      chip('epic', 'footer', 10, { color: 'red' }),
    ]).footer;
    render(<CardZoneRow zone="footer" chips={chips} />, root);

    const row = root.querySelector('.kanban-starlane__item-footer');
    const rendered = [...row.querySelectorAll('[data-chip]')] as HTMLElement[];
    expect(rendered.map((el) => el.dataset.chip)).toEqual(['epic', 'size', 'blocked']);
    expect(rendered[0].getAttribute('style')).toContain('--kanban-starlane__chip-color: red');
    expect(rendered[1].getAttribute('aria-label')).toBe('Size');
    expect(rendered[2].className).toContain('kanban-starlane__item-chip-danger');
    expect(rendered[2].className).toContain('kanban-starlane__item-chip-end');
  });

  it('opens a popover in the document body and closes it on Escape', async () => {
    const chips = [chip('size', 'footer', 10, { popover: () => <span>Pick a size</span> })];
    render(<CardZoneRow zone="footer" chips={chips} />, root);
    const button = root.querySelector('button[data-chip="size"]') as HTMLButtonElement;
    expect(button.dataset.ignoreDrag).toBe('true');

    await act(() => button.click());
    expect(popover()?.textContent).toBe('Pick a size');
    expect(root.contains(popover())).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');

    await act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(popover()).toBeNull();
  });

  it('closes on a pointer down outside, not inside', async () => {
    const chips = [chip('size', 'footer', 10, { popover: () => <i>inside</i> })];
    render(<CardZoneRow zone="footer" chips={chips} />, root);
    await act(() => (root.querySelector('button') as HTMLButtonElement).click());

    await act(() => {
      popover()
        .querySelector('i')
        .dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(popover()).not.toBeNull();

    await act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(popover()).toBeNull();
  });

  it('lets the popover content close it', async () => {
    const chips = [
      chip('size', 'footer', 10, { popover: (close) => <button onClick={close}>M</button> }),
    ];
    render(<CardZoneRow zone="footer" chips={chips} />, root);
    await act(() => (root.querySelector('button') as HTMLButtonElement).click());
    await act(() => (popover().querySelector('button') as HTMLButtonElement).click());
    expect(popover()).toBeNull();
  });

  it('keeps a double click on a chip from reaching the card', async () => {
    const chips = [chip('size', 'footer', 10, { popover: () => 'x' })];
    let cardDoubleClicks = 0;
    render(
      <div onDblClick={() => cardDoubleClicks++}>
        <CardZoneRow zone="footer" chips={chips} />
      </div>,
      root
    );
    const button = root.querySelector('button') as HTMLButtonElement;
    await act(() => {
      button.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    expect(cardDoubleClicks).toBe(0);
  });

  it('toggles the popover with a second click on the chip', async () => {
    const chips = [chip('size', 'footer', 10, { popover: () => 'x' })];
    render(<CardZoneRow zone="footer" chips={chips} />, root);
    const button = root.querySelector('button') as HTMLButtonElement;
    await act(() => button.click());
    await act(() => button.click());
    expect(popover()).toBeNull();
  });
});
