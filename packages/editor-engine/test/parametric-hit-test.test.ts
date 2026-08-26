import { describe, expect, it } from 'vitest';
import { createDefaultDocument, createTransform, defaultObjectStyle, defaultStroke, type DocumentModel, type PolygonObject, type RingObject, type PieObject, type PolylineObject } from '@vectoria/core';
import { hitTest } from '../src/hit-test.js';

function docWith(objects: Record<string, import('@vectoria/core').SceneObject>): DocumentModel {
  const base = createDefaultDocument({ width: 800, height: 600 });
  const layerId = base.activeLayerId;
  return {
    ...base,
    objects,
    layers: { ...base.layers, [layerId]: { ...base.layers[layerId]!, objectIds: Object.keys(objects) } },
  };
}

describe('EPIC-04 parametric hit-testing', () => {
  const layerId = '';

  function build(): DocumentModel {
    const base = createDefaultDocument({ width: 800, height: 600 });
    const id0 = base.activeLayerId;
    const poly: PolygonObject = { type: 'polygon', id: 'poly', name: 'poly', layerId: id0, visible: true, locked: false, transform: createTransform({ x: 200, y: 200 }), style: defaultObjectStyle, sides: 4, radius: 50 };
    const ring: RingObject = { type: 'ring', id: 'ring', name: 'ring', layerId: id0, visible: true, locked: false, transform: createTransform({ x: 400, y: 200 }), style: defaultObjectStyle, outerRadius: 50, innerRadius: 20 };
    const pie: PieObject = { type: 'pie', id: 'pie', name: 'pie', layerId: id0, visible: true, locked: false, transform: createTransform({ x: 600, y: 200 }), style: defaultObjectStyle, radiusX: 60, radiusY: 60, startAngle: 0, endAngle: Math.PI };
    const polyline: PolylineObject = { type: 'polyline', id: 'pl', name: 'pl', layerId: id0, visible: true, locked: false, transform: createTransform({ x: 100, y: 400 }), style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke }, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };
    void layerId;
    return docWith({ poly, ring, pie, polyline });
  }

  it('hits filled polygon interior and edges', () => {
    const doc = build();
    expect(hitTest(doc, { x: 200, y: 200 })).toBe('poly');
    // Diamond vertices: (200,150),(250,200),(200,250),(150,200). Point near
    // the lower-right edge but clearly inside.
    expect(hitTest(doc, { x: 215, y: 215 })).toBe('poly');
    expect(hitTest(doc, { x: 300, y: 300 })).toBeNull();
  });

  it('treats the ring hole as a miss but the band as a hit', () => {
    const doc = build();
    expect(hitTest(doc, { x: 400, y: 200 })).toBeNull(); // hole center
    expect(hitTest(doc, { x: 440, y: 200 })).toBe('ring'); // mid-band
    expect(hitTest(doc, { x: 400, y: 175 })).toBe('ring'); // radius 25 ∈ [20,50]
  });

  it('respects the angular sweep of a pie sector', () => {
    const doc = build();
    // Pie covers angles 0..π (lower half in screen coords).
    expect(hitTest(doc, { x: 630, y: 230 })).toBe('pie');
    expect(hitTest(doc, { x: 630, y: 170 })).toBeNull(); // upper half is outside sweep
  });

  it('hit-tests open polylines within stroke tolerance', () => {
    const doc = build();
    expect(hitTest(doc, { x: 150, y: 401 })).toBe('polyline');
    expect(hitTest(doc, { x: 150, y: 420 })).toBeNull();
  });
});
