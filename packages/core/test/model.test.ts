import { describe, it, expect } from 'vitest';
import {
  createDefaultDocument,
  validateInvariants,
  getTransformMatrix,
  getInverseTransformMatrix,
  createTransform,
  defaultObjectStyle,
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

describe('Extended Invariant Validation', () => {
  it('detects negative stroke width', () => {
    const doc = createDefaultDocument();
    const brokenDoc = {
      ...doc,
      objects: {
        'obj-1': {
          type: 'rectangle' as const,
          id: 'obj-1',
          name: 'R',
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
          transform: createTransform({ x: 0, y: 0 }),
          style: {
            fill: { type: 'solid' as const, color: '#fff' },
            stroke: {
              color: '#000',
              width: -1,
              lineCap: 'butt' as const,
              lineJoin: 'miter' as const,
              miterLimit: 10,
              dashArray: [],
              opacity: 1,
            },
            opacity: 1,
          },
          width: 100,
          height: 100,
          cornerRadius: 0,
        },
      },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: ['obj-1'],
        },
      },
    };
    const violations = validateInvariants(brokenDoc);
    expect(violations.some((v) => v.code === 'INVALID_STROKE_WIDTH')).toBe(true);
  });

  it('detects stroke opacity out of range', () => {
    const doc = createDefaultDocument();
    const brokenDoc = {
      ...doc,
      objects: {
        'obj-2': {
          type: 'rectangle' as const,
          id: 'obj-2',
          name: 'R',
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
          transform: createTransform({ x: 0, y: 0 }),
          style: {
            fill: { type: 'none' as const },
            stroke: {
              color: '#000',
              width: 1,
              lineCap: 'butt' as const,
              lineJoin: 'miter' as const,
              miterLimit: 10,
              dashArray: [],
              opacity: 2,
            },
            opacity: 1,
          },
          width: 100,
          height: 100,
          cornerRadius: 0,
        },
      },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: ['obj-2'],
        },
      },
    };
    const violations = validateInvariants(brokenDoc);
    expect(violations.some((v) => v.code === 'INVALID_STROKE_OPACITY')).toBe(true);
  });

  it('detects miterLimit < 1', () => {
    const doc = createDefaultDocument();
    const brokenDoc = {
      ...doc,
      objects: {
        'obj-3': {
          type: 'rectangle' as const,
          id: 'obj-3',
          name: 'R',
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
          transform: createTransform({ x: 0, y: 0 }),
          style: {
            fill: { type: 'none' as const },
            stroke: {
              color: '#000',
              width: 1,
              lineCap: 'butt' as const,
              lineJoin: 'miter' as const,
              miterLimit: 0.5,
              dashArray: [],
              opacity: 1,
            },
            opacity: 1,
          },
          width: 100,
          height: 100,
          cornerRadius: 0,
        },
      },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: ['obj-3'],
        },
      },
    };
    const violations = validateInvariants(brokenDoc);
    expect(violations.some((v) => v.code === 'INVALID_MITER_LIMIT')).toBe(true);
  });

  it('detects gradient with fewer than 2 stops', () => {
    const doc = createDefaultDocument();
    const brokenDoc = {
      ...doc,
      objects: {
        'obj-4': {
          type: 'rectangle' as const,
          id: 'obj-4',
          name: 'R',
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
          transform: createTransform({ x: 0, y: 0 }),
          style: {
            fill: {
              type: 'linear-gradient' as const,
              start: { x: 0, y: 0 },
              end: { x: 100, y: 100 },
              stops: [{ offset: 0, color: '#fff', opacity: 1 }],
            },
            stroke: null,
            opacity: 1,
          },
          width: 100,
          height: 100,
          cornerRadius: 0,
        },
      },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: ['obj-4'],
        },
      },
    };
    const violations = validateInvariants(brokenDoc);
    expect(violations.some((v) => v.code === 'INVALID_GRADIENT_STOPS')).toBe(true);
  });

  it('detects non-finite line endPoint', () => {
    const doc = createDefaultDocument();
    const brokenDoc = {
      ...doc,
      objects: {
        'obj-5': {
          type: 'line' as const,
          id: 'obj-5',
          name: 'L',
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
          transform: createTransform({ x: 0, y: 0 }),
          style: {
            fill: { type: 'none' as const },
            stroke: {
              color: '#000',
              width: 2,
              lineCap: 'butt' as const,
              lineJoin: 'miter' as const,
              miterLimit: 10,
              dashArray: [],
              opacity: 1,
            },
            opacity: 1,
          },
          endPoint: { x: NaN, y: 100 },
        },
      },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: ['obj-5'],
        },
      },
    };
    const violations = validateInvariants(brokenDoc);
    expect(violations.some((v) => v.code === 'NON_FINITE_ENDPOINT')).toBe(true);
  });

  it('detects non-finite path node coordinates', () => {
    const doc = createDefaultDocument();
    const brokenDoc = {
      ...doc,
      objects: {
        'obj-6': {
          type: 'path' as const,
          id: 'obj-6',
          name: 'P',
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
          transform: createTransform({ x: 0, y: 0 }),
          style: {
            fill: { type: 'none' as const },
            stroke: {
              color: '#000',
              width: 2,
              lineCap: 'butt' as const,
              lineJoin: 'miter' as const,
              miterLimit: 10,
              dashArray: [],
              opacity: 1,
            },
            opacity: 1,
          },
          nodes: [
            { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' as const },
            { point: { x: Infinity, y: 100 }, inHandle: null, outHandle: null, kind: 'corner' as const },
          ],
          closed: false,
        },
      },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: ['obj-6'],
        },
      },
    };
    const violations = validateInvariants(brokenDoc);
    expect(violations.some((v) => v.code === 'NON_FINITE_PATH_NODE')).toBe(true);
  });

  it('detects path with too few nodes', () => {
    const doc = createDefaultDocument();
    const brokenDoc = {
      ...doc,
      objects: {
        'obj-7': {
          type: 'path' as const,
          id: 'obj-7',
          name: 'P',
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
          transform: createTransform({ x: 0, y: 0 }),
          style: defaultObjectStyle,
          nodes: [
            { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' as const },
          ],
          closed: false,
        },
      },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: ['obj-7'],
        },
      },
    };
    const violations = validateInvariants(brokenDoc);
    expect(violations.some((v) => v.code === 'INVALID_PATH_NODE_COUNT')).toBe(true);
  });
});

describe('NaN and Infinity Invariant Validation', () => {
  it('detects NaN stroke width', () => {
    const doc = createDefaultDocument();
    const brokenDoc = {
      ...doc,
      objects: {
        'obj-nan-1': {
          type: 'rectangle' as const,
          id: 'obj-nan-1',
          name: 'R',
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
          transform: createTransform({ x: 0, y: 0 }),
          style: {
            fill: { type: 'none' as const },
            stroke: {
              color: '#000',
              width: NaN,
              lineCap: 'butt' as const,
              lineJoin: 'miter' as const,
              miterLimit: 10,
              dashArray: [],
              opacity: 1,
            },
            opacity: 1,
          },
          width: 100,
          height: 100,
          cornerRadius: 0,
        },
      },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: ['obj-nan-1'],
        },
      },
    };
    const violations = validateInvariants(brokenDoc);
    expect(violations.some((v) => v.code === 'INVALID_STROKE_WIDTH')).toBe(true);
  });

  it('detects Infinity in width', () => {
    const doc = createDefaultDocument();
    const brokenDoc = {
      ...doc,
      objects: {
        'obj-inf-1': {
          type: 'rectangle' as const,
          id: 'obj-inf-1',
          name: 'R',
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
          transform: createTransform({ x: 0, y: 0 }),
          style: defaultObjectStyle,
          width: Infinity,
          height: 100,
          cornerRadius: 0,
        },
      },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: ['obj-inf-1'],
        },
      },
    };
    const violations = validateInvariants(brokenDoc);
    expect(violations.some((v) => v.code === 'INVALID_WIDTH')).toBe(true);
  });

  it('detects NaN in gradient stop offset', () => {
    const doc = createDefaultDocument();
    const brokenDoc = {
      ...doc,
      objects: {
        'obj-nan-grad': {
          type: 'rectangle' as const,
          id: 'obj-nan-grad',
          name: 'R',
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
          transform: createTransform({ x: 0, y: 0 }),
          style: {
            fill: {
              type: 'linear-gradient' as const,
              start: { x: 0, y: 0 },
              end: { x: 100, y: 100 },
              stops: [
                { offset: 0, color: '#fff', opacity: 1 },
                { offset: NaN, color: '#000', opacity: 1 },
              ],
            },
            stroke: null,
            opacity: 1,
          },
          width: 100,
          height: 100,
          cornerRadius: 0,
        },
      },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: ['obj-nan-grad'],
        },
      },
    };
    const violations = validateInvariants(brokenDoc);
    expect(violations.some((v) => v.code === 'INVALID_GRADIENT_OFFSET')).toBe(true);
  });

  it('detects NaN in opacity', () => {
    const doc = createDefaultDocument();
    const brokenDoc = {
      ...doc,
      objects: {
        'obj-nan-opacity': {
          type: 'rectangle' as const,
          id: 'obj-nan-opacity',
          name: 'R',
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
          transform: createTransform({ x: 0, y: 0 }),
          style: {
            fill: { type: 'solid' as const, color: '#fff' },
            stroke: null,
            opacity: NaN,
          },
          width: 100,
          height: 100,
          cornerRadius: 0,
        },
      },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: ['obj-nan-opacity'],
        },
      },
    };
    const violations = validateInvariants(brokenDoc);
    expect(violations.some((v) => v.code === 'INVALID_OPACITY')).toBe(true);
  });

  it('detects Infinity in miterLimit', () => {
    const doc = createDefaultDocument();
    const brokenDoc = {
      ...doc,
      objects: {
        'obj-inf-miter': {
          type: 'rectangle' as const,
          id: 'obj-inf-miter',
          name: 'R',
          layerId: doc.activeLayerId,
          visible: true,
          locked: false,
          transform: createTransform({ x: 0, y: 0 }),
          style: {
            fill: { type: 'none' as const },
            stroke: {
              color: '#000',
              width: 2,
              lineCap: 'butt' as const,
              lineJoin: 'miter' as const,
              miterLimit: Infinity,
              dashArray: [],
              opacity: 1,
            },
            opacity: 1,
          },
          width: 100,
          height: 100,
          cornerRadius: 0,
        },
      },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: ['obj-inf-miter'],
        },
      },
    };
    const violations = validateInvariants(brokenDoc);
    expect(violations.some((v) => v.code === 'INVALID_MITER_LIMIT')).toBe(true);
  });
});
