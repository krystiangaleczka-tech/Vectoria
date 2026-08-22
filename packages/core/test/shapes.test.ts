import { describe, expect, it } from 'vitest';
import { isValidShapeGeometry, normalizeCornerRadii, normalizeShapeDrag } from '../src/index.js';

describe('basic shape geometry', () => {
  it('normalizes rectangle drags in every direction', () => {
    expect(normalizeShapeDrag('rectangle', { x: 100, y: 80 }, { x: 20, y: 30 })).toEqual({
      type: 'rectangle', x: 20, y: 30, width: 80, height: 50,
    });
  });

  it('keeps square constraint in the original drag quadrant', () => {
    expect(normalizeShapeDrag('ellipse', { x: 100, y: 100 }, { x: 60, y: 80 }, { shift: true })).toEqual({
      type: 'ellipse', x: 60, y: 60, width: 40, height: 40,
    });
  });

  it('constrains lines to 45 degree increments', () => {
    const geometry = normalizeShapeDrag('line', { x: 0, y: 0 }, { x: 10, y: 4 }, { shift: true });
    expect(geometry?.type).toBe('line');
    if (geometry?.type === 'line') {
      expect(geometry.end.x).toBeCloseTo(Math.hypot(10, 4));
      expect(geometry.end.y).toBeCloseTo(0);
    }
  });

  it('rejects zero-sized geometry and non-finite points', () => {
    const zero = normalizeShapeDrag('rectangle', { x: 0, y: 0 }, { x: 1, y: 1 });
    expect(zero && isValidShapeGeometry(zero)).toBe(false);
    expect(normalizeShapeDrag('line', { x: 0, y: Number.NaN }, { x: 1, y: 1 })).toBeNull();
  });

  it('clamps each corner radius independently', () => {
    expect(normalizeCornerRadii({ topLeft: 80, topRight: 12, bottomRight: -4, bottomLeft: Number.NaN }, 100, 60)).toEqual({
      topLeft: 30, topRight: 12, bottomRight: 0, bottomLeft: 0,
    });
  });
});
