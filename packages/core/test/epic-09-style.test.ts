import { describe, expect, it } from 'vitest';
import { CommandHistory, CreateObjectsCommand, SetObjectStyleCommand, DeleteObjectStyleCommand, DeletePaletteCommand, DuplicatePaletteCommand, SaveObjectStyleCommand, UpsertPaletteCommand, createDefaultDocument, createTransform, defaultObjectStyle, type RectangleObject, validateInvariants } from '../src/index.js';

describe('EPIC-09 style commands', () => {
  it('normalizes colors and restores exact style on undo/redo', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();
    const object: RectangleObject = { type: 'rectangle', id: 'style-rect', name: 'Style rect', layerId: doc.activeLayerId, visible: true, locked: false, transform: createTransform({ x: 0, y: 0 }), style: defaultObjectStyle, width: 20, height: 20, cornerRadius: 0 };
    doc = history.execute(new CreateObjectsCommand([object], doc.activeLayerId), doc);
    doc = history.execute(new SetObjectStyleCommand([object.id], { fill: { type: 'solid', color: 'rgb(255, 0, 0)' }, blendMode: 'multiply' }), doc);
    expect(doc.objects[object.id]?.style.fill).toEqual({ type: 'solid', color: '#ff0000' });
    expect(doc.objects[object.id]?.style.blendMode).toBe('multiply');
    doc = history.undo(doc)!;
    expect(doc.objects[object.id]?.style).toEqual(defaultObjectStyle);
    doc = history.redo(doc)!;
    expect(doc.objects[object.id]?.style.blendMode).toBe('multiply');
  });

  it('rejects invalid color without creating history entry', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();
    const object: RectangleObject = { type: 'rectangle', id: 'invalid-style-rect', name: 'Invalid style rect', layerId: doc.activeLayerId, visible: true, locked: false, transform: createTransform({ x: 0, y: 0 }), style: defaultObjectStyle, width: 20, height: 20, cornerRadius: 0 };
    doc = history.execute(new CreateObjectsCommand([object], doc.activeLayerId), doc);
    const unchanged = history.execute(new SetObjectStyleCommand([object.id], { fill: { type: 'solid', color: 'bad' } }), doc);
    expect(unchanged).toBe(doc);
    expect(history.history).toHaveLength(1);
  });

  it('accepts radial, angular and pattern fills through the style command', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();
    const object: RectangleObject = { type: 'rectangle', id: 'advanced-style-rect', name: 'Advanced style rect', layerId: doc.activeLayerId, visible: true, locked: false, transform: createTransform({ x: 0, y: 0 }), style: defaultObjectStyle, width: 20, height: 20, cornerRadius: 0 };
    doc = history.execute(new CreateObjectsCommand([object], doc.activeLayerId), doc);
    doc = history.execute(new SetObjectStyleCommand([object.id], { fill: { type: 'radial-gradient', center: { x: 10, y: 10 }, radius: 10, stops: [{ offset: 0, color: '#fff', opacity: 1 }, { offset: 1, color: '#000', opacity: 1 }] } }), doc);
    expect(doc.objects[object.id]?.style.fill.type).toBe('radial-gradient');
    doc = history.execute(new SetObjectStyleCommand([object.id], { fill: { type: 'pattern', kind: 'dots', foreground: '#000', background: '#fff', size: 8 } }), doc);
    expect(doc.objects[object.id]?.style.fill.type).toBe('pattern');
  });

  it('keeps palette and object-style CRUD undoable', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();
    const palette = { id: 'palette-1', name: 'Brand', scope: 'document' as const, colors: [{ id: 'brand-1', name: 'Brand blue', color: '#5caeff' }] };
    doc = history.execute(new UpsertPaletteCommand(palette), doc);
    expect(doc.palettes).toContainEqual(palette);
    doc = history.execute(new DeletePaletteCommand(palette.id), doc);
    expect(doc.palettes).not.toContainEqual(palette);
    doc = history.undo(doc)!;
    expect(doc.palettes).toContainEqual(palette);
    const style = { id: 'style-1', name: 'Brand style', style: defaultObjectStyle };
    doc = history.execute(new SaveObjectStyleCommand(style), doc);
    expect(doc.objectStyles).toContainEqual(style);
    doc = history.execute(new DeleteObjectStyleCommand(style.id), doc);
    expect(doc.objectStyles).not.toContainEqual(style);
    expect(history.undo(doc)?.objectStyles).toContainEqual(style);
  });

  it('duplicates palette entries with fresh IDs and restores exact state', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();
    const palette = doc.palettes![0]!;
    const before = doc.palettes!.length;
    doc = history.execute(new DuplicatePaletteCommand(palette), doc);
    expect(doc.palettes).toHaveLength(before + 1);
    expect(new Set(doc.palettes!.map((item) => item.id)).size).toBe(before + 1);
    expect(doc.palettes![1]!.colors.map((item) => item.id)).not.toEqual(palette.colors.map((item) => item.id));
    doc = history.undo(doc)!;
    expect(doc.palettes).toHaveLength(before);
    expect(validateInvariants(doc)).toEqual([]);
  });

  it('rejects duplicate palette and swatch IDs', () => {
    const doc = createDefaultDocument();
    const palette = doc.palettes![0]!;
    const swatch = { id: 'swatch-1', name: 'Solid', type: 'solid' as const, color: '#ffffff' };
    const invalid = { ...doc, palettes: [...doc.palettes!, { ...palette, colors: [{ ...palette.colors[0]!, id: palette.colors[0]!.id }], swatches: [swatch, swatch] }] };
    const codes = validateInvariants(invalid).map((item) => item.code);
    expect(codes).toContain('DUPLICATE_PALETTE_ID');
    expect(codes).toContain('DUPLICATE_PALETTE_COLOR_ID');
    expect(codes).toContain('DUPLICATE_SWATCH_ID');
  });
});
