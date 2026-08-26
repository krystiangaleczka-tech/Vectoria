import { describe, expect, it } from 'vitest';
import { importPalette } from '../src/index.js';

describe('palette import', () => {
  it('imports and normalizes GPL colors', () => {
    const palette = importPalette('GIMP Palette\nName: Test\n255 0 128 Magenta\n0 0 0 Ink');
    expect(palette.scope).toBe('saved');
    expect(palette.colors).toEqual([
      expect.objectContaining({ name: 'Magenta', color: '#ff0080' }),
      expect.objectContaining({ name: 'Ink', color: '#000000' }),
    ]);
  });

  it('imports JSON gradient and pattern swatches', () => {
    const palette = importPalette(JSON.stringify({ swatches: [
      { name: 'Gradient', type: 'linear-gradient', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, stops: [{ offset: 0, color: '#fff', opacity: 1 }, { offset: 1, color: '#000', opacity: 0.5 }] },
      { name: 'Grid', type: 'pattern', kind: 'grid', foreground: '#000', background: '#fff', size: 8 },
    ] }));
    expect(palette.swatches).toHaveLength(2);
    expect(palette.swatches?.[0]?.type).toBe('gradient');
    expect(palette.swatches?.[1]?.type).toBe('pattern');
  });

  it('rejects unsafe SVG input', () => {
    expect(() => importPalette('<svg><script>alert(1)</script></svg>')).toThrow(/Unsafe/);
  });

  it('rejects malformed JSON and empty palettes', () => {
    expect(() => importPalette('{bad')).toThrow(/Invalid palette JSON/);
    expect(() => importPalette('GIMP Palette\nName: Empty')).toThrow(/no supported entries/);
  });

  it('rejects duplicate JSON entry IDs', () => {
    expect(() => importPalette(JSON.stringify({ swatches: [
      { id: 'same', name: 'One', type: 'solid', color: '#fff' },
      { id: 'same', name: 'Two', type: 'solid', color: '#000' },
    ] }))).toThrow(/Duplicate palette entry ID/);
  });
});
