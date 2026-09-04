import { describe, it, expect } from 'vitest';
import { hitTolerancePx } from '../src/tools/hit-tolerance.js';

describe('hitTolerancePx (UX-013)', () => {
  it('returns base tolerance for mouse or undefined pointer type', () => {
    expect(hitTolerancePx('mouse')).toBe(6);
    expect(hitTolerancePx(undefined)).toBe(6);
    expect(hitTolerancePx('unknown')).toBe(6);
    expect(hitTolerancePx('mouse', 8)).toBe(8);
  });

  it('scales tolerance by 2.5x for touch pointers', () => {
    expect(hitTolerancePx('touch')).toBe(15);
    expect(hitTolerancePx('touch', 8)).toBe(20);
    expect(hitTolerancePx('touch', 12)).toBe(30);
  });

  it('scales tolerance by 1.75x for pen/stylus pointers', () => {
    expect(hitTolerancePx('pen')).toBe(10.5);
    expect(hitTolerancePx('pen', 8)).toBe(14);
    expect(hitTolerancePx('pen', 12)).toBe(21);
  });
});
