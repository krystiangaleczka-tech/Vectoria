import { describe, expect, it } from 'vitest';
import { exportArtboardToSvg, parseAndMigrateDocument } from '../src/index.js';
import { createDefaultDocument, createTransform, defaultObjectStyle, type RectangleObject } from '@vectoria/core';

function makeRect(id: string, doc: ReturnType<typeof createDefaultDocument>, style: RectangleObject['style']): RectangleObject {
  return {
    type: 'rectangle', id, name: id, layerId: doc.activeLayerId, visible: true, locked: false,
    transform: createTransform({ x: 0, y: 0 }), style, width: 100, height: 100, cornerRadius: 0,
  };
}

function makeDoc(objects: readonly RectangleObject[]): ReturnType<typeof createDefaultDocument> {
  let doc = createDefaultDocument({ width: 800, height: 600 });
  const nextObjects = { ...doc.objects };
  for (const object of objects) nextObjects[object.id] = object;
  const layer = doc.layers[doc.activeLayerId]!;
  doc = {
    ...doc,
    objects: nextObjects,
    layers: { ...doc.layers, [doc.activeLayerId]: { ...layer, objectIds: [...layer.objectIds, ...objects.map((object) => object.id)] } },
  };
  return doc;
}

describe('EPIC-13 SVG export of live effects', () => {
  it('exports drop shadow as feDropShadow filter with the stack order preserved', () => {
    const doc = makeDoc([
      makeRect('fx-shadow', createDefaultDocument(), {
        ...defaultObjectStyle,
        effects: [
          { type: 'dropShadow', id: 'fx-a', visible: true, offsetX: 4, offsetY: 6, blur: 10, color: '#ff0000', opacity: 0.7 },
          { type: 'blur', id: 'fx-b', visible: true, radius: 4 },
        ],
      }),
    ]);
    const svg = exportArtboardToSvg(doc);
    expect(svg).toContain('<feDropShadow');
    expect(svg).toContain('flood-color="#ff0000"');
    expect(svg).toContain('filter="url(#fx-fx-shadow)"');
    const shadowIndex = svg.indexOf('<feDropShadow');
    const blurIndex = svg.indexOf('<feGaussianBlur');
    expect(shadowIndex).toBeGreaterThan(-1);
    expect(blurIndex).toBeGreaterThan(shadowIndex);
  });

  it('exports inner shadow with the inverted-alpha recipe', () => {
    const doc = makeDoc([
      makeRect('fx-inner', createDefaultDocument(), {
        ...defaultObjectStyle,
        effects: [{ type: 'innerShadow', id: 'fx-i', visible: true, offsetX: 2, offsetY: 2, blur: 4, color: '#000000', opacity: 0.6 }],
      }),
    ]);
    const svg = exportArtboardToSvg(doc);
    expect(svg).toContain('feComponentTransfer');
    expect(svg).toContain('tableValues="1 0"');
  });

  it('exports glow as blurred tinted silhouette merged under the source', () => {
    const doc = makeDoc([
      makeRect('fx-glow', createDefaultDocument(), {
        ...defaultObjectStyle,
        effects: [{ type: 'glow', id: 'fx-g', visible: true, blur: 12, color: '#5caeff', opacity: 0.9 }],
      }),
    ]);
    const svg = exportArtboardToSvg(doc);
    expect(svg).toContain('flood-color="#5caeff"');
    expect(svg).toContain('feMerge');
  });

  it('exports extended blend modes through mix-blend-mode', () => {
    const doc = makeDoc([
      makeRect('fx-blend', createDefaultDocument(), { ...defaultObjectStyle, blendMode: 'difference' }),
      makeRect('fx-blend2', createDefaultDocument(), { ...defaultObjectStyle, blendMode: 'soft-light' }),
    ]);
    const svg = exportArtboardToSvg(doc);
    expect(svg).toContain('mix-blend-mode:difference');
    expect(svg).toContain('mix-blend-mode:soft-light');
  });

  it('exports pattern transform and texture fills', () => {
    const doc = makeDoc([
      makeRect('fx-pattern', createDefaultDocument(), {
        ...defaultObjectStyle,
        fill: { type: 'pattern', kind: 'dots', foreground: '#000000', background: '#ffffff', size: 8, transform: { offsetX: 4, offsetY: 2, scale: 1.5, rotation: 0.261799 } },
      }),
      makeRect('fx-texture', createDefaultDocument(), {
        ...defaultObjectStyle,
        fill: { type: 'texture', source: { type: 'embed', data: 'data:image/png;base64,AAAA', mimeType: 'image/png' } },
      }),
    ]);
    const svg = exportArtboardToSvg(doc);
    expect(svg).toContain('patternTransform="translate(4 2) rotate(15) scale(1.5)"');
    expect(svg).toContain('<image href="data:image/png;base64,AAAA"');
  });

  it('exports mesh gradient as average color with documented fallback', () => {
    const doc = makeDoc([
      makeRect('fx-mesh', createDefaultDocument(), {
        ...defaultObjectStyle,
        fill: { type: 'mesh-gradient', colors: [['#ff0000', '#00ff00', '#0000ff'], ['#ff0000', '#00ff00', '#0000ff'], ['#ff0000', '#00ff00', '#0000ff']] },
      }),
    ]);
    const svg = exportArtboardToSvg(doc);
    expect(svg).toMatch(/fill="#(56|55|57)[0-9a-f]{2}(aa|ab|ac|55)"/i);
  });

  it('exports repeat effects as transformed copies', () => {
    const doc = makeDoc([
      makeRect('fx-repeat', createDefaultDocument(), {
        ...defaultObjectStyle,
        effects: [{ type: 'radialRepeat', id: 'fx-rr', visible: true, count: 6, radius: 40, startAngle: 0 }],
      }),
    ]);
    const svg = exportArtboardToSvg(doc);
    const copies = svg.match(/<g transform="matrix\(/g) ?? [];
    expect(copies.length).toBeGreaterThanOrEqual(5);
  });

  it('wraps inside stroke alignment in a clipPath def', () => {
    const doc = makeDoc([
      makeRect('fx-align', createDefaultDocument(), {
        ...defaultObjectStyle,
        stroke: { color: '#000000', width: 6, align: 'inside', lineCap: 'butt', lineJoin: 'miter', miterLimit: 4, dashArray: [], opacity: 1 },
      }),
    ]);
    const svg = exportArtboardToSvg(doc);
    expect(svg).toContain('<clipPath id="align-fx-align"');
    expect(svg).toContain('clip-path="url(#align-fx-align)"');
  });

  it('exports caligraphic brush as a filled outline path', () => {
    let doc = createDefaultDocument();
    const layer = doc.layers[doc.activeLayerId]!;
    const path: RectangleObject['type'] extends never ? never : import('@vectoria/core').PathObject = {
      type: 'path', id: 'fx-brush', name: 'brush', layerId: doc.activeLayerId, visible: true, locked: false,
      transform: createTransform({ x: 0, y: 0 }),
      style: { ...defaultObjectStyle, fill: { type: 'solid', color: '#123456' }, stroke: null },
      nodes: [
        { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
        { point: { x: 200, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
      ],
      closed: false,
      brush: { kind: 'caligraphic', angle: 0, thin: 2, thick: 10 },
    };
    doc = { ...doc, objects: { ...doc.objects, [path.id]: path }, layers: { ...doc.layers, [doc.activeLayerId]: { ...layer, objectIds: [...layer.objectIds, path.id] } } };
    const svg = exportArtboardToSvg(doc);
    expect(svg).toContain('fill="#123456"');
    expect(svg).not.toContain('stroke="#123456"');
  });
});

describe('EPIC-13 schema round-trip with effects', () => {
  it('persists and restores a document with an effect stack', () => {
    let doc = makeDoc([
      makeRect('fx-rt', createDefaultDocument(), {
        ...defaultObjectStyle,
        blendMode: 'hue',
        effects: [
          { type: 'dropShadow', id: 'fx-1', visible: true, offsetX: 3, offsetY: 3, blur: 6, color: '#000000', opacity: 0.4 },
          { type: 'radialRepeat', id: 'fx-2', visible: true, count: 8, radius: 50, startAngle: 0 },
          { type: 'gridRepeat', id: 'fx-3', visible: false, rows: 2, columns: 2, spacingX: 30, spacingY: 30 },
        ],
      }),
    ]);
    const payload = { app: 'vectoria', schemaVersion: 1, document: doc, revision: 1, savedAt: new Date().toISOString() };
    doc = parseAndMigrateDocument(payload);
    const style = (doc.objects['fx-rt'] as RectangleObject).style;
    expect(style.effects).toHaveLength(3);
    expect(style.effects?.[0]).toMatchObject({ type: 'dropShadow', offsetX: 3 });
    expect(style.effects?.[2]).toMatchObject({ visible: false, rows: 2 });
    expect(style.blendMode).toBe('hue');
  });
});
