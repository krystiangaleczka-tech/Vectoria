import { describe, it, expect } from 'vitest';
import {
  parseAndMigrateDocument,
  serializeDocument,
  exportArtboardToSvg,
  escapeXml,
} from '../src/index.js';
import {
  createDefaultDocument,
  createTransform,
  type RectangleObject,
  type EllipseObject,
  type LineObject,
  type PathObject,
} from '@vectoria/core';

describe('IO - DTO Validation and SVG Export', () => {
  it('parses versioned persisted envelope without changing document payload', () => {
    const doc = createDefaultDocument({ name: 'Envelope' });
    const parsed = parseAndMigrateDocument({
      app: 'vectoria', schemaVersion: 1, document: doc, revision: 7, savedAt: new Date().toISOString(),
    });
    expect(parsed).toEqual(doc);
  });

  it('serializes and parses DocumentV1DTO without loss', () => {
    const doc = createDefaultDocument({ name: 'Test Doc', width: 800, height: 600 });
    const json = serializeDocument(doc);
    const parsed = parseAndMigrateDocument(JSON.parse(json));

    expect(parsed.id).toBe(doc.id);
    expect(parsed.name).toBe('Test Doc');
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.artboardIds).toEqual(doc.artboardIds);
  });

  it('exports valid SVG with artboard viewBox, clipPath, and rectangle geometry', () => {
    const doc = createDefaultDocument({ width: 1000, height: 800 });
    const rect: RectangleObject = {
      type: 'rectangle',
      id: 'rect-1',
      name: 'Rect 1',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 50, y: 100 }),
      style: {
        fill: { type: 'solid', color: '#5caeff' },
        stroke: null,
        opacity: 1,
      },
      width: 200,
      height: 150,
      cornerRadius: 0,
    };

    const docWithRect = {
      ...doc,
      objects: { [rect.id]: rect },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [rect.id],
        },
      },
    };

    const svg = exportArtboardToSvg(docWithRect);

    expect(svg).toContain('viewBox="0 0 1000 800"');
    expect(svg).toContain('clipPath');
    expect(svg).toContain('<rect');
    expect(svg).toContain('fill="#5caeff"');
    expect(svg).toContain('width="200"');
    expect(svg).toContain('height="150"');
  });

  it('escapes XML entities in SVG output', () => {
    expect(escapeXml('<foo & "bar">')).toBe('&lt;foo &amp; &quot;bar&quot;&gt;');
  });

  it("exports objects relative to a displaced artboard", () => {
    const doc = createDefaultDocument({
      width: 800,
      height: 600,
    });
    const artboard = doc.artboards[doc.activeArtboardId]!;
    const shiftedDoc = {
      ...doc,
      artboards: {
        ...doc.artboards,
        [artboard.id]: {
          ...artboard,
          x: 500,
          y: 300,
        },
      },
    };
    const rect: RectangleObject = {
      type: "rectangle",
      id: "rect-in-shifted-artboard",
      name: "Rect",
      layerId: shiftedDoc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 550, y: 350 }),
      style: {
        fill: { type: 'solid', color: '#5caeff' },
        stroke: null,
        opacity: 1,
      },
      width: 100,
      height: 50,
      cornerRadius: 0,
    };
    const docWithRect = {
      ...shiftedDoc,
      objects: { [rect.id]: rect },
      layers: {
        ...shiftedDoc.layers,
        [shiftedDoc.activeLayerId]: {
          ...shiftedDoc.layers[shiftedDoc.activeLayerId]!,
          objectIds: [rect.id],
        },
      },
    };
    const svg = exportArtboardToSvg(docWithRect);
    expect(svg).toContain('transform="translate(-500 -300)"');
    expect(svg).toContain('viewBox="0 0 800 600"');
  });

  it('exports ellipse to SVG', () => {
    const doc = createDefaultDocument({ width: 1000, height: 800 });
    const ellipse: EllipseObject = {
      type: 'ellipse',
      id: 'ell-1',
      name: 'Ellipse 1',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 200, y: 150 }),
      style: {
        fill: { type: 'solid', color: '#5caeff' },
        stroke: null,
        opacity: 1,
      },
      width: 200,
      height: 160,
    };

    const docWithEllipse = {
      ...doc,
      objects: { [ellipse.id]: ellipse },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [ellipse.id],
        },
      },
    };

    const svg = exportArtboardToSvg(docWithEllipse);
    expect(svg).toContain('<ellipse');
    expect(svg).toContain('cx="100"');
    expect(svg).toContain('cy="80"');
    expect(svg).toContain('rx="100"');
    expect(svg).toContain('ry="80"');
    expect(svg).toContain('fill="#5caeff"');
  });

  it('exports independent rectangle corner radii as a path', () => {
    const doc = createDefaultDocument({ width: 400, height: 300 });
    const rect: RectangleObject = {
      type: 'rectangle', id: 'rounded-rect', name: 'Rounded', layerId: doc.activeLayerId,
      visible: true, locked: false, transform: createTransform({ x: 20, y: 20 }),
      style: { fill: { type: 'solid', color: '#5caeff' }, stroke: null, opacity: 1 },
      width: 120, height: 80, cornerRadius: { topLeft: 20, topRight: 10, bottomRight: 8, bottomLeft: 4 },
    };
    const withRect = { ...doc, objects: { [rect.id]: rect }, layers: { ...doc.layers, [doc.activeLayerId]: { ...doc.layers[doc.activeLayerId]!, objectIds: [rect.id] } } };
    const svg = exportArtboardToSvg(withRect);
    expect(svg).toContain('<path d="M 20 0 H 110 A 10 10');
    expect(svg).toContain('fill="#5caeff"');
  });

  it('exports line to SVG', () => {
    const doc = createDefaultDocument({ width: 1000, height: 800 });
    const line: LineObject = {
      type: 'line',
      id: 'line-1',
      name: 'Line 1',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 100, y: 100 }),
      style: {
        fill: { type: 'none' },
        stroke: { color: '#ff0000', width: 2, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, dashArray: [], opacity: 1 },
        opacity: 1,
      },
      endPoint: { x: 300, y: 200 },
    };

    const docWithLine = {
      ...doc,
      objects: { [line.id]: line },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [line.id],
        },
      },
    };

    const svg = exportArtboardToSvg(docWithLine);
    expect(svg).toContain('<line');
    expect(svg).toContain('x1="0"');
    expect(svg).toContain('y1="0"');
    expect(svg).toContain('x2="300"');
    expect(svg).toContain('y2="200"');
    expect(svg).toContain('stroke="#ff0000"');
  });

  it('exports path with cubic Bézier to SVG', () => {
    const doc = createDefaultDocument({ width: 1000, height: 800 });
    const path: PathObject = {
      type: 'path',
      id: 'path-1',
      name: 'Path 1',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 100, y: 100 }),
      style: {
        fill: { type: 'solid', color: '#00ff00' },
        stroke: { color: '#000000', width: 1, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, dashArray: [], opacity: 1 },
        opacity: 1,
      },
      nodes: [
        { point: { x: 0, y: 0 }, inHandle: null, outHandle: { x: 50, y: 0 }, kind: 'smooth' },
        { point: { x: 100, y: 100 }, inHandle: { x: 50, y: 100 }, outHandle: null, kind: 'smooth' },
        { point: { x: 200, y: 0 }, inHandle: { x: 150, y: 0 }, outHandle: null, kind: 'smooth' },
      ],
      closed: true,
    };

    const docWithPath = {
      ...doc,
      objects: { [path.id]: path },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [path.id],
        },
      },
    };

    const svg = exportArtboardToSvg(docWithPath);
    expect(svg).toContain('<path');
    expect(svg).toContain('d="M 0 0 C 50 0, 50 100, 100 100 C 100 100, 150 0, 200 0 Z"');
    expect(svg).toContain('fill="#00ff00"');
  });
});

describe('SVG Export — Gradient', () => {
  it('exports linear-gradient fill as <linearGradient> definition', () => {
    const doc = createDefaultDocument({ width: 1000, height: 800 });
    const rect = {
      type: 'rectangle' as const,
      id: 'rect-grad-1',
      name: 'Rect Gradient',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 50, y: 50 }),
      style: {
        fill: {
          type: 'linear-gradient' as const,
          start: { x: 0, y: 0 },
          end: { x: 200, y: 100 },
          stops: [
            { offset: 0, color: '#ff0000', opacity: 1 },
            { offset: 1, color: '#0000ff', opacity: 0.5 },
          ],
        },
        stroke: null,
        opacity: 1,
      },
      width: 200,
      height: 100,
      cornerRadius: 0,
    };

    const docWithRect = {
      ...doc,
      objects: { [rect.id]: rect },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [rect.id],
        },
      },
    };

    const svg = exportArtboardToSvg(docWithRect);
    expect(svg).toContain('<linearGradient');
    expect(svg).toContain('stop-color="#ff0000"');
    expect(svg).toContain('stop-color="#0000ff"');
    expect(svg).toContain('stop-opacity="0.5"');
    expect(svg).toContain('fill="url(#grad-');
  });
});
