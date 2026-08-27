import { describe, it, expect } from 'vitest';
import { createDefaultDocument, createTextObject, createTextFrameObject } from '@vectoria/core';
import { hitTest } from '../src/index.js';

describe('Text Hit Testing', () => {
  it('hits artistic text within its measured bounds', () => {
    const doc = createDefaultDocument();
    const textObj = createTextObject('text-1', doc.activeLayerId, 'Sample', {
      fontSize: 20,
      transform: {
        position: { x: 50, y: 50 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        skew: { x: 0, y: 0 },
        pivot: { x: 0, y: 0 },
      },
    });

    const updatedDoc = {
      ...doc,
      objects: { ...doc.objects, [textObj.id]: textObj },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [textObj.id],
        },
      },
    };

    const hit = hitTest(updatedDoc, { x: 60, y: 60 });
    expect(hit).toBe('text-1');

    const miss = hitTest(updatedDoc, { x: 300, y: 300 });
    expect(miss).toBeNull();
  });

  it('hits text frame within frame box', () => {
    const doc = createDefaultDocument();
    const frameObj = createTextFrameObject('frame-1', doc.activeLayerId, 'Paragraph', 200, 100, {
      transform: {
        position: { x: 100, y: 100 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        skew: { x: 0, y: 0 },
        pivot: { x: 0, y: 0 },
      },
    });

    const updatedDoc = {
      ...doc,
      objects: { ...doc.objects, [frameObj.id]: frameObj },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [frameObj.id],
        },
      },
    };

    const hit = hitTest(updatedDoc, { x: 150, y: 150 });
    expect(hit).toBe('frame-1');

    const miss = hitTest(updatedDoc, { x: 50, y: 50 });
    expect(miss).toBeNull();
  });
});
