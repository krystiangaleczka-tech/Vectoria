import { describe, it, expect } from 'vitest';
import { hitTest } from '../src/index.js';
import {
  createDefaultDocument,
  createTransform,
  defaultObjectStyle,
  type DocumentModel,
  type RectangleObject,
  type EllipseObject,
  type LineObject,
  type PathObject,
} from '@vectoria/core';

function makeDocWithObject(obj: DocumentModel['objects'][string]): DocumentModel {
  const doc = createDefaultDocument({ width: 1000, height: 1000 });
  return {
    ...doc,
    objects: { [obj.id]: obj },
    layers: {
      ...doc.layers,
      [doc.activeLayerId]: {
        ...doc.layers[doc.activeLayerId]!,
        objectIds: [obj.id],
      },
    },
  };
}

describe('Hit Testing', () => {
  describe('Rectangle', () => {
    it('hits inside a filled rectangle', () => {
      const rect: RectangleObject = {
        type: 'rectangle',
        id: 'rect-1',
        name: 'Rect',
        layerId: 'layer-1',
        visible: true,
        locked: false,
        transform: createTransform({ x: 100, y: 100 }),
        style: { ...defaultObjectStyle, fill: { type: 'solid', color: '#ff0000' } },
        width: 200,
        height: 150,
        cornerRadius: 0,
      };
      const doc = makeDocWithObject(rect);
      expect(hitTest(doc, { x: 150, y: 150 })).toBe('rect-1');
      expect(hitTest(doc, { x: 250, y: 200 })).toBe('rect-1');
    });

    it('misses outside a rectangle', () => {
      const rect: RectangleObject = {
        type: 'rectangle',
        id: 'rect-2',
        name: 'Rect',
        layerId: 'layer-1',
        visible: true,
        locked: false,
        transform: createTransform({ x: 100, y: 100 }),
        style: defaultObjectStyle,
        width: 200,
        height: 150,
        cornerRadius: 0,
      };
      const doc = makeDocWithObject(rect);
      expect(hitTest(doc, { x: 50, y: 50 })).toBeNull();
      expect(hitTest(doc, { x: 400, y: 400 })).toBeNull();
    });

    it('misses inside no-fill rectangle (stroke only)', () => {
      const rect: RectangleObject = {
        type: 'rectangle',
        id: 'rect-3',
        name: 'Rect',
        layerId: 'layer-1',
        visible: true,
        locked: false,
        transform: createTransform({ x: 100, y: 100 }),
        style: {
          fill: { type: 'none' },
          stroke: { color: '#000', width: 2, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, dashArray: [], opacity: 1 },
          opacity: 1,
        },
        width: 200,
        height: 150,
        cornerRadius: 0,
      };
      const doc = makeDocWithObject(rect);
      // Center of the rectangle should NOT hit (no fill)
      expect(hitTest(doc, { x: 200, y: 175 })).toBeNull();
      // Near edge should hit (stroke tolerance)
      expect(hitTest(doc, { x: 101, y: 150 })).toBe('rect-3');
    });
  });

  describe('Ellipse', () => {
    it('hits inside a filled ellipse', () => {
      const ellipse: EllipseObject = {
        type: 'ellipse',
        id: 'ell-1',
        name: 'Ellipse',
        layerId: 'layer-1',
        visible: true,
        locked: false,
        transform: createTransform({ x: 100, y: 100 }),
        style: { ...defaultObjectStyle, fill: { type: 'solid', color: '#00ff00' } },
        width: 200,
        height: 200,
      };
      const doc = makeDocWithObject(ellipse);
      // Center of ellipse (100+100, 100+100) = (200, 200)
      expect(hitTest(doc, { x: 200, y: 200 })).toBe('ell-1');
      expect(hitTest(doc, { x: 150, y: 150 })).toBe('ell-1');
    });

    it('misses outside ellipse bounds', () => {
      const ellipse: EllipseObject = {
        type: 'ellipse',
        id: 'ell-2',
        name: 'Ellipse',
        layerId: 'layer-1',
        visible: true,
        locked: false,
        transform: createTransform({ x: 100, y: 100 }),
        style: defaultObjectStyle,
        width: 200,
        height: 200,
      };
      const doc = makeDocWithObject(ellipse);
      // Corner of bounding box (outside ellipse)
      expect(hitTest(doc, { x: 101, y: 101 })).toBeNull();
      expect(hitTest(doc, { x: 50, y: 50 })).toBeNull();
    });
  });

  describe('Line', () => {
    it('hits on a line segment within tolerance', () => {
      const line: LineObject = {
        type: 'line',
        id: 'line-1',
        name: 'Line',
        layerId: 'layer-1',
        visible: true,
        locked: false,
        transform: createTransform({ x: 100, y: 100 }),
        style: {
          fill: { type: 'none' },
          stroke: { color: '#000', width: 2, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, dashArray: [], opacity: 1 },
          opacity: 1,
        },
        endPoint: { x: 300, y: 100 },
      };
      const doc = makeDocWithObject(line);
      // Line in world space: (100,100) → (400,200)
      // Midpoint in world space: (250, 150)
      expect(hitTest(doc, { x: 250, y: 150 })).toBe('line-1');
      // Near the line (within 4px tolerance)
      expect(hitTest(doc, { x: 250, y: 153 })).toBe('line-1');
    });

    it('misses far from line', () => {
      const line: LineObject = {
        type: 'line',
        id: 'line-2',
        name: 'Line',
        layerId: 'layer-1',
        visible: true,
        locked: false,
        transform: createTransform({ x: 100, y: 100 }),
        style: {
          fill: { type: 'none' },
          stroke: { color: '#000', width: 2, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, dashArray: [], opacity: 1 },
          opacity: 1,
        },
        endPoint: { x: 300, y: 100 },
      };
      const doc = makeDocWithObject(line);
      // Line in world: (100,100) → (400,200), far point
      expect(hitTest(doc, { x: 250, y: 500 })).toBeNull();
      expect(hitTest(doc, { x: 50, y: 100 })).toBeNull();
    });
  });

  describe('Path', () => {
    it('hits inside a filled closed path', () => {
      const path: PathObject = {
        type: 'path',
        id: 'path-1',
        name: 'Path',
        layerId: 'layer-1',
        visible: true,
        locked: false,
        transform: createTransform({ x: 100, y: 100 }),
        style: { ...defaultObjectStyle, fill: { type: 'solid', color: '#0000ff' } },
        nodes: [
          { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
          { point: { x: 200, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
          { point: { x: 200, y: 200 }, inHandle: null, outHandle: null, kind: 'corner' },
          { point: { x: 0, y: 200 }, inHandle: null, outHandle: null, kind: 'corner' },
        ],
        closed: true,
      };
      const doc = makeDocWithObject(path);
      // Center of the path
      expect(hitTest(doc, { x: 200, y: 200 })).toBe('path-1');
      expect(hitTest(doc, { x: 150, y: 150 })).toBe('path-1');
    });

    it('hits on stroke of an open path', () => {
      const path: PathObject = {
        type: 'path',
        id: 'path-2',
        name: 'Path',
        layerId: 'layer-1',
        visible: true,
        locked: false,
        transform: createTransform({ x: 100, y: 100 }),
        style: {
          fill: { type: 'none' },
          stroke: { color: '#000', width: 2, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, dashArray: [], opacity: 1 },
          opacity: 1,
        },
        nodes: [
          { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
          { point: { x: 200, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
          { point: { x: 200, y: 200 }, inHandle: null, outHandle: null, kind: 'corner' },
        ],
        closed: false,
      };
      const doc = makeDocWithObject(path);
      // Path in world: (100,100) → (300,100) → (300,300)
      // On the first segment: midpoint (200, 100)
      expect(hitTest(doc, { x: 200, y: 100 })).toBe('path-2');
      // On the second segment: midpoint (300, 200)
      expect(hitTest(doc, { x: 300, y: 200 })).toBe('path-2');
    });

    it('misses far from path', () => {
      const path: PathObject = {
        type: 'path',
        id: 'path-3',
        name: 'Path',
        layerId: 'layer-1',
        visible: true,
        locked: false,
        transform: createTransform({ x: 100, y: 100 }),
        style: {
          fill: { type: 'none' },
          stroke: { color: '#000', width: 2, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, dashArray: [], opacity: 1 },
          opacity: 1,
        },
        nodes: [
          { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
          { point: { x: 200, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
        ],
        closed: false,
      };
      const doc = makeDocWithObject(path);
      expect(hitTest(doc, { x: 200, y: 500 })).toBeNull();
    });
  });

  describe('Z-order and visibility', () => {
    it('returns topmost object when overlapping', () => {
      const doc = createDefaultDocument({ width: 1000, height: 1000 });
      const r1: RectangleObject = {
        type: 'rectangle',
        id: 'r1',
        name: 'R1',
        layerId: doc.activeLayerId,
        visible: true,
        locked: false,
        transform: createTransform({ x: 100, y: 100 }),
        style: defaultObjectStyle,
        width: 200,
        height: 200,
        cornerRadius: 0,
      };
      const r2: RectangleObject = {
        ...r1,
        id: 'r2',
        name: 'R2',
      };
      const docWithRects = {
        ...doc,
        objects: { r1, r2 },
        layers: {
          ...doc.layers,
          [doc.activeLayerId]: {
            ...doc.layers[doc.activeLayerId]!,
            objectIds: ['r1', 'r2'],
          },
        },
      };
      // r2 is on top (last in array) — should hit r2
      expect(hitTest(docWithRects, { x: 150, y: 150 })).toBe('r2');
    });

    it('skips invisible objects', () => {
      const rect: RectangleObject = {
        type: 'rectangle',
        id: 'rect-hidden',
        name: 'Hidden',
        layerId: 'layer-1',
        visible: false,
        locked: false,
        transform: createTransform({ x: 100, y: 100 }),
        style: defaultObjectStyle,
        width: 200,
        height: 200,
        cornerRadius: 0,
      };
      const doc = makeDocWithObject(rect);
      expect(hitTest(doc, { x: 150, y: 150 })).toBeNull();
    });
  });
});

describe('Hit Testing — Bézier Path', () => {
  it('hits on a Bézier curve segment (not just straight line between nodes)', () => {
    // Path with handles that create a curve that deviates significantly
    // from the straight line between nodes
    const path: PathObject = {
      type: 'path',
      id: 'bezier-1',
      name: 'Bezier',
      layerId: 'layer-1',
      visible: true,
      locked: false,
      transform: createTransform({ x: 0, y: 0 }),
      style: {
        fill: { type: 'none' },
        stroke: { color: '#000', width: 2, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, dashArray: [], opacity: 1 },
        opacity: 1,
      },
      nodes: [
        { point: { x: 0, y: 0 }, inHandle: null, outHandle: { x: 0, y: 200 }, kind: 'smooth' },
        { point: { x: 200, y: 0 }, inHandle: { x: 200, y: 200 }, outHandle: null, kind: 'smooth' },
      ],
      closed: false,
    };
    const doc = makeDocWithObject(path);

    // The Bézier curve bows downward to about y=150 at x=100
    // A point on the curve should be hittable
    // At t=0.5: B(0.5) with these control points gives approximately (100, 150)
    expect(hitTest(doc, { x: 100, y: 150 })).toBe('bezier-1');

    // A point on the straight line between nodes (y=0) should NOT hit
    // because the curve bows away from it
    expect(hitTest(doc, { x: 100, y: 0 })).toBeNull();
  });

  it('hits inside a closed Bézier path with fill', () => {
    const path: PathObject = {
      type: 'path',
      id: 'bezier-closed',
      name: 'Closed Bezier',
      layerId: 'layer-1',
      visible: true,
      locked: false,
      transform: createTransform({ x: 100, y: 100 }),
      style: { ...defaultObjectStyle, fill: { type: 'solid', color: '#ff0000' } },
      nodes: [
        { point: { x: 0, y: 0 }, inHandle: null, outHandle: { x: 50, y: -50 }, kind: 'smooth' },
        { point: { x: 100, y: 0 }, inHandle: { x: 50, y: -50 }, outHandle: { x: 150, y: 50 }, kind: 'smooth' },
        { point: { x: 100, y: 100 }, inHandle: { x: 150, y: 50 }, outHandle: { x: 50, y: 150 }, kind: 'smooth' },
        { point: { x: 0, y: 100 }, inHandle: { x: 50, y: 150 }, outHandle: { x: -50, y: 50 }, kind: 'smooth' },
      ],
      closed: true,
    };
    const doc = makeDocWithObject(path);

    // Center of the path in world space (transform at 100,100 + center ~50,50)
    expect(hitTest(doc, { x: 150, y: 150 })).toBe('bezier-closed');
  });
});
