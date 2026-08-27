import { describe, it, expect } from 'vitest';
import {
  createDefaultDocument,
  createTextObject,
  createTextFrameObject,
  validateInvariants,
  getObjectBounds,
} from '../src/index.js';

describe('Text Models & Invariants', () => {
  it('creates default artistic text and passes invariants', () => {
    const doc = createDefaultDocument();
    const textObj = createTextObject('text-1', doc.activeLayerId, 'Hello Vectoria');

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

    const violations = validateInvariants(updatedDoc);
    expect(violations).toHaveLength(0);

    const bounds = getObjectBounds(textObj, updatedDoc);
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
  });

  it('creates paragraph text frame and validates column / indent invariants', () => {
    const doc = createDefaultDocument();
    const frameObj = createTextFrameObject('frame-1', doc.activeLayerId, 'First line\nSecond line', 300, 200, {
      columnCount: 2,
      columnGutter: 20,
      indent: 15,
      paragraphSpacing: 10,
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

    const violations = validateInvariants(updatedDoc);
    expect(violations).toHaveLength(0);

    const bounds = getObjectBounds(frameObj, updatedDoc);
    expect(bounds.width).toBe(300);
    expect(bounds.height).toBe(200);
  });

  it('flags invalid font size, non-positive dimensions, or invalid columnCount', () => {
    const doc = createDefaultDocument();
    const invalidObj = {
      ...createTextFrameObject('frame-bad', doc.activeLayerId, 'Test', -10, 0),
      fontSize: 0,
      columnCount: 10, // max is 8
    };

    const updatedDoc = {
      ...doc,
      objects: { ...doc.objects, [invalidObj.id]: invalidObj },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [invalidObj.id],
        },
      },
    };

    const violations = validateInvariants(updatedDoc);
    expect(violations.some((v) => v.code === 'INVALID_FONT_SIZE')).toBe(true);
    expect(violations.some((v) => v.code === 'INVALID_COLUMN_COUNT')).toBe(true);
  });
});
