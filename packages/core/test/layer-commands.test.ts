import { describe, expect, it } from 'vitest';
import { generateId } from '@vectoria/shared';
import {
  CreateLayerCommand,
  DeleteLayerCommand,
  RenameLayerCommand,
  UpdateLayerPropertiesCommand,
  ReorderLayersCommand,
  MoveObjectsToLayerCommand,
  LockObjectAttributesCommand,
  canMoveLayer,
} from '../src/commands/layer-commands.js';
import { createDefaultDocument, defaultObjectStyle, defaultCornerRadii } from '../src/model/factory.js';
import { createTransform } from '../src/model/transform.js';
import { validateInvariants } from '../src/model/invariants.js';
import type { RectangleObject } from '../src/model/types.js';

describe('Layer Commands (EPIC-11)', () => {
  it('creates layer with unique id, name, and supports undo/redo', () => {
    let doc = createDefaultDocument({ name: 'Test Doc' });
    const initialLayerCount = doc.layerIds.length;

    const cmd = new CreateLayerCommand('Illustration', 0, false, '#3b82f6');
    doc = cmd.execute(doc);

    expect(doc.layerIds.length).toBe(initialLayerCount + 1);
    const createdId = doc.layerIds[0]!;
    const layer = doc.layers[createdId]!;
    expect(layer.name).toBe('Illustration');
    expect(layer.labelColor).toBe('#3b82f6');
    expect(layer.isTemplate).toBeFalsy();
    expect(doc.activeLayerId).toBe(createdId);
    expect(validateInvariants(doc)).toEqual([]);

    doc = cmd.undo(doc);
    expect(doc.layerIds.length).toBe(initialLayerCount);
    expect(doc.layers[createdId]).toBeUndefined();
    expect(validateInvariants(doc)).toEqual([]);
  });

  it('creates template layer with locked and dimmed defaults', () => {
    let doc = createDefaultDocument({ name: 'Template Doc' });
    const cmd = new CreateLayerCommand(undefined, undefined, true);
    doc = cmd.execute(doc);

    const layerId = doc.activeLayerId;
    const layer = doc.layers[layerId]!;
    expect(layer.isTemplate).toBe(true);
    expect(layer.locked).toBe(true);
    expect(layer.opacity).toBe(0.5);
    expect(layer.name).toMatch(/Template|Szablon/);
    expect(validateInvariants(doc)).toEqual([]);
  });

  it('deletes layer and removes its objects, with full undo recovery', () => {
    let doc = createDefaultDocument({ name: 'Delete Doc' });
    const createCmd = new CreateLayerCommand('Background');
    doc = createCmd.execute(doc);
    const bgLayerId = doc.activeLayerId;

    const rect: RectangleObject = {
      id: generateId(),
      type: 'rectangle',
      name: 'Rect 1',
      layerId: bgLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      width: 100,
      height: 100,
      cornerRadius: defaultCornerRadii,
    };
    doc = {
      ...doc,
      objects: { ...doc.objects, [rect.id]: rect },
      layers: {
        ...doc.layers,
        [bgLayerId]: {
          ...doc.layers[bgLayerId]!,
          objectIds: [rect.id],
        },
      },
    };

    expect(doc.objects[rect.id]).toBeDefined();
    expect(doc.layerIds.length).toBe(2);

    const deleteCmd = new DeleteLayerCommand(bgLayerId);
    doc = deleteCmd.execute(doc);

    expect(doc.layerIds.length).toBe(1);
    expect(doc.layers[bgLayerId]).toBeUndefined();
    expect(doc.objects[rect.id]).toBeUndefined();
    expect(validateInvariants(doc)).toEqual([]);

    // Undo restores layer and object cleanly
    doc = deleteCmd.undo(doc);
    expect(doc.layerIds.length).toBe(2);
    expect(doc.layers[bgLayerId]).toBeDefined();
    expect(doc.objects[rect.id]).toBeDefined();
    expect(validateInvariants(doc)).toEqual([]);
  });

  it('refuses to delete the last remaining layer', () => {
    const doc = createDefaultDocument({ name: 'Single Layer Doc' });
    expect(doc.layerIds.length).toBe(1);
    const onlyLayerId = doc.layerIds[0]!;

    const cmd = new DeleteLayerCommand(onlyLayerId);
    const resultDoc = cmd.execute(doc);

    expect(resultDoc.layerIds.length).toBe(1);
    expect(resultDoc.layers[onlyLayerId]).toBeDefined();
  });

  it('renames layer with validation', () => {
    let doc = createDefaultDocument({ name: 'Rename Doc' });
    const layerId = doc.layerIds[0]!;

    const cmd = new RenameLayerCommand(layerId, 'Artwork Foreground');
    doc = cmd.execute(doc);
    expect(doc.layers[layerId]!.name).toBe('Artwork Foreground');

    doc = cmd.undo(doc);
    expect(doc.layers[layerId]!.name).not.toBe('Artwork Foreground');

    // Rejects empty name
    const emptyCmd = new RenameLayerCommand(layerId, '   ');
    const unchangedDoc = emptyCmd.execute(doc);
    expect(unchangedDoc.layers[layerId]!.name).toBe(doc.layers[layerId]!.name);
  });

  it('updates layer visual and behavioral properties', () => {
    let doc = createDefaultDocument({ name: 'Prop Doc' });
    const layerId = doc.layerIds[0]!;

    const cmd = new UpdateLayerPropertiesCommand(layerId, {
      visible: false,
      locked: true,
      labelColor: '#ef4444',
      opacity: 0.8,
    });
    doc = cmd.execute(doc);

    expect(doc.layers[layerId]!.visible).toBe(false);
    expect(doc.layers[layerId]!.locked).toBe(true);
    expect(doc.layers[layerId]!.labelColor).toBe('#ef4444');
    expect(doc.layers[layerId]!.opacity).toBe(0.8);

    doc = cmd.undo(doc);
    expect(doc.layers[layerId]!.visible).toBe(true);
    expect(doc.layers[layerId]!.locked).toBe(false);
  });

  it('reorders layers in z-index stack', () => {
    let doc = createDefaultDocument({ name: 'Reorder Doc' });
    const cmd1 = new CreateLayerCommand('Layer B');
    doc = cmd1.execute(doc);
    const layer1 = doc.layerIds[0]!;
    const layer2 = doc.layerIds[1]!;

    const reorderCmd = new ReorderLayersCommand([layer2, layer1]);
    doc = reorderCmd.execute(doc);
    expect(doc.layerIds).toEqual([layer2, layer1]);

    doc = reorderCmd.undo(doc);
    expect(doc.layerIds).toEqual([layer1, layer2]);
  });

  it('moves objects between layers and updates layerId', () => {
    let doc = createDefaultDocument({ name: 'Move Doc' });
    const layer1 = doc.layerIds[0]!;
    const cmd = new CreateLayerCommand('Layer 2');
    doc = cmd.execute(doc);
    const layer2 = doc.activeLayerId;

    const rect: RectangleObject = {
      id: generateId(),
      type: 'rectangle',
      name: 'Rect Move',
      layerId: layer1,
      visible: true,
      locked: false,
      transform: createTransform({ x: 10, y: 10 }),
      style: defaultObjectStyle,
      width: 50,
      height: 50,
      cornerRadius: defaultCornerRadii,
    };
    doc = {
      ...doc,
      objects: { ...doc.objects, [rect.id]: rect },
      layers: {
        ...doc.layers,
        [layer1]: { ...doc.layers[layer1]!, objectIds: [rect.id] },
      },
    };

    const moveCmd = new MoveObjectsToLayerCommand([rect.id], layer2);
    doc = moveCmd.execute(doc);

    expect(doc.layers[layer1]!.objectIds).toEqual([]);
    expect(doc.layers[layer2]!.objectIds).toContain(rect.id);
    expect(doc.objects[rect.id]!.layerId).toBe(layer2);
    expect(validateInvariants(doc)).toEqual([]);

    doc = moveCmd.undo(doc);
    expect(doc.layers[layer1]!.objectIds).toContain(rect.id);
    expect(doc.layers[layer2]!.objectIds).toEqual([]);
    expect(doc.objects[rect.id]!.layerId).toBe(layer1);
    expect(validateInvariants(doc)).toEqual([]);
  });

  it('locks and unlocks specific object attributes', () => {
    let doc = createDefaultDocument({ name: 'Lock Doc' });
    const layerId = doc.layerIds[0]!;
    const rect: RectangleObject = {
      id: generateId(),
      type: 'rectangle',
      name: 'Rect Lock',
      layerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 0, y: 0 }),
      style: defaultObjectStyle,
      width: 50,
      height: 50,
      cornerRadius: defaultCornerRadii,
    };
    doc = {
      ...doc,
      objects: { ...doc.objects, [rect.id]: rect },
      layers: {
        ...doc.layers,
        [layerId]: { ...doc.layers[layerId]!, objectIds: [rect.id] },
      },
    };

    const lockCmd = new LockObjectAttributesCommand([rect.id], ['position', 'size']);
    doc = lockCmd.execute(doc);

    expect(doc.objects[rect.id]!.lockedAttributes).toEqual(['position', 'size']);
    expect(validateInvariants(doc)).toEqual([]);

    doc = lockCmd.undo(doc);
    expect(doc.objects[rect.id]!.lockedAttributes).toBeUndefined();
    expect(validateInvariants(doc)).toEqual([]);
  });

  it('blocks cyclic hierarchy at arbitrary depth', () => {
    // Construct a 20-level hierarchy: layer-1 -> layer-2 -> ... -> layer-20
    let doc = createDefaultDocument({ name: 'Deep Hierarchy Doc' });
    const layers: Record<string, import('../src/model/types.js').Layer> = {};
    const layerIds: string[] = [];

    for (let i = 1; i <= 20; i++) {
      const id = `layer-${i}`;
      layerIds.push(id);
      layers[id] = {
        id,
        name: `Layer ${i}`,
        visible: true,
        locked: false,
        opacity: 1,
        objectIds: [],
        parentId: i === 1 ? null : `layer-${i - 1}`,
      };
    }

    doc = {
      ...doc,
      layers,
      layerIds,
    };

    // Moving layer-1 under layer-20 would create a cycle: layer-1 -> ... -> layer-20 -> layer-1
    expect(canMoveLayer(doc, 'layer-1', 'layer-20')).toBe(false);

    // Moving independent or leaf layers under layer-1 is allowed
    expect(canMoveLayer(doc, 'layer-20', 'layer-1')).toBe(true);
  });
});

