import { describe, expect, it } from 'vitest';
import { EyedropperTool, PaintBucketTool } from '../src/index.js';

describe('style tools', () => {
  const event = { screenPoint: { x: 10, y: 10 }, worldPoint: { x: 20, y: 20 } };

  it('keeps eyedropper sampling transient and commits source on pointerup', () => {
    const tool = new EyedropperTool();
    expect(tool.pointerDown(event).type).toBe('preview');
    expect(tool.pointerMove({ ...event, worldPoint: { x: 30, y: 30 } })?.type).toBe('preview');
    tool.sampleTarget = 'fill';
    expect(tool.pointerUp('source').type).toBe('commit');
    expect(tool.currentState).toBe('idle');
    expect(tool.previewPoint).toBeNull();
  });

  it('cancels eyedropper without a source', () => {
    const tool = new EyedropperTool();
    tool.pointerDown(event);
    expect(tool.pointerUp(null)).toEqual({ type: 'cancel' });
  });

  it('clamps bucket tolerance and commits fill target', () => {
    const tool = new PaintBucketTool();
    tool.tolerance = 500;
    tool.pointerDown(event);
    expect(tool.pointerUp('source')).toEqual({ type: 'commit', sourceObjectId: 'source', target: 'fill', tolerance: 100 });
    tool.tolerance = -1;
    expect(tool.tolerance).toBe(0);
  });
});
