import { describe, expect, it } from 'vitest';
import { convertUnit, parseNumericExpression } from '../src/units.js';

describe('document units', () => {
  it('round-trips physical units without world-space drift', () => {
    const value = 1350;
    expect(convertUnit(convertUnit(value, 'cm', 'in'), 'in', 'cm')).toBeCloseTo(value, 10);
    expect(convertUnit(convertUnit(value, 'px', 'mm'), 'mm', 'px')).toBeCloseTo(value, 10);
  });

  it('parses safe numeric expressions and rejects unsafe input', () => {
    expect(parseNumericExpression('100/3')).toBeCloseTo(100 / 3);
    expect(parseNumericExpression('20 + 4')).toBe(24);
    expect(parseNumericExpression('50%', 200)).toBe(100);
    expect(parseNumericExpression('10/0')).toBeNull();
    expect(parseNumericExpression('alert(1)')).toBeNull();
  });
});
