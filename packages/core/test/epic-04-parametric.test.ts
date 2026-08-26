import { describe, expect, it } from 'vitest';
import {
  createDefaultDocument,
  createTransform,
  defaultObjectStyle,
  defaultStroke,
  getObjectBounds,
  getPolygonVertices,
  getStarVertices,
  approximateArc,
  getSpiralVertices,
  getCalloutVertices,
  getArrowheadVertices,
  validateInvariants,
  SetPolygonGeometryCommand,
  SetStarGeometryCommand,
  SetArcGeometryCommand,
  SetPieGeometryCommand,
  SetRingGeometryCommand,
  SetSpiralGeometryCommand,
  SetCalloutGeometryCommand,
  SetPolylineGeometryCommand,
  SetStrokeArrowheadsCommand,
  CommandHistory,
  type DocumentModel,
  type PolygonObject,
  type StarObject,
  type ArcObject,
  type PieObject,
  type RingObject,
  type SpiralObject,
  type CalloutObject,
  type PolylineObject,
} from '../src/index.js';

function baseDoc(): DocumentModel {
  return createDefaultDocument({ width: 800, height: 600 });
}

function addObjects(doc: DocumentModel, objects: Record<string, import('../src/index.js').SceneObject>): DocumentModel {
  const layerId = doc.activeLayerId;
  return { ...doc, objects: { ...doc.objects, ...objects }, layers: { ...doc.layers, [layerId]: { ...doc.layers[layerId]!, objectIds: [...doc.layers[layerId]!.objectIds, ...Object.keys(objects)] } } };
}

const common = (id: string, layerId: string) => ({ id, name: id, layerId, visible: true, locked: false, transform: createTransform({ x: 100, y: 100 }), style: defaultObjectStyle });

function sampleObjects(layerId: string): Record<string, import('../src/index.js').SceneObject> {
  return {
    poly: { ...common('poly', layerId), type: 'polygon', sides: 6, radius: 40 } as PolygonObject,
    star: { ...common('star', layerId), type: 'star', points: 5, outerRadius: 40, innerRadius: 20 } as StarObject,
    arc: { ...common('arc', layerId), type: 'arc', radiusX: 40, radiusY: 30, startAngle: 0, endAngle: Math.PI * 1.5, closed: false, style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke } } as ArcObject,
    pie: { ...common('pie', layerId), type: 'pie', radiusX: 40, radiusY: 40, startAngle: 0, endAngle: Math.PI } as PieObject,
    ring: { ...common('ring', layerId), type: 'ring', outerRadius: 40, innerRadius: 20 } as RingObject,
    spiral: { ...common('spiral', layerId), type: 'spiral', turns: 3, decay: 10, direction: 'cw', style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke } } as SpiralObject,
    callout: { ...common('callout', layerId), type: 'callout', width: 120, height: 80, cornerRadius: 8, tailTip: { x: 40, y: 110 }, tailBaseWidth: 20 } as CalloutObject,
    polyline: { ...common('polyline', layerId), type: 'polyline', points: [{ x: 0, y: 0 }, { x: 50, y: 20 }, { x: 90, y: -10 }], style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke } } as PolylineObject,
  };
}

describe('EPIC-04 parametric geometry', () => {
  it('generates polygon vertices starting at the top', () => {
    const vertices = getPolygonVertices(4, 50);
    expect(vertices).toHaveLength(4);
    expect(vertices[0]!.x).toBeCloseTo(0);
    expect(vertices[0]!.y).toBeCloseTo(-50);
  });

  it('alternates star radii between outer and inner', () => {
    const vertices = getStarVertices(5, 40, 20);
    expect(vertices).toHaveLength(10);
    for (let i = 0; i < vertices.length; i += 1) {
      const radius = Math.hypot(vertices[i]!.x, vertices[i]!.y);
      expect(radius).toBeCloseTo(i % 2 === 0 ? 40 : 20);
    }
  });

  it('samples arcs from start to end angle', () => {
    const points = approximateArc(30, 20, 0, Math.PI / 2, 8);
    expect(points).toHaveLength(9);
    expect(points[0]!.x).toBeCloseTo(30);
    expect(points[0]!.y).toBeCloseTo(0);
    const last = points[points.length - 1]!;
    expect(last.x).toBeCloseTo(0, 5);
    expect(last.y).toBeCloseTo(20);
  });

  it('grows spiral radius by decay per turn', () => {
    const points = getSpiralVertices(2, 12, 'cw', 16);
    const finalRadius = Math.hypot(points[points.length - 1]!.x, points[points.length - 1]!.y);
    expect(finalRadius).toBeCloseTo(24, 1);
    const ccw = getSpiralVertices(1, 10, 'ccw', 8);
    expect(ccw[ccw.length - 1]!.y).toBeLessThanOrEqual(0.0001);
  });

  it('builds a closed callout loop containing the tail tip', () => {
    const tip = { x: 40, y: 130 };
    const vertices = getCalloutVertices(120, 80, 8, tip, 20);
    expect(vertices.some((v) => v.x === tip.x && v.y === tip.y)).toBe(true);
    const first = vertices[0]!;
    const last = vertices[vertices.length - 1]!;
    expect(first.x === last.x && first.y === last.y).toBe(false);
  });

  it('orients arrowhead vertices along the tangent', () => {
    const vertices = getArrowheadVertices('triangle', 10, { x: 100, y: 0 }, { x: 1, y: 0 });
    const tip = vertices[0]!;
    expect(tip.x).toBeCloseTo(100);
    expect(tip.y).toBeCloseTo(0);
    for (const vertex of vertices.slice(1)) expect(vertex.x).toBeLessThan(100);
  });
});

describe('EPIC-04 bounds and invariants', () => {
  it('returns finite positive-area bounds for every new shape', () => {
    const base = baseDoc();
    const doc = addObjects(base, sampleObjects(base.activeLayerId));
    for (const id of ['poly', 'star', 'arc', 'pie', 'ring', 'spiral', 'callout', 'polyline']) {
      const object = doc.objects[id]!;
      const bounds = getObjectBounds(object, doc);
      expect(Number.isFinite(bounds.x)).toBe(true);
      expect(bounds.width).toBeGreaterThan(0);
      expect(bounds.height).toBeGreaterThan(0);
    }
  });

  it('flags invalid parametric parameters through invariants', () => {
    const base = baseDoc();
    const doc = addObjects(base, {
      badPoly: { ...common('badPoly', base.activeLayerId), type: 'polygon', sides: 2, radius: 40 } as unknown as PolygonObject,
      badRing: { ...common('badRing', base.activeLayerId), type: 'ring', outerRadius: 10, innerRadius: 20 } as RingObject,
      badSpiral: { ...common('badSpiral', base.activeLayerId), type: 'spiral', turns: 25, decay: 5, direction: 'cw' } as SpiralObject,
      badLine: { ...common('badLine', base.activeLayerId), type: 'polyline', points: [{ x: 0, y: 0 }], style: defaultObjectStyle } as PolylineObject,
    });
    const codes = validateInvariants(doc).map((violation) => violation.code);
    expect(codes).toContain('INVALID_POLYGON_SIDES');
    expect(codes).toContain('INVALID_RING_RADII');
    expect(codes).toContain('INVALID_SPIRAL_TURNS');
    expect(codes).toContain('INVALID_POLYLINE_POINTS');
  });

  it('accepts valid parametric documents', () => {
    const base = baseDoc();
    const doc = addObjects(base, sampleObjects(base.activeLayerId));
    expect(validateInvariants(doc)).toHaveLength(0);
  });
});

describe('EPIC-04 command contracts', () => {
  it('edits and reverts polygon geometry exactly', () => {
    const history = new CommandHistory();
    const base = baseDoc();
    let doc = addObjects(base, { poly: { ...common('poly', base.activeLayerId), type: 'polygon', sides: 6, radius: 40 } as PolygonObject });
    doc = history.execute(new SetPolygonGeometryCommand('poly', { sides: 3, radius: 80 }), doc);
    expect((doc.objects['poly'] as PolygonObject).sides).toBe(3);
    expect((doc.objects['poly'] as PolygonObject).radius).toBe(80);
    doc = history.undo(doc)!;
    expect((doc.objects['poly'] as PolygonObject).sides).toBe(6);
    expect((doc.objects['poly'] as PolygonObject).radius).toBe(40);
    doc = history.redo(doc)!;
    expect((doc.objects['poly'] as PolygonObject).radius).toBe(80);
  });

  it('rejects patches violating invariants without mutating the document', () => {
    const base = baseDoc();
    let doc = addObjects(base, { ring: { ...common('ring', base.activeLayerId), type: 'ring', outerRadius: 40, innerRadius: 20 } as RingObject });
    const before = doc;
    doc = new SetRingGeometryCommand('ring', { innerRadius: 50 }).execute(doc);
    expect(doc).toBe(before);
  });

  it('supports star, arc, pie, spiral and callout edits with undo', () => {
    const history = new CommandHistory();
    const base = baseDoc();
    let doc = addObjects(base, sampleObjects(base.activeLayerId));
    doc = history.execute(new SetStarGeometryCommand('star', { points: 8 }), doc);
    expect((doc.objects['star'] as StarObject).points).toBe(8);
    doc = history.execute(new SetArcGeometryCommand('arc', { endAngle: Math.PI * 2 }), doc);
    expect((doc.objects['arc'] as ArcObject).endAngle).toBeCloseTo(Math.PI * 2);
    doc = history.execute(new SetPieGeometryCommand('pie', { startAngle: -Math.PI / 2 }), doc);
    expect((doc.objects['pie'] as PieObject).startAngle).toBeCloseTo(-Math.PI / 2);
    doc = history.execute(new SetSpiralGeometryCommand('spiral', { turns: 5, direction: 'ccw' }), doc);
    expect((doc.objects['spiral'] as SpiralObject).direction).toBe('ccw');
    doc = history.execute(new SetCalloutGeometryCommand('callout', { tailBaseWidth: 36 }), doc);
    expect((doc.objects['callout'] as CalloutObject).tailBaseWidth).toBe(36);
    for (let i = 0; i < 5; i += 1) {
      const undone = history.undo(doc);
      expect(undone).not.toBeNull();
      doc = undone!;
    }
    expect((doc.objects['star'] as StarObject).points).toBe(5);
    expect((doc.objects['callout'] as CalloutObject).tailBaseWidth).toBe(20);
  });

  it('sets and clears arrowheads as one undoable style change', () => {
    const history = new CommandHistory();
    const base = baseDoc();
    let doc = addObjects(base, { line: { ...common('line', base.activeLayerId), type: 'line', endPoint: { x: 100, y: 0 }, style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke } } as import('../src/index.js').LineObject });
    doc = history.execute(new SetStrokeArrowheadsCommand('line', { markerStart: null, markerEnd: { type: 'triangle', size: 12 } }), doc);
    expect(doc.objects['line']!.style.stroke?.markerEnd?.type).toBe('triangle');
    expect(doc.objects['line']!.style.stroke?.markerStart).toBeUndefined();
    doc = history.undo(doc)!;
    expect(doc.objects['line']!.style.stroke?.markerEnd).toBeUndefined();
    doc = history.execute(new SetStrokeArrowheadsCommand('line', { markerStart: { type: 'circle', size: 8 }, markerEnd: null }), doc);
    expect(doc.objects['line']!.style.stroke?.markerStart?.type).toBe('circle');
  });

  it('replaces polyline points atomically', () => {
    const history = new CommandHistory();
    const base = baseDoc();
    let doc = addObjects(base, { pl: { ...common('pl', base.activeLayerId), type: 'polyline', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke } } as PolylineObject });
    const next = [{ x: 0, y: 0 }, { x: 20, y: 5 }, { x: 40, y: 0 }];
    doc = history.execute(new SetPolylineGeometryCommand('pl', { points: next }), doc);
    expect((doc.objects['pl'] as PolylineObject).points).toEqual(next);
    doc = history.undo(doc)!;
    expect((doc.objects['pl'] as PolylineObject).points).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
  });
});
