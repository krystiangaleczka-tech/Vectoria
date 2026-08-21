import { describe, it, expect } from 'vitest';
import {
  createDefaultDocument,
  validateInvariants,
  getTransformMatrix,
  getInverseTransformMatrix,
  createTransform,
} from '../src/index.js';
import { mat3TransformPoint } from '@vectoria/shared';

describe('Document Model & Invariants', () => {
  it('creates a valid default document without invariant violations', () => {
    const doc = createDefaultDocument();
    const violations = validateInvariants(doc);
    expect(violations).toHaveLength(0);
    expect(doc.artboardIds).toHaveLength(1);
    expect(doc.layerIds).toHaveLength(1);
    expect(doc.activeArtboardId).toBe(doc.artboardIds[0]);
    expect(doc.activeLayerId).toBe(doc.layerIds[0]);
  });

  it('detects missing layer in layerIds', () => {
    const doc = createDefaultDocument();
    const brokenDoc = {
      ...doc,
      layerIds: [...doc.layerIds, 'non-existent-layer-id'],
    };
    const violations = validateInvariants(brokenDoc);
    expect(violations.some((v) => v.code === 'MISSING_LAYER')).toBe(true);
  });

  it('detects duplicate object across layers', () => {
    const doc = createDefaultDocument();
    const layer1 = doc.layers[doc.layerIds[0]!]!;
    const brokenDoc = {
      ...doc,
      layers: {
        ...doc.layers,
        [layer1.id]: {
          ...layer1,
          objectIds: ['obj-1', 'obj-1'],
        },
      },
    };
    const violations = validateInvariants(brokenDoc);
    expect(violations.some((v) => v.code === 'DUPLICATE_OBJECT_IN_LAYERS')).toBe(true);
  });
});

describe('Transform2D Matrix computation', () => {
  it('ensures M(pivot) = position in world space', () => {
    const transform = {
      position: { x: 300, y: 400 },
      rotation: Math.PI / 3, // 60 deg
      scale: { x: 2, y: 1.5 },
      pivot: { x: 50, y: 25 },
    };

    const matrix = getTransformMatrix(transform);
    const transformedPivot = mat3TransformPoint(matrix, transform.pivot);

    expect(transformedPivot.x).toBeCloseTo(transform.position.x, 5);
    expect(transformedPivot.y).toBeCloseTo(transform.position.y, 5);
  });

  it('computes valid inverse for non-degenerate transform', () => {
    const transform = createTransform({ x: 100, y: 200 });
    const inv = getInverseTransformMatrix(transform);
    expect(inv).not.toBeNull();
  });
});
