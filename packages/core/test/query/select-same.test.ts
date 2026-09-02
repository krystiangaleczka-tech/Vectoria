import { describe, it, expect } from 'vitest';
import { selectSame } from '../../src/query/select-same.js';
import type { DocumentModel, SceneObject } from '../../src/index.js';

describe('selectSame', () => {
  it('selects objects with the same fill', () => {
    const obj1: SceneObject = {
      id: 'obj1', type: 'rectangle', name: 'Rect1', layerId: 'layer1',
      visible: true, locked: false, opacity: 1,
      transform: { position: { x: 10, y: 10 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } },
      style: { fill: { type: 'solid', color: '#ff0000' }, stroke: { type: 'none' }, strokeWidth: 1, opacity: 1, blendMode: 'normal' },
      width: 100, height: 100, cornerRadius: { tl: 0, tr: 0, bl: 0, br: 0 }
    } as any as SceneObject;

    const obj2: SceneObject = {
      id: 'obj2', type: 'rectangle', name: 'Rect2', layerId: 'layer1',
      visible: true, locked: false, opacity: 1,
      transform: { position: { x: 20, y: 20 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } },
      style: { fill: { type: 'solid', color: '#ff0000' }, stroke: { type: 'none' }, strokeWidth: 1, opacity: 1, blendMode: 'normal' },
      width: 100, height: 100, cornerRadius: { tl: 0, tr: 0, bl: 0, br: 0 }
    } as any as SceneObject;

    const obj3: SceneObject = {
      id: 'obj3', type: 'rectangle', name: 'Rect3', layerId: 'layer1',
      visible: true, locked: false, opacity: 1,
      transform: { position: { x: 30, y: 30 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } },
      style: { fill: { type: 'solid', color: '#00ff00' }, stroke: { type: 'none' }, strokeWidth: 1, opacity: 1, blendMode: 'normal' },
      width: 100, height: 100, cornerRadius: { tl: 0, tr: 0, bl: 0, br: 0 }
    } as any as SceneObject;

    const doc = {
      schemaVersion: 1,
      id: 'doc',
      name: 'Doc',
      artboards: {},
      layerIds: ['layer1'],
      layers: { layer1: { id: 'layer1', name: 'L1', visible: true, locked: false, opacity: 1, objectIds: ['obj1', 'obj2', 'obj3'] } },
      objects: { obj1, obj2, obj3 },
      activeArtboardId: '',
      activeLayerId: 'layer1',
      createdAt: '',
      updatedAt: '',
    } as any as DocumentModel;

    const result = selectSame(doc, 'obj1', 'fill', 'document');
    expect(result).toHaveLength(2);
    expect(result).toContain('obj1');
    expect(result).toContain('obj2');
  });

  it('selects objects with the same stroke', () => {
    const obj1: SceneObject = {
      id: 'obj1', type: 'rectangle', name: 'Rect1', layerId: 'layer1',
      visible: true, locked: false, opacity: 1,
      transform: { position: { x: 10, y: 10 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } },
      style: { fill: { type: 'none' }, stroke: { type: 'solid', color: '#ff0000' }, strokeWidth: 2, opacity: 1, blendMode: 'normal' },
      width: 100, height: 100, cornerRadius: { tl: 0, tr: 0, bl: 0, br: 0 }
    } as any as SceneObject;

    const obj2: SceneObject = {
      id: 'obj2', type: 'rectangle', name: 'Rect2', layerId: 'layer1',
      visible: true, locked: false, opacity: 1,
      transform: { position: { x: 20, y: 20 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } },
      style: { fill: { type: 'none' }, stroke: { type: 'solid', color: '#ff0000' }, strokeWidth: 2, opacity: 1, blendMode: 'normal' },
      width: 100, height: 100, cornerRadius: { tl: 0, tr: 0, bl: 0, br: 0 }
    } as any as SceneObject;

    const doc = {
      schemaVersion: 1,
      id: 'doc',
      name: 'Doc',
      artboards: {},
      layerIds: ['layer1'],
      layers: { layer1: { id: 'layer1', name: 'L1', visible: true, locked: false, opacity: 1, objectIds: ['obj1', 'obj2'] } },
      objects: { obj1, obj2 },
      activeArtboardId: '',
      activeLayerId: 'layer1',
      createdAt: '',
      updatedAt: '',
    } as any as DocumentModel;

    const result = selectSame(doc, 'obj1', 'stroke', 'document');
    expect(result).toHaveLength(2);
  });
});
