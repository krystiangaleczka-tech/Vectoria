import { describe, it, expect } from 'vitest';
import {
  createDefaultDocument,
  CommandHistory,
  CreateObjectsCommand,
  DeleteObjectsCommand,
  TransformObjectsCommand,
  SetObjectStyleCommand,
  SetRectangleGeometryCommand,
  SetEllipseGeometryCommand,
  SetLineGeometryCommand,
  SetPathGeometryCommand,
  createTransform,
  defaultObjectStyle,
  type RectangleObject,
  type EllipseObject,
  type LineObject,
  type PathObject,
} from '../src/index.js';

describe('Command System and History', () => {
  it('keeps a cursor, supports history jumps, and truncates redo after a new command', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();
    const rect: RectangleObject = {
      type: 'rectangle', id: 'history-rect', name: 'History Rect', layerId: doc.activeLayerId,
      visible: true, locked: false, transform: createTransform({ x: 10, y: 10 }), style: defaultObjectStyle,
      width: 20, height: 20, cornerRadius: 0,
    };

    doc = history.execute(new CreateObjectsCommand([rect], doc.activeLayerId), doc);
    doc = history.execute(new SetRectangleGeometryCommand(rect.id, { width: 40 }), doc);
    expect(history.cursor).toBe(1);
    expect(history.history).toHaveLength(2);

    doc = history.jumpTo(0, doc);
    expect(history.cursor).toBe(0);
    expect((doc.objects[rect.id] as RectangleObject).width).toBe(20);
    doc = history.execute(new SetRectangleGeometryCommand(rect.id, { height: 60 }), doc);

    expect(history.cursor).toBe(1);
    expect(history.history).toHaveLength(2);
    expect((doc.objects[rect.id] as RectangleObject).height).toBe(60);
    expect(history.canRedo).toBe(false);
  });

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
    doc = history.execute(new SetRectangleGeometryCommand('r1', { width: 120, height: 90 }), doc);
    expect((doc.objects['r1'] as RectangleObject).width).toBe(120);
    expect((doc.objects['r1'] as RectangleObject).height).toBe(90);

    // Undo geometry
    doc = history.undo(doc)!;
    expect((doc.objects['r1'] as RectangleObject).width).toBe(50);
  });

  it('SetObjectStyleCommand has contextual description', () => {
    const cmdFill = new SetObjectStyleCommand(['r1'], { fill: { type: 'solid', color: '#f00' } });
    expect(cmdFill.description).toBe('Change fill');

    const cmdStroke = new SetObjectStyleCommand(['r1'], {
      stroke: { color: '#000', width: 2, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, dashArray: [], opacity: 1 },
    });
    expect(cmdStroke.description).toBe('Change stroke');

    const cmdOpacity = new SetObjectStyleCommand(['r1'], { opacity: 0.5 });
    expect(cmdOpacity.description).toBe('Change opacity');
  });
});

describe('Type-Safe Geometry Commands', () => {
  it('SetRectangleGeometryCommand resizes and supports undo', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();

    const rect: RectangleObject = {
      type: 'rectangle',
      id: 'rect-geo-1',
      name: 'R',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      width: 100,
      height: 80,
      cornerRadius: 0,
    };

    doc = history.execute(new CreateObjectsCommand([rect], doc.activeLayerId), doc);
    doc = history.execute(
      new SetRectangleGeometryCommand('rect-geo-1', { width: 200, height: 160 }),
      doc,
    );

    const obj = doc.objects['rect-geo-1'] as RectangleObject;
    expect(obj.width).toBe(200);
    expect(obj.height).toBe(160);

    doc = history.undo(doc)!;
    const undone = doc.objects['rect-geo-1'] as RectangleObject;
    expect(undone.width).toBe(100);
    expect(undone.height).toBe(80);
  });

  it('SetRectangleGeometryCommand clamps corner radius', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();

    const rect: RectangleObject = {
      type: 'rectangle',
      id: 'rect-geo-2',
      name: 'R',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      width: 100,
      height: 100,
      cornerRadius: 0,
    };

    doc = history.execute(new CreateObjectsCommand([rect], doc.activeLayerId), doc);
    doc = history.execute(
      new SetRectangleGeometryCommand('rect-geo-2', { cornerRadius: 200 }),
      doc,
    );

    const obj = doc.objects['rect-geo-2'] as RectangleObject;
    // cornerRadius should be clamped to min(200, 50, 50) = 50
    expect(obj.cornerRadius).toBe(50);
  });

  it('SetRectangleGeometryCommand preserves independent corner radii', () => {
    let doc = createDefaultDocument();
    const rect: RectangleObject = {
      type: 'rectangle', id: 'rect-radii', name: 'R', layerId: doc.activeLayerId,
      visible: true, locked: false, transform: createTransform({ x: 0, y: 0 }), style: defaultObjectStyle,
      width: 100, height: 60, cornerRadius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
    };
    doc = new CreateObjectsCommand([rect], doc.activeLayerId).execute(doc);
    doc = new SetRectangleGeometryCommand('rect-radii', { cornerRadius: { topLeft: 80, topRight: 12, bottomRight: 8, bottomLeft: 4 } }).execute(doc);
    expect((doc.objects['rect-radii'] as RectangleObject).cornerRadius).toEqual({ topLeft: 30, topRight: 12, bottomRight: 8, bottomLeft: 4 });
  });

  it('SetRectangleGeometryCommand rejects negative width', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();

    const rect: RectangleObject = {
      type: 'rectangle',
      id: 'rect-geo-3',
      name: 'R',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      width: 100,
      height: 100,
      cornerRadius: 0,
    };

    doc = history.execute(new CreateObjectsCommand([rect], doc.activeLayerId), doc);
    const prevDoc = doc;
    doc = history.execute(
      new SetRectangleGeometryCommand('rect-geo-3', { width: -50 }),
      doc,
    );

    // Document should be unchanged (command rejected)
    expect(doc).toBe(prevDoc);
  });

  it('SetRectangleGeometryCommand has contextual description for corner radius', () => {
    const cmd = new SetRectangleGeometryCommand('r', { cornerRadius: 10 });
    expect(cmd.description).toBe('Change corner radius');

    const cmdResize = new SetRectangleGeometryCommand('r', { width: 100, height: 50 });
    expect(cmdResize.description).toBe('Resize');
  });

  it('SetEllipseGeometryCommand resizes and supports undo', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();

    const ellipse: EllipseObject = {
      type: 'ellipse',
      id: 'ell-geo-1',
      name: 'E',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      width: 100,
      height: 100,
    };

    doc = history.execute(new CreateObjectsCommand([ellipse], doc.activeLayerId), doc);
    doc = history.execute(
      new SetEllipseGeometryCommand('ell-geo-1', { width: 200, height: 150 }),
      doc,
    );

    const obj = doc.objects['ell-geo-1'] as EllipseObject;
    expect(obj.width).toBe(200);
    expect(obj.height).toBe(150);

    doc = history.undo(doc)!;
    const undone = doc.objects['ell-geo-1'] as EllipseObject;
    expect(undone.width).toBe(100);
    expect(undone.height).toBe(100);
  });

  it('SetLineGeometryCommand changes endPoint and supports undo', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();

    const line: LineObject = {
      type: 'line',
      id: 'line-geo-1',
      name: 'L',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 0, y: 0 }),
      style: {
        fill: { type: 'none' },
        stroke: { color: '#000', width: 2, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, dashArray: [], opacity: 1 },
        opacity: 1,
      },
      endPoint: { x: 100, y: 100 },
    };

    doc = history.execute(new CreateObjectsCommand([line], doc.activeLayerId), doc);
    doc = history.execute(
      new SetLineGeometryCommand('line-geo-1', { endPoint: { x: 200, y: 300 } }),
      doc,
    );

    const obj = doc.objects['line-geo-1'] as LineObject;
    expect(obj.endPoint).toEqual({ x: 200, y: 300 });

    doc = history.undo(doc)!;
    const undone = doc.objects['line-geo-1'] as LineObject;
    expect(undone.endPoint).toEqual({ x: 100, y: 100 });
  });

  it('SetPathGeometryCommand updates nodes and supports undo', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();

    const path: PathObject = {
      type: 'path',
      id: 'path-geo-1',
      name: 'P',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      nodes: [
        { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
        { point: { x: 100, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
        { point: { x: 100, y: 100 }, inHandle: null, outHandle: null, kind: 'corner' },
      ],
      closed: false,
    };

    doc = history.execute(new CreateObjectsCommand([path], doc.activeLayerId), doc);

    const newNodes = [
      { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' as const },
      { point: { x: 200, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' as const },
      { point: { x: 200, y: 200 }, inHandle: null, outHandle: null, kind: 'corner' as const },
      { point: { x: 0, y: 200 }, inHandle: null, outHandle: null, kind: 'corner' as const },
    ];

    doc = history.execute(
      new SetPathGeometryCommand('path-geo-1', { nodes: newNodes, closed: true }),
      doc,
    );

    const obj = doc.objects['path-geo-1'] as PathObject;
    expect(obj.nodes).toHaveLength(4);
    expect(obj.closed).toBe(true);

    doc = history.undo(doc)!;
    const undone = doc.objects['path-geo-1'] as PathObject;
    expect(undone.nodes).toHaveLength(3);
    expect(undone.closed).toBe(false);
  });

  it('SetPathGeometryCommand rejects too few nodes for closed path', () => {
    let doc = createDefaultDocument();
    const history = new CommandHistory();

    const path: PathObject = {
      type: 'path',
      id: 'path-geo-2',
      name: 'P',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      nodes: [
        { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
        { point: { x: 100, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
        { point: { x: 100, y: 100 }, inHandle: null, outHandle: null, kind: 'corner' },
      ],
      closed: false,
    };

    doc = history.execute(new CreateObjectsCommand([path], doc.activeLayerId), doc);
    const prevDoc = doc;

    // Try to close with only 2 nodes — should be rejected
    doc = history.execute(
      new SetPathGeometryCommand('path-geo-2', {
        nodes: [
          { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' as const },
          { point: { x: 100, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' as const },
        ],
        closed: true,
      }),
      doc,
    );

    expect(doc).toBe(prevDoc);
  });
});
