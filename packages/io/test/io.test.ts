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
} from '@vectoria/core';

describe('IO - DTO Validation and SVG Export', () => {
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
});
