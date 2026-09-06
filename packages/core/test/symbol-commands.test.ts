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

  it('cleans up source objects across multiple layers without leaving dangling IDs', () => {
    let doc = createDefaultDocument({ name: 'Multi Layer Symbol Doc' });
    const layer1Id = doc.layerIds[0]!;
    const layer2Id = 'layer-2';

    doc = {
      ...doc,
      layerIds: [...doc.layerIds, layer2Id],
      layers: {
        ...doc.layers,
        [layer2Id]: {
          id: layer2Id,
          name: 'Layer 2',
          visible: true,
          locked: false,
          opacity: 1,
          objectIds: [],
        },
      },
    };

    const rect1: RectangleObject = {
      id: 'rect-l1',
      name: 'Rect Layer 1',
      layerId: layer1Id,
      visible: true,
      locked: false,
      type: 'rectangle',
      transform: createTransform({ x: 10, y: 10 }),
      style: { fill: { type: 'solid', color: '#ff0000' }, stroke: null, opacity: 1, blendMode: 'normal' },
      width: 50,
      height: 50,
      cornerRadius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
    };

    const rect2: RectangleObject = {
      id: 'rect-l2',
      name: 'Rect Layer 2',
      layerId: layer2Id,
      visible: true,
      locked: false,
      type: 'rectangle',
      transform: createTransform({ x: 70, y: 10 }),
      style: { fill: { type: 'solid', color: '#00ff00' }, stroke: null, opacity: 1, blendMode: 'normal' },
      width: 50,
      height: 50,
      cornerRadius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
    };

    doc = new CreateObjectsCommand([rect1], layer1Id).execute(doc);
    doc = new CreateObjectsCommand([rect2], layer2Id).execute(doc);

    expect(doc.layers[layer1Id]!.objectIds).toContain('rect-l1');
    expect(doc.layers[layer2Id]!.objectIds).toContain('rect-l2');

    // Create symbol spanning objects on both layer1 and layer2
    const createCmd = new CreateSymbolCommand('Combined Symbol', ['rect-l1', 'rect-l2'], true);
    doc = createCmd.execute(doc);

    // Assert zero invariant violations (zero dangling IDs in any layer)
    expect(validateInvariants(doc)).toEqual([]);
    expect(doc.layers[layer2Id]!.objectIds).not.toContain('rect-l2');
    expect(doc.layers[layer2Id]!.objectIds).toHaveLength(0);
    expect(doc.layers[layer1Id]!.objectIds).not.toContain('rect-l1');
    expect(doc.layers[layer1Id]!.objectIds).toHaveLength(1); // the new symbol-instance

    // Assert each ID in layer.objectIds exists in doc.objects
    for (const layer of Object.values(doc.layers)) {
      for (const objId of layer.objectIds) {
        expect(doc.objects[objId]).toBeDefined();
      }
    }

    // Undo restores both layers
    doc = createCmd.undo(doc);
    expect(validateInvariants(doc)).toEqual([]);
    expect(doc.layers[layer1Id]!.objectIds).toContain('rect-l1');
    expect(doc.layers[layer2Id]!.objectIds).toContain('rect-l2');
    expect(doc.objects['rect-l1']).toBeDefined();
    expect(doc.objects['rect-l2']).toBeDefined();
  });
});
