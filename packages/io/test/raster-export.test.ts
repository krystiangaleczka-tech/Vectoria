import { describe, it, expect } from 'vitest';
import { assertSafeRasterDimensions } from '../src/export/raster-export.js';
import { EXPORT_MEMORY_LIMITS } from '../src/export/export-types.js';

describe('raster-export memory guard and dimensions (EXPORT-003..011)', () => {
  it('allows safe dimensions within memory budget', () => {
    expect(() => assertSafeRasterDimensions(1920, 1080)).not.toThrow();
    expect(() => assertSafeRasterDimensions(4000, 4000)).not.toThrow();
    expect(() => assertSafeRasterDimensions(8000, 8000)).not.toThrow(); // 64 MP <= 100 MP
  });

  it('throws EXPORT_MEMORY_LIMIT when total pixel count exceeds 100 MP', () => {
    const hugeWidth = 10_001;
    const hugeHeight = 10_001; // > 100,000,000 px
    expect(() => assertSafeRasterDimensions(hugeWidth, hugeHeight)).toThrow(/EXPORT_MEMORY_LIMIT/);
  });

  it('throws EXPORT_MEMORY_LIMIT when any single side exceeds maxSidePx', () => {
    expect(() =>
      assertSafeRasterDimensions(EXPORT_MEMORY_LIMITS.maxSidePx + 1, 100),
    ).toThrow(/EXPORT_MEMORY_LIMIT/);
    expect(() =>
      assertSafeRasterDimensions(100, EXPORT_MEMORY_LIMITS.maxSidePx + 1),
    ).toThrow(/EXPORT_MEMORY_LIMIT/);
  });

  it('throws for non-positive or non-finite dimensions', () => {
    expect(() => assertSafeRasterDimensions(0, 100)).toThrow(/EXPORT_MEMORY_LIMIT/);
    expect(() => assertSafeRasterDimensions(-50, 100)).toThrow(/EXPORT_MEMORY_LIMIT/);
    expect(() => assertSafeRasterDimensions(NaN, 100)).toThrow(/EXPORT_MEMORY_LIMIT/);
    expect(() => assertSafeRasterDimensions(100, Infinity)).toThrow(/EXPORT_MEMORY_LIMIT/);
  });
});
