import { describe, expect, it } from 'vitest';
import { createDefaultDocument, createTransform, defaultObjectStyle, defaultStroke, type DocumentModel, type PolygonObject, type StarObject, type PolylineObject, type LineObject, type EllipseObject, type RectangleObject, type MaskGroup } from '@vectoria/core';
import { exportArtboardToSvg, importSvgToDocument } from '../src/index.js';

function docWith(objects: Record<string, import('@vectoria/core').SceneObject>): DocumentModel {
  const base = createDefaultDocument({ width: 800, height: 600 });
  const layerId = base.activeLayerId;
  return {
    ...base,
    objects,
    layers: { ...base.layers, [layerId]: { ...base.layers[layerId]!, objectIds: Object.keys(objects) } },
  };
}

describe('EPIC-04 SVG export/import', () => {
  const base = () => createDefaultDocument({ width: 800, height: 600 });

  it('exports polygon and star as <polygon points>', () => {
    const id = base().activeLayerId;
    const poly: PolygonObject = { type: 'polygon', id: 'p1', name: 'p1', layerId: id, visible: true, locked: false, transform: createTransform({ x: 100, y: 100 }), style: defaultObjectStyle, sides: 6, radius: 40 };
    const star: StarObject = { type: 'star', id: 's1', name: 's1', layerId: id, visible: true, locked: false, transform: createTransform({ x: 300, y: 100 }), style: defaultObjectStyle, points: 5, outerRadius: 40, innerRadius: 20 };
    const svg = exportArtboardToSvg(docWith({ p1: poly, s1: star }));
    expect(svg.match(/<polygon/g)).toHaveLength(2);
  });

  it('exports ring with evenodd fill rule', () => {
    const id = base().activeLayerId;
    const ring = { type: 'ring' as const, id: 'r1', name: 'r1', layerId: id, visible: true, locked: false, transform: createTransform({ x: 100, y: 100 }), style: defaultObjectStyle, outerRadius: 50, innerRadius: 25 };
    const svg = exportArtboardToSvg(docWith({ r1: ring }));
    expect(svg).toContain('fill-rule="evenodd"');
  });

  it('emits arrowhead marker defs and references them on line stroke', () => {
    const id = base().activeLayerId;
    const line: LineObject = { type: 'line', id: 'l1', name: 'l1', layerId: id, visible: true, locked: false, transform: createTransform({ x: 0, y: 0 }), style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: { ...defaultStroke, markerEnd: { type: 'triangle', size: 12 } } }, endPoint: { x: 200, y: 0 } };
    const svg = exportArtboardToSvg(docWith({ l1: line }));
    expect(svg).toContain('<marker');
    expect(svg).toContain('marker-end="url(#');
  });

  // DOMParser is unavailable in the node test environment; import tests run
  // wherever a DOM exists (browser-based runs, CI with a DOM shim installed).
  const hasDom = typeof DOMParser !== 'undefined';

  it.skipIf(!hasDom)('round-trips polyline points through export and import', () => {
    const id = base().activeLayerId;
    const polyline: PolylineObject = { type: 'polyline', id: 'pl1', name: 'pl1', layerId: id, visible: true, locked: false, transform: createTransform({ x: 10, y: 20 }), style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke }, points: [{ x: 0, y: 0 }, { x: 50, y: 25 }, { x: 90, y: -5 }] };
    const svg = exportArtboardToSvg(docWith({ pl1: polyline }));
    expect(svg).toContain('<polyline');
    const reimported = importSvgToDocument(svg);
    const importedValues = Object.values(reimported.objects) as PolylineObject[];
    const restored = importedValues.find((object) => object.type === 'polyline');
    expect(restored).toBeDefined();
    expect(restored!.points).toHaveLength(3);
    expect(restored!.points[2]!.x).toBeCloseTo(90 - 10);
    expect(restored!.points[2]!.y).toBeCloseTo(-5 - 20);
  });

  it.skipIf(!hasDom)('imports <polygon> as closed corner path preserving vertex count', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="0,0 50,10 60,60 10,50" fill="#ff0000" /></svg>`;
    const doc = importSvgToDocument(svg);
    const objects = Object.values(doc.objects);
    expect(objects).toHaveLength(1);
    const path = objects[0] as Extract<import('@vectoria/core').SceneObject, { type: 'path' }>;
    expect(path.type).toBe('path');
    expect(path.closed).toBe(true);
    expect(path.nodes).toHaveLength(4);
    expect(path.nodes.every((node) => node.kind === 'corner')).toBe(true);
  });

  it.skipIf(!hasDom)('imports <circle> as an ellipse with equal radii and applies markers to lines', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs><marker id="m1" markerWidth="12" markerHeight="12" refX="0" refY="0" orient="auto"><path d="M 0 0 L -12 -6 L -12 6 Z" /></marker></defs>
      <circle cx="50" cy="50" r="20" fill="#00ff00" />
      <line x1="0" y1="0" x2="80" y2="40" stroke="#000000" marker-end="url(#m1)" />
    </svg>`;
    const doc = importSvgToDocument(svg);
    const values = Object.values(doc.objects);
    const circle = values.find((object) => object.type === 'ellipse') as EllipseObject | undefined;
    expect(circle).toBeDefined();
    expect(circle!.width).toBeCloseTo(circle!.height);
    const line = values.find((object) => object.type === 'line') as LineObject | undefined;
    expect(line).toBeDefined();
    expect(line!.style.stroke?.markerEnd?.type).toBe('triangle');
  });

  it('exports mask groups as defs + wrapped content and compound paths with fill-rule', () => {
    const id = base().activeLayerId;
    const maskShape: RectangleObject = { type: 'rectangle', id: 'm1', name: 'm1', layerId: id, visible: true, locked: false, transform: createTransform({ x: 0, y: 0 }), style: defaultObjectStyle, width: 100, height: 100, cornerRadius: 0 };
    const content: PolylineObject = { type: 'polyline', id: 'c1', name: 'c1', layerId: id, visible: true, locked: false, transform: createTransform({ x: 10, y: 10 }), style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke }, points: [{ x: 0, y: 0 }, { x: 50, y: 50 }] };
    const group: MaskGroup = { id: 'mg1', mode: 'clip', maskId: 'm1', contentIds: ['c1'] };
    const svg = exportArtboardToSvg({ ...docWith({ m1: maskShape, c1: content }), maskGroups: { mg1: group } });

    expect(svg).toContain('<clipPath id="mask-mg1">');
    expect(svg).toContain('clip-path="url(#mask-mg1)"');
    // Mask shape is not drawn directly; exactly one polyline (the wrapped
    // content) and no standalone rect reach the body.
    expect(svg.match(/<polyline/g)).toHaveLength(1);
    // Two clipPaths total: the artboard clip plus the mask geometry def.
    expect(svg.match(/<clipPath/g)).toHaveLength(2);
    expect(svg).toContain('clip-rule="evenodd"');

    const holeOuter = {
      type: 'path' as const, id: 'ho', name: 'ho', layerId: id, visible: true, locked: false,
      transform: createTransform({ x: 0, y: 0 }), style: defaultObjectStyle,
      closed: true, fillRule: 'evenodd' as const,
      nodes: [createNode(0, 0), createNode(100, 0), createNode(100, 100), createNode(0, 100)],
      compoundChildren: [[createNode(40, 40), createNode(60, 40), createNode(60, 60), createNode(40, 60)]],
    };
    const svgHole = exportArtboardToSvg(docWith({ ho: holeOuter as unknown as DocumentModel['objects'][string] }));
    expect(svgHole).toContain('fill-rule="evenodd"');
  });
});

function createNode(x: number, y: number) {
  return { id: `n-${x}-${y}`, point: { x, y }, inHandle: null, outHandle: null, kind: 'corner' as const };
}
