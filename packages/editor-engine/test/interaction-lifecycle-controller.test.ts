import { describe, expect, it, vi } from 'vitest';
import { InteractionLifecycleController, type InteractionLifecycleReason } from '../src/index.js';

describe('interaction lifecycle controller', () => {
  it('routes one lifecycle reason to the active interaction exactly once', () => {
    const controller = new InteractionLifecycleController();
    const cancel = vi.fn<(reason: InteractionLifecycleReason) => void>();

    controller.register({ id: 'drag', cancel });

    expect(controller.cancel('drag', 'escape')).toBe(true);
    expect(controller.cancel('drag', 'escape')).toBe(false);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith('escape');
    expect(controller.activeIds).toEqual([]);
  });

  it('completes a committed interaction without running cancellation', () => {
    const controller = new InteractionLifecycleController();
    const cancel = vi.fn();
    const complete = controller.register({ id: 'shape-draft', cancel });

    complete();

    expect(cancel).not.toHaveBeenCalled();
    expect(controller.has('shape-draft')).toBe(false);
  });

  it('cancels every active interaction from one lifecycle event', () => {
    const controller = new InteractionLifecycleController();
    const events: string[] = [];
    controller.register({ id: 'pointer', cancel: (reason) => events.push(`pointer:${reason}`) });
    controller.register({ id: 'preview', cancel: (reason) => events.push(`preview:${reason}`) });

    expect(controller.cancelAll('tool-switch')).toEqual(['pointer', 'preview']);
    expect(events).toEqual(['pointer:tool-switch', 'preview:tool-switch']);
    expect(controller.activeIds).toEqual([]);
  });

  it('clears ownership before invoking callbacks so cancellation is re-entrant safe', () => {
    const controller = new InteractionLifecycleController();
    const events: string[] = [];

    controller.register({
      id: 'text-edit',
      cancel: () => {
        events.push('cancel');
        expect(controller.has('text-edit')).toBe(false);
        controller.register({ id: 'replacement', cancel: () => events.push('replacement') });
      },
    });

    controller.cancel('text-edit', 'tool-switch');

    expect(events).toEqual(['cancel']);
    expect(controller.activeIds).toEqual(['replacement']);
  });

  it('still attempts all cleanups when one participant throws', () => {
    const controller = new InteractionLifecycleController();
    const second = vi.fn();
    controller.register({ id: 'broken', cancel: () => { throw new Error('cleanup failed'); } });
    controller.register({ id: 'healthy', cancel: second });

    expect(() => controller.cancelAll('dispose')).toThrow('cleanup failed');
    expect(second).toHaveBeenCalledWith('dispose');
    expect(controller.activeIds).toEqual([]);
  });

  it('rejects duplicate lifecycle ownership ids', () => {
    const controller = new InteractionLifecycleController();
    controller.register({ id: 'freehand', cancel: () => undefined });

    expect(() => controller.register({ id: 'freehand', cancel: () => undefined })).toThrow(
      'Interaction lifecycle id already registered: freehand'
    );
  });
});
