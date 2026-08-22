import { describe, expect, it } from 'vitest';
import { DEFAULT_SNAP_SETTINGS, SnapService, snapToGrid } from '../src/index.js';

describe('grid and snapping', () => {
  it('snaps against canonical grid spacing', () => {
    expect(snapToGrid({ x: 14, y: -16 }, { visible: true, size: 10, subdivisions: 1 })).toEqual({ x: 10, y: -20 });
  });

  it('uses tolerance and deterministic source priority', () => {
    const result = new SnapService().snapPoint({ x: 9, y: 9 }, {
      zoom: 1,
      settings: { ...DEFAULT_SNAP_SETTINGS, enabled: true },
      grid: { visible: true, size: 10, subdivisions: 1 },
      candidates: [{ source: 'node', worldPoint: { x: 10, y: 10 }, distancePx: 0, priority: 0, label: 'Anchor', targetId: 'node-1' }],
    });
    expect(result.snapped).toBe(true);
    expect(result.candidate?.source).toBe('node');
  });
});
