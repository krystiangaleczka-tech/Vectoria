import { describe, expect, it } from 'vitest';
import opentypeModule from 'opentype.js';
import { createOpenTypeFontOutlineProvider } from '../src/index.js';

interface FixturePath {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void;
  close(): void;
}

interface OpenTypeFixtureApi {
  Path: new () => FixturePath;
  Glyph: new (options: { name: string; unicode: number; advanceWidth: number; path: FixturePath }) => unknown;
  Font: new (options: { familyName: string; styleName: string; unitsPerEm: number; ascender: number; descender: number; glyphs: unknown[] }) => { toArrayBuffer(): ArrayBuffer };
}

describe('OpenType outline adapter', () => {
  it('extracts real glyph path commands from font bytes', () => {
    const api = opentypeModule as unknown as OpenTypeFixtureApi;
    const path = new api.Path();
    path.moveTo(0, 0);
    path.lineTo(500, 0);
    path.curveTo(600, -250, 600, -750, 500, -1000);
    path.lineTo(0, -1000);
    path.close();
    const glyph = new api.Glyph({ name: 'A', unicode: 65, advanceWidth: 600, path });
    const font = new api.Font({ familyName: 'Fixture', styleName: 'Regular', unitsPerEm: 1000, ascender: 800, descender: -200, glyphs: [glyph] });
    const provider = createOpenTypeFontOutlineProvider(font.toArrayBuffer());
    const outline = provider.getGlyph(65);

    expect(outline).not.toBeNull();
    expect(outline?.advanceWidth).toBe(600);
    expect(outline?.commands.some((command) => command.type === 'C')).toBe(true);
  });
});
