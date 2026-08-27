import type { PathNode, PathObject, TextObject, TextFrameObject } from '../model/types.js';
import { computeArtisticTextLayout, computeTextFrameLayout } from './text-layout.js';

/**
 * Generate vector path nodes for a given glyph at local coordinates (x, y).
 */
function generateGlyphOutline(
  char: string,
  x: number,
  y: number,
  size: number,
): PathNode[] {
  const w = size * 0.55;
  const h = size * 0.75;
  const baselineY = y + size * 0.8;
  const topY = baselineY - h;

  // Simple glyph vector outlines
  switch (char.toUpperCase()) {
    case 'O':
    case '0': {
      // Rounded loop
      const cx = x + w / 2;
      const cy = topY + h / 2;
      const rx = w / 2;
      const ry = h / 2;
      const k = 0.5522847498;
      return [
        { id: `${x}_${y}_0`, point: { x: cx, y: topY }, inHandle: { x: cx - rx * k, y: topY }, outHandle: { x: cx + rx * k, y: topY }, kind: 'smooth' },
        { id: `${x}_${y}_1`, point: { x: cx + rx, y: cy }, inHandle: { x: cx + rx, y: cy - ry * k }, outHandle: { x: cx + rx, y: cy + ry * k }, kind: 'smooth' },
        { id: `${x}_${y}_2`, point: { x: cx, y: topY + h }, inHandle: { x: cx + rx * k, y: topY + h }, outHandle: { x: cx - rx * k, y: topY + h }, kind: 'smooth' },
        { id: `${x}_${y}_3`, point: { x: cx - rx, y: cy }, inHandle: { x: cx - rx, y: cy + ry * k }, outHandle: { x: cx - rx, y: cy - ry * k }, kind: 'smooth' },
      ];
    }
    case 'A': {
      return [
        { id: `${x}_${y}_0`, point: { x, y: baselineY }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: `${x}_${y}_1`, point: { x: x + w / 2, y: topY }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: `${x}_${y}_2`, point: { x: x + w, y: baselineY }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: `${x}_${y}_3`, point: { x: x + w * 0.8, y: baselineY - h * 0.3 }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: `${x}_${y}_4`, point: { x: x + w * 0.2, y: baselineY - h * 0.3 }, inHandle: null, outHandle: null, kind: 'corner' },
      ];
    }
    case 'L': {
      return [
        { id: `${x}_${y}_0`, point: { x, y: topY }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: `${x}_${y}_1`, point: { x, y: baselineY }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: `${x}_${y}_2`, point: { x: x + w, y: baselineY }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: `${x}_${y}_3`, point: { x: x + w, y: baselineY - h * 0.15 }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: `${x}_${y}_4`, point: { x: x + w * 0.2, y: baselineY - h * 0.15 }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: `${x}_${y}_5`, point: { x: x + w * 0.2, y: topY }, inHandle: null, outHandle: null, kind: 'corner' },
      ];
    }
    case 'T':
    case 'I': {
      return [
        { id: `${x}_${y}_0`, point: { x: x + w * 0.35, y: topY }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: `${x}_${y}_1`, point: { x: x + w * 0.65, y: topY }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: `${x}_${y}_2`, point: { x: x + w * 0.65, y: baselineY }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: `${x}_${y}_3`, point: { x: x + w * 0.35, y: baselineY }, inHandle: null, outHandle: null, kind: 'corner' },
      ];
    }
    default: {
      // Default rectangular contour for general glyph
      return [
        { id: `${x}_${y}_0`, point: { x, y: topY }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: `${x}_${y}_1`, point: { x: x + w, y: topY }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: `${x}_${y}_2`, point: { x: x + w, y: baselineY }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: `${x}_${y}_3`, point: { x, y: baselineY }, inHandle: null, outHandle: null, kind: 'corner' },
      ];
    }
  }
}

/**
 * Converts a TextObject or TextFrameObject to a vector PathObject (compound path of all glyphs).
 */
export function convertTextToOutlines(
  object: TextObject | TextFrameObject,
): PathObject {
  const layout = object.type === 'text'
    ? computeArtisticTextLayout(object)
    : computeTextFrameLayout(object);

  const allGlyphLoops: PathNode[][] = [];

  for (const line of layout.lines) {
    for (const glyph of line.glyphs) {
      if (glyph.char.trim() === '') continue;
      const nodes = generateGlyphOutline(glyph.char, glyph.x, line.y, object.fontSize);
      if (nodes.length >= 3) {
        allGlyphLoops.push(nodes);
      }
    }
  }

  // If no glyphs found, create a fallback non-empty loop
  const primaryLoop = allGlyphLoops[0] || [
    { id: 'n0', point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
    { id: 'n1', point: { x: object.fontSize, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
    { id: 'n2', point: { x: object.fontSize, y: object.fontSize }, inHandle: null, outHandle: null, kind: 'corner' },
  ];

  const compoundChildren = allGlyphLoops.slice(1);

  return {
    id: object.id,
    type: 'path',
    name: `${object.name} (Outlines)`,
    layerId: object.layerId,
    visible: object.visible,
    locked: object.locked,
    transform: object.transform,
    style: object.style,
    nodes: primaryLoop,
    closed: true,
    compoundChildren: compoundChildren.length > 0 ? compoundChildren : undefined,
    fillRule: 'evenodd',
  };
}
