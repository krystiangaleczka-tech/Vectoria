import type { PathNode, PathObject, TextObject, TextFrameObject } from '../model/types.js';
import { computeArtisticTextLayout, computeTextFrameLayout } from './text-layout.js';

export type GlyphPathCommand =
  | { readonly type: 'M'; readonly x: number; readonly y: number }
  | { readonly type: 'L'; readonly x: number; readonly y: number }
  | { readonly type: 'C'; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly x: number; readonly y: number }
  | { readonly type: 'Q'; readonly x1: number; readonly y1: number; readonly x: number; readonly y: number }
  | { readonly type: 'Z' };

export interface GlyphOutline {
  readonly advanceWidth: number;
  readonly commands: readonly GlyphPathCommand[];
}

/** Supplies real glyph contours while keeping font parsing outside core. */
export interface FontOutlineProvider {
  readonly unitsPerEm: number;
  getGlyph(codePoint: number): GlyphOutline | null;
}

/**
 * Converts text into real glyph contours supplied by an OpenType adapter.
 * A provider is required so unsupported fonts cannot silently become fake geometry.
 */
export function convertTextToOutlines(
  object: TextObject | TextFrameObject,
  provider?: FontOutlineProvider,
): PathObject {
  if (!provider || !Number.isFinite(provider.unitsPerEm) || provider.unitsPerEm <= 0) {
    throw new Error('Font outline data is unavailable for this text object.');
  }

  const layout = object.type === 'text'
    ? computeArtisticTextLayout(object)
    : computeTextFrameLayout(object);
  const contours: PathNode[][] = [];
  let glyphIndex = 0;

  for (const line of layout.lines) {
    for (const glyph of line.glyphs) {
      const codePoint = glyph.char.codePointAt(0);
      if (codePoint === undefined || glyph.char.trim() === '') continue;
      const outline = provider.getGlyph(codePoint);
      if (!outline) continue;
      const scale = object.fontSize / provider.unitsPerEm;
      const glyphContours = commandsToContours(outline.commands, glyph.x, line.baseline, scale, `glyph-${glyphIndex}`);
      contours.push(...glyphContours);
      glyphIndex += 1;
    }
  }

  if (contours.length === 0) {
    throw new Error(`No outline glyphs available for font '${object.fontFamily}'.`);
  }

  const [nodes, ...compoundChildren] = contours;
  return {
    id: object.id,
    type: 'path',
    name: `${object.name} (Outlines)`,
    layerId: object.layerId,
    visible: object.visible,
    locked: object.locked,
    transform: object.transform,
    style: object.style,
    nodes: nodes!,
    closed: true,
    compoundChildren: compoundChildren.length > 0 ? compoundChildren : undefined,
    fillRule: 'evenodd',
  };
}

function commandsToContours(
  commands: readonly GlyphPathCommand[],
  originX: number,
  baselineY: number,
  scale: number,
  idPrefix: string,
): PathNode[][] {
  const contours: PathNode[][] = [];
  let current: PathNode[] = [];
  let nodeIndex = 0;
  const point = (x: number, y: number): { x: number; y: number } => ({ x: originX + x * scale, y: baselineY + y * scale });
  const flush = (): void => {
    if (current.length >= 3) contours.push(current);
    current = [];
  };

  for (const command of commands) {
    if (command.type === 'M') {
      flush();
      current.push({ id: `${idPrefix}-${nodeIndex++}`, point: point(command.x, command.y), inHandle: null, outHandle: null, kind: 'corner' });
    } else if (command.type === 'L') {
      if (current.length > 0) current.push({ id: `${idPrefix}-${nodeIndex++}`, point: point(command.x, command.y), inHandle: null, outHandle: null, kind: 'corner' });
    } else if (command.type === 'C') {
      if (current.length === 0) continue;
      const previous = current[current.length - 1]!;
      const endpoint = point(command.x, command.y);
      current[current.length - 1] = { ...previous, outHandle: point(command.x1, command.y1) };
      current.push({ id: `${idPrefix}-${nodeIndex++}`, point: endpoint, inHandle: point(command.x2, command.y2), outHandle: null, kind: 'smooth' });
    } else if (command.type === 'Q') {
      if (current.length === 0) continue;
      const previous = current[current.length - 1]!;
      const endpoint = point(command.x, command.y);
      const control = point(command.x1, command.y1);
      const cp1 = { x: previous.point.x + (control.x - previous.point.x) * (2 / 3), y: previous.point.y + (control.y - previous.point.y) * (2 / 3) };
      const cp2 = { x: endpoint.x + (control.x - endpoint.x) * (2 / 3), y: endpoint.y + (control.y - endpoint.y) * (2 / 3) };
      current[current.length - 1] = { ...previous, outHandle: cp1 };
      current.push({ id: `${idPrefix}-${nodeIndex++}`, point: endpoint, inHandle: cp2, outHandle: null, kind: 'smooth' });
    } else {
      flush();
    }
  }
  flush();
  return contours;
}
