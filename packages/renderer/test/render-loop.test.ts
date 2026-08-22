import { describe, expect, it, vi } from 'vitest';
import { RenderLoop } from '../src/index.js';

describe('RenderLoop', () => {
  it('coalesces repeated invalidations into one RAF render', () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callbacks.push(callback); return callbacks.length; });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    const render = vi.fn();
    const loop = new RenderLoop(render);
    loop.start(); loop.invalidate(); loop.invalidate();
    expect(callbacks).toHaveLength(1);
    callbacks.shift()!(performance.now());
    expect(render).toHaveBeenCalledTimes(1);
    loop.invalidate();
    expect(callbacks).toHaveLength(1);
    loop.stop();
    vi.unstubAllGlobals();
  });
});
