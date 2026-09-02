import { describe, it, expect } from 'vitest';
import { DuplicateTransformCommand } from '../../src/commands/duplicate-transform-command.js';
import type { DocumentModel, SceneObject } from '../../src/index.js';

describe('DuplicateTransformCommand', () => {
  it('duplicates objects with default offset', () => {
    const obj: SceneObject = {
      id: 'obj1',
      type: 'rectangle',
      name: 'Rect',
      layerId: 'layer1',
      visible: true,
      locked: false,
      transform: { position: { x: 10, y: 10 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } },
      style: { fill: { type: 'none' }, stroke: { type: 'none' }, strokeWidth: 1, opacity: 1, blendMode: 'normal' },
      width: 100,
      height: 100,
      cornerRadius: { tl: 0, tr: 0, bl: 0, br: 0 }
    } as any as SceneObject;

    const doc = {
      schemaVersion: 1,
      id: 'doc',
      name: 'Doc',
      artboards: {},
      layerIds: ['layer1'],
      layers: { layer1: { id: 'layer1', name: 'L1', visible: true, locked: false, opacity: 1, objectIds: ['obj1'] } as any },
      objects: { obj1: obj },
      activeArtboardId: '',
      activeLayerId: 'layer1',
    } as any as DocumentModel;

    const cmd = new DuplicateTransformCommand(['obj1']);
    const result = cmd.execute(doc);

    expect(result.layers['layer1']!.objectIds.length).toBe(2);
    const newId = result.layers['layer1']!.objectIds.find(id => id !== 'obj1');
    const newObj = result.objects[newId!];
    expect(newObj).toBeDefined();
    expect(newObj!.transform.position).toEqual({ x: 30, y: 30 }); // 10 + 20
    
    // undo
    const undone = cmd.undo(result);
    expect(undone.layers['layer1']!.objectIds.length).toBe(1);
    expect(undone.objects[newId!]).toBeUndefined();
  });
});
