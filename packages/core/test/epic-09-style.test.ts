import { describe, expect, it } from 'vitest';
import { CommandHistory, CreateObjectsCommand, SetObjectStyleCommand, createDefaultDocument, createTransform, defaultObjectStyle, type RectangleObject } from '../src/index.js';

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
});
