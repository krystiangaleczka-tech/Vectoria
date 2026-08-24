import { describe, expect, it } from 'vitest';
import { normalizeColor, parseColor } from '../src/index.js';

describe('central color parsing', () => {
  it('normalizes supported hex, RGB and HSL values', () => {
    expect(normalizeColor('#abc')).toBe('#aabbcc');
    expect(normalizeColor('rgb(255, 0, 16)')).toBe('#ff0010');
    expect(normalizeColor('hsl(0, 100%, 50%)')).toBe('#ff0000');
  });

  it('converts CMYK and reports out-of-gamut channels', () => {
    expect(normalizeColor('cmyk(0%, 100%, 100%, 0%)')).toBe('#ff0000');
    expect(parseColor('cmyk(120%, 0%, 0%, 0%)')?.outOfGamut).toBe(true);
  });

  it('rejects malformed values', () => {
    expect(parseColor('not-a-color')).toBeNull();
    expect(normalizeColor('#12')).toBeNull();
  });
});
