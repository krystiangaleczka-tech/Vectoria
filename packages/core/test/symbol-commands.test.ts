import { describe, it, expect } from 'vitest';
import {
  createDefaultDocument,
  createTransform,
  CreateObjectsCommand,
  CreateSymbolCommand,
  InsertSymbolInstanceCommand,
  UpdateSymbolDefinitionCommand,
  DetachSymbolInstanceCommand,
  validateInvariants,
  type RectangleObject,
  type SymbolInstanceObject,
} from '../src/index';

describe('Symbol & Component Commands (EPIC-12)', () => {
  it('creates symbol definition from objects and replaces them with an instance', () => {
    let doc = createDefaultDocument({ name: 'Symbol Doc' });
    const layerId = doc.layerIds[0]!;

    const rect: RectangleObject = {
      id: 'rect-sym-1',
      name: 'Rect 1',
      layerId,
      visible: true,
      locked: false,
      type: 'rectangle',
      transform: createTransform({ x: 50, y: 50 }),
      style: { fill: { type: 'solid', color: '#ff0000' }, stroke: null, opacity: 1, blendMode: 'normal' },
      width: 100,
      height: 80,
      cornerRadius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
    };
    doc = new CreateObjectsCommand([rect], layerId).execute(doc);

    const createSymCmd = new CreateSymbolCommand('Button Component', ['rect-sym-1'], true, true);
    doc = createSymCmd.execute(doc);

    const symbolIds = Object.keys(doc.symbols ?? {});
    expect(symbolIds.length).toBe(1);
    const symId = symbolIds[0]!;
    const symbolDef = doc.symbols![symId]!;
    expect(symbolDef.name).toBe('Button Component');
    expect(symbolDef.isBrandAsset).toBe(true);
    expect(symbolDef.bounds.width).toBe(100);
    expect(symbolDef.bounds.height).toBe(80);

    // Canvas object is now a symbol-instance
    const instanceId = doc.layers[layerId]!.objectIds[0]!;
    const instance = doc.objects[instanceId] as SymbolInstanceObject;
    expect(instance.type).toBe('symbol-instance');
    expect(instance.symbolId).toBe(symId);
    expect(doc.objects['rect-sym-1']).toBeUndefined();
    expect(validateInvariants(doc)).toEqual([]);

    // Undo
    doc = createSymCmd.undo(doc);
    expect(Object.keys(doc.symbols ?? {}).length).toBe(0);
    expect(doc.objects['rect-sym-1']).toBeDefined();
    expect(validateInvariants(doc)).toEqual([]);
  });

  it('inserts multiple independent instances and propagates definition updates atomically', () => {
    let doc = createDefaultDocument({ name: 'Multi Instance Doc' });
    const layerId = doc.layerIds[0]!;

    const rect: RectangleObject = {
      id: 'rect-base',
      name: 'Base Shape',
      layerId,
      visible: true,
      locked: false,
      type: 'rectangle',
      transform: createTransform({ x: 0, y: 0 }),
      style: { fill: { type: 'solid', color: '#3b82f6' }, stroke: null, opacity: 1, blendMode: 'normal' },
      width: 60,
      height: 40,
      cornerRadius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
    };
    doc = new CreateObjectsCommand([rect], layerId).execute(doc);

    const createSymCmd = new CreateSymbolCommand('Card Icon', ['rect-base'], false);
    doc = createSymCmd.execute(doc);
    const symId = Object.keys(doc.symbols!)[0]!;

    // Insert two instances at different coordinates
    const inst1Cmd = new InsertSymbolInstanceCommand(symId, { x: 100, y: 100 }, layerId);
    doc = inst1Cmd.execute(doc);
    const inst1Id = doc.layers[layerId]!.objectIds.find((id) => id !== 'rect-base')!;

    const inst2Cmd = new InsertSymbolInstanceCommand(symId, { x: 300, y: 150 }, layerId);
    doc = inst2Cmd.execute(doc);
    const inst2Id = doc.layers[layerId]!.objectIds.find((id) => id !== 'rect-base' && id !== inst1Id)!;

    const inst1 = doc.objects[inst1Id] as SymbolInstanceObject;
    const inst2 = doc.objects[inst2Id] as SymbolInstanceObject;
    expect(inst1.transform.position).toEqual({ x: 100, y: 100 });
    expect(inst2.transform.position).toEqual({ x: 300, y: 150 });
    expect(inst1.width).toBe(60);
    expect(inst2.width).toBe(60);

    // Update definition (resize width to 120)
    const updatedObj: RectangleObject = {
      ...rect,
      width: 120,
    };
    const updateDefCmd = new UpdateSymbolDefinitionCommand(symId, { [rect.id]: updatedObj }, 'Card Icon Large');
    doc = updateDefCmd.execute(doc);

    expect(doc.symbols![symId]!.name).toBe('Card Icon Large');
    expect(doc.symbols![symId]!.bounds.width).toBe(120);

    // Both instances automatically reflect the new width
    expect((doc.objects[inst1Id] as SymbolInstanceObject).width).toBe(120);
    expect((doc.objects[inst2Id] as SymbolInstanceObject).width).toBe(120);
    expect(validateInvariants(doc)).toEqual([]);

    // Single Undo reverts definition and instances
    doc = updateDefCmd.undo(doc);
    expect(doc.symbols![symId]!.name).toBe('Card Icon');
    expect((doc.objects[inst1Id] as SymbolInstanceObject).width).toBe(60);
    expect((doc.objects[inst2Id] as SymbolInstanceObject).width).toBe(60);
  });

  it('detaches symbol instance into regular editable objects', () => {
    let doc = createDefaultDocument({ name: 'Detach Doc' });
    const layerId = doc.layerIds[0]!;

    const rect: RectangleObject = {
      id: 'r1',
      name: 'R1',
      layerId,
      visible: true,
      locked: false,
      type: 'rectangle',
      transform: createTransform({ x: 0, y: 0 }),
      style: { fill: { type: 'solid', color: '#10b981' }, stroke: null, opacity: 1, blendMode: 'normal' },
      width: 50,
      height: 50,
      cornerRadius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
    };
    doc = new CreateObjectsCommand([rect], layerId).execute(doc);
    doc = new CreateSymbolCommand('Square Symbol', ['r1'], true).execute(doc);

    const instanceId = doc.layers[layerId]!.objectIds[0]!;
    expect(doc.objects[instanceId]!.type).toBe('symbol-instance');

    const detachCmd = new DetachSymbolInstanceCommand(instanceId);
    doc = detachCmd.execute(doc);

    // Instance is replaced by editable objects
    expect(doc.objects[instanceId]).toBeUndefined();
    const detachedId = doc.layers[layerId]!.objectIds[0]!;
    expect(doc.objects[detachedId]!.type).toBe('rectangle');
    expect(validateInvariants(doc)).toEqual([]);

    // Undo restores instance
    doc = detachCmd.undo(doc);
    expect(doc.objects[instanceId]!.type).toBe('symbol-instance');
    expect(doc.objects[detachedId]).toBeUndefined();
  });
});
