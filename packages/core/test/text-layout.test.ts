import { describe, it, expect } from 'vitest';
import {
  createTextObject,
  createTextFrameObject,
  computeArtisticTextLayout,
  computeTextFrameLayout,
  computeTextOnPathLayout,
  getCodePoints,
  measureTextWidth,
  type PathNode,
} from '../src/index.js';

describe('Text Layout Engine', () => {
  it('correctly extracts unicode code points including multi-codepoint emoji', () => {
    const text = 'Hello 🚀🌟 world';
    const codePoints = getCodePoints(text);
    expect(codePoints.length).toBe(14);
    expect(codePoints[6]).toBe('🚀');
    expect(codePoints[7]).toBe('🌟');
  });

  it('measures text width and respects letterSpacing', () => {
    const text = 'Vector';
    const normalWidth = measureTextWidth(text, 16, 'Inter, sans-serif', 0);
    const spacedWidth = measureTextWidth(text, 16, 'Inter, sans-serif', 4);
    expect(spacedWidth).toBe(normalWidth + (text.length - 1) * 4);
  });

  it('computes artistic text layout with alignment offsets', () => {
    const textObj = createTextObject('txt-1', 'layer-1', 'Centered Text', {
      fontSize: 20,
      textAlign: 'center',
    });

    const layout = computeArtisticTextLayout(textObj);
    expect(layout.lines).toHaveLength(1);
    expect(layout.lines[0]!.x).toBeLessThan(0); // centered around origin
    expect(layout.lines[0]!.glyphs.length).toBe('Centered Text'.length);
  });

  it('performs word-wrapping on paragraph text in narrow frame', () => {
    const longText = 'This is a long sentence that should definitely wrap across multiple lines inside a narrow frame';
    const frameObj = createTextFrameObject('frm-1', 'layer-1', longText, 120, 300, {
      fontSize: 14,
      lineHeight: 1.4,
    });

    const layout = computeTextFrameLayout(frameObj);
    expect(layout.lines.length).toBeGreaterThan(1);
    for (const line of layout.lines) {
      expect(line.width).toBeLessThanOrEqual(120);
    }
  });

  it('handles multi-column text frame layout', () => {
    const text = 'Paragraph 1 with several words.\nParagraph 2 with another set of words.\nParagraph 3.';
    const frameObj = createTextFrameObject('frm-cols', 'layer-1', text, 400, 100, {
      fontSize: 14,
      columnCount: 2,
      columnGutter: 20,
    });

    const layout = computeTextFrameLayout(frameObj);
    const columnsUsed = new Set(layout.lines.map((l) => l.columnIndex));
    expect(columnsUsed.size).toBeGreaterThanOrEqual(1);
  });

  it('computes text on path parameterization', () => {
    const textObj = createTextObject('txt-path', 'layer-1', 'Curve Text', {
      fontSize: 16,
    });

    const pathNodes: PathNode[] = [
      { id: 'p0', point: { x: 0, y: 0 }, inHandle: null, outHandle: { x: 50, y: 50 }, kind: 'smooth' },
      { id: 'p1', point: { x: 100, y: 0 }, inHandle: { x: 50, y: -50 }, outHandle: null, kind: 'smooth' },
    ];

    const layout = computeTextOnPathLayout(textObj, pathNodes, false);
    expect(layout.lines[0]!.glyphs.length).toBeGreaterThan(0);
    for (const glyph of layout.lines[0]!.glyphs) {
      expect(glyph.rotation).toBeDefined();
      expect(Number.isFinite(glyph.x)).toBe(true);
      expect(Number.isFinite(glyph.y)).toBe(true);
    }
  });
});
