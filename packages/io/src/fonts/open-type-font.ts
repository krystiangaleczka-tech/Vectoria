import type { FontOutlineProvider, GlyphOutline, GlyphPathCommand } from '@vectoria/core';
import * as opentypeModule from 'opentype.js';

interface OpenTypePathCommand {
  readonly type: string;
  readonly x?: number;
  readonly y?: number;
  readonly x1?: number;
  readonly y1?: number;
  readonly x2?: number;
  readonly y2?: number;
}

interface OpenTypeGlyph {
  readonly index: number;
  readonly advanceWidth: number;
  readonly unicodes?: readonly number[];
  getPath(x: number, y: number, fontSize: number): { readonly commands: readonly OpenTypePathCommand[] };
}

interface OpenTypeFont {
  readonly unitsPerEm: number;
  charToGlyph(char: string): OpenTypeGlyph;
}

interface OpenTypeModule {
  parse(data: ArrayBuffer): OpenTypeFont;
  default?: { parse(data: ArrayBuffer): OpenTypeFont };
}

function parseFontData(data: ArrayBuffer): OpenTypeFont {
  const mod = opentypeModule as unknown as OpenTypeModule;
  if (typeof mod.parse === 'function') return mod.parse(data);
  if (mod.default && typeof mod.default.parse === 'function') return mod.default.parse(data);
  throw new Error('opentype.js parse function unavailable');
}

/** Parse trusted font bytes into core's serializable glyph-outline contract. */
export function createOpenTypeFontOutlineProvider(data: ArrayBuffer): FontOutlineProvider {
  const font = parseFontData(data);
  if (!Number.isFinite(font.unitsPerEm) || font.unitsPerEm <= 0) throw new Error('Font has invalid unitsPerEm.');
  return {
    unitsPerEm: font.unitsPerEm,
    getGlyph(codePoint: number): GlyphOutline | null {
      const glyph = font.charToGlyph(String.fromCodePoint(codePoint));
      if (!glyph || (glyph.unicodes !== undefined && !glyph.unicodes.includes(codePoint))) return null;
      const path = glyph.getPath(0, 0, font.unitsPerEm);
      const commands = path.commands.flatMap(toGlyphCommand);
      return Number.isFinite(glyph.advanceWidth) ? { advanceWidth: glyph.advanceWidth, commands } : null;
    },
  };
}

function toGlyphCommand(command: OpenTypePathCommand): GlyphPathCommand[] {
  if (command.type === 'M' && finitePoint(command.x, command.y)) return [{ type: 'M', x: command.x!, y: command.y! }];
  if (command.type === 'L' && finitePoint(command.x, command.y)) return [{ type: 'L', x: command.x!, y: command.y! }];
  if (command.type === 'C' && finitePoint(command.x, command.y) && finitePoint(command.x1, command.y1) && finitePoint(command.x2, command.y2)) return [{ type: 'C', x: command.x!, y: command.y!, x1: command.x1!, y1: command.y1!, x2: command.x2!, y2: command.y2! }];
  if (command.type === 'Q' && finitePoint(command.x, command.y) && finitePoint(command.x1, command.y1)) return [{ type: 'Q', x: command.x!, y: command.y!, x1: command.x1!, y1: command.y1! }];
  if (command.type === 'Z') return [{ type: 'Z' }];
  return [];
}

function finitePoint(x: number | undefined, y: number | undefined): boolean {
  return x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y);
}
