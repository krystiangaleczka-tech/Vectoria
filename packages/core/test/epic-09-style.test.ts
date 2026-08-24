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
});
