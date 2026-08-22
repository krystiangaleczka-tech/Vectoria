import { describe, expect, it } from 'vitest';
import { createDefaultDocument, createTransform, defaultObjectStyle, type RectangleObject } from '@vectoria/core';
import { getObjectBounds } from '@vectoria/core';
import { hitTest } from '../src/index.js';

describe('viewport culling contracts', () => {
  it('computes transformed world bounds', () => {
    const object: RectangleObject = { type: 'rectangle', id: 'rect', name: 'Rect', layerId: 'layer', visible: true, locked: false, transform: { ...createTransform({ x: 50, y: 25 }), scale: { x: 2, y: 3 } }, style: defaultObjectStyle, width: 10, height: 20, cornerRadius: 0 };
    expect(getObjectBounds(object)).toEqual({ x: 50, y: 25, width: 20, height: 60 });
  });

  it('skips hit testing objects outside visible world rect', () => {
    const doc = createDefaultDocument();
    const object: RectangleObject = { type: 'rectangle', id: 'rect', name: 'Rect', layerId: doc.activeLayerId, visible: true, locked: false, transform: createTransform({ x: 500, y: 500 }), style: defaultObjectStyle, width: 100, height: 100, cornerRadius: 0 };
    const layer = doc.layers[doc.activeLayerId]!;
    const withObject = { ...doc, objects: { [object.id]: object }, layers: { ...doc.layers, [layer.id]: { ...layer, objectIds: [object.id] } } };
    expect(hitTest(withObject, { x: 520, y: 520 }, { x: 0, y: 0, width: 100, height: 100 })).toBeNull();
  });
});
