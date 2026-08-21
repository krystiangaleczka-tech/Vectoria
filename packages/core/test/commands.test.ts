import { describe, it, expect } from 'vitest';
import {
  createDefaultDocument,
  CommandHistory,
  CreateObjectsCommand,
  DeleteObjectsCommand,
  TransformObjectsCommand,
  SetObjectStyleCommand,
  SetObjectGeometryCommand,
  createTransform,
  defaultObjectStyle,
  type RectangleObject,
} from '../src/index.js';

describe('Command System and History', () => {
  it('executes, undoes, and redoes CreateObjectsCommand', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();

    const rect: RectangleObject = {
      type: 'rectangle',
      id: 'rect-1',
      name: 'Rect 1',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 10, y: 20 }),
      style: defaultObjectStyle,
      width: 100,
      height: 50,
      cornerRadius: 0,
    };

    const createCmd = new CreateObjectsCommand([rect], doc.activeLayerId);

    // Execute
    doc = history.execute(createCmd, doc);
    expect(doc.objects['rect-1']).toBeDefined();
    expect(doc.layers[doc.activeLayerId]!.objectIds).toContain('rect-1');
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);

    // Undo
    doc = history.undo(doc)!;
    expect(doc.objects['rect-1']).toBeUndefined();
    expect(doc.layers[doc.activeLayerId]!.objectIds).not.toContain('rect-1');
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);

    // Redo
    doc = history.redo(doc)!;
    expect(doc.objects['rect-1']).toBeDefined();
    expect(doc.layers[doc.activeLayerId]!.objectIds).toContain('rect-1');
  });

  it('restores exact z-order on DeleteObjectsCommand undo', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();

    const r1: RectangleObject = {
      type: 'rectangle',
      id: 'r1',
      name: 'R1',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      width: 10,
      height: 10,
      cornerRadius: 0,
    };
    const r2: RectangleObject = { ...r1, id: 'r2', name: 'R2' };
    const r3: RectangleObject = { ...r1, id: 'r3', name: 'R3' };

    doc = history.execute(new CreateObjectsCommand([r1, r2, r3], doc.activeLayerId), doc);
    expect(doc.layers[doc.activeLayerId]!.objectIds).toEqual(['r1', 'r2', 'r3']);

    // Delete middle object r2
    doc = history.execute(new DeleteObjectsCommand(['r2']), doc);
    expect(doc.layers[doc.activeLayerId]!.objectIds).toEqual(['r1', 'r3']);

    // Undo delete -> r2 must be restored at index 1
    doc = history.undo(doc)!;
    expect(doc.layers[doc.activeLayerId]!.objectIds).toEqual(['r1', 'r2', 'r3']);
  });

  it('transforms object position and supports undo/redo', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();

    const r1: RectangleObject = {
      type: 'rectangle',
      id: 'r1',
      name: 'R1',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 10, y: 10 }),
      style: defaultObjectStyle,
      width: 100,
      height: 100,
      cornerRadius: 0,
    };

    doc = history.execute(new CreateObjectsCommand([r1], doc.activeLayerId), doc);

    const newTransforms = new Map([
      ['r1', { ...r1.transform, position: { x: 50, y: 80 } }],
    ]);

    doc = history.execute(new TransformObjectsCommand(['r1'], newTransforms), doc);
    expect(doc.objects['r1']!.transform.position).toEqual({ x: 50, y: 80 });

    doc = history.undo(doc)!;
    expect(doc.objects['r1']!.transform.position).toEqual({ x: 10, y: 10 });
  });

  it('modifies style and geometry via commands', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();

    const r1: RectangleObject = {
      type: 'rectangle',
      id: 'r1',
      name: 'R1',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      width: 50,
      height: 50,
      cornerRadius: 0,
    };

    doc = history.execute(new CreateObjectsCommand([r1], doc.activeLayerId), doc);

    // Style
    doc = history.execute(
      new SetObjectStyleCommand(['r1'], { fill: { type: 'solid', color: '#ff0000' } }),
      doc
    );
    expect(doc.objects['r1']!.style.fill).toEqual({ type: 'solid', color: '#ff0000' });

    // Geometry
    doc = history.execute(new SetObjectGeometryCommand('r1', { width: 120, height: 90 }), doc);
    expect((doc.objects['r1'] as RectangleObject).width).toBe(120);
    expect((doc.objects['r1'] as RectangleObject).height).toBe(90);

    // Undo geometry
    doc = history.undo(doc)!;
    expect((doc.objects['r1'] as RectangleObject).width).toBe(50);
  });
});
