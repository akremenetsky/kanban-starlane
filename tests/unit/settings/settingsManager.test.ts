import { SettingsManager } from 'src/settings/SettingsManager';
import { KanbanSettings } from 'src/settings/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function createManager(initial: KanbanSettings = {}) {
  const onSettingsChange = vi.fn();
  const plugin = { app: {}, settings: { 'lane-width': 300 } } as any;
  const manager = new SettingsManager(plugin, { onSettingsChange }, initial);
  manager.win = window;
  return { manager, onSettingsChange };
}

describe('SettingsManager', () => {
  it('keeps every change made within the debounce window', () => {
    const { manager, onSettingsChange } = createManager({ 'show-checkboxes': false });

    manager.applySettingsUpdate({ 'show-checkboxes': { $set: true } });
    manager.applySettingsUpdate({ 'hide-card-count': { $set: true } });
    vi.advanceTimersByTime(1000);

    expect(onSettingsChange).toHaveBeenCalledTimes(1);
    expect(onSettingsChange).toHaveBeenCalledWith({
      'show-checkboxes': true,
      'hide-card-count': true,
    });
  });

  it('applies set-then-unset (reset button) in order', () => {
    const { manager, onSettingsChange } = createManager({ 'move-tags': true });

    manager.applySettingsUpdate({ 'move-tags': { $set: false } });
    manager.applySettingsUpdate({ $unset: ['move-tags'] });
    vi.advanceTimersByTime(1000);

    expect(onSettingsChange).toHaveBeenCalledWith({});
  });

  it('returns the global value as fallback only for board settings', () => {
    const { manager } = createManager({});
    expect(manager.getSetting('lane-width', true)).toEqual([undefined, 300]);
    expect(manager.getSetting('lane-width', false)).toEqual([undefined, null]);
  });
});
