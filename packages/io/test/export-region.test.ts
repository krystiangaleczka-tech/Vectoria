import { describe, it, expect } from 'vitest';
import { createDefaultDocument, createTransform, type RectangleObject } from '@vectoria/core';
import { exportArtboardToSvg, exportRegionToSvg } from '../src/svg/export.js';

describe('exportRegionToSvg & exportArtboardToSvg (EXPORT-001, EXPORT-010, EXPORT-015..017)', () => {
  it('golden test: exportArtboardToSvg produces byte-identical output to delegating exportRegionToSvg', () => {
    const doc = createDefaultDocument({ name: 'Golden Test Doc', width: 800, height: 600 });
    const rect: RectangleObject = {
      type: 'rectangle',
      id: 'rect-1',
      name: 'Rect 1',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 100, y: 100 }),
      width: 200,
      height: 150,
      style: {
        fill: { type: 'solid', color: '#ff0000' },
        stroke: { color: '#000000', width: 2, lineCap: 'butt', lineJoin: 'miter', miterLimit: 4, dashArray: [], opacity: 1 },
        opacity: 1,
      },
      cornerRadius: 0,
    };
    const docWithRect = {
      ...doc,
      objects: { ...doc.objects, [rect.id]: rect },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [...doc.layers[doc.activeLayerId]!.objectIds, rect.id],
        },
      },
    };

    const legacySvg = exportArtboardToSvg(docWithRect);
    const artboard = docWithRect.artboards[docWithRect.activeArtboardId]!;
    const regionSvg = exportRegionToSvg(
      docWithRect,
      { x: artboard.x, y: artboard.y, width: artboard.width, height: artboard.height },
      {
        clipId: `artboard-clip-${docWithRect.activeArtboardId}`,
        background: 'none',
        clipToRect: true,
      },
    );

    expect(legacySvg).toBe(regionSvg);
  });

  it('renders custom background rect when background option is provided', () => {
    const doc = createDefaultDocument({ name: 'Bg Doc', width: 400, height: 300 });
    const svgWithBg = exportRegionToSvg(doc, { x: 0, y: 0, width: 400, height: 300 }, { background: '#abcdef' });
    expect(svgWithBg).toContain('<rect width="400" height="300" fill="#abcdef" />');

    const svgWithoutBg = exportRegionToSvg(doc, { x: 0, y: 0, width: 400, height: 300 }, { background: 'transparent' });
    expect(svgWithoutBg).not.toContain('<rect width="400" height="300" fill=');
  });

  it('supports exporting arbitrary region without clipPath when clipToRect is false', () => {
    const doc = createDefaultDocument({ name: 'No Clip Doc', width: 500, height: 400 });
    const svgNoClip = exportRegionToSvg(doc, { x: 50, y: 50, width: 200, height: 200 }, { clipToRect: false });
    expect(svgNoClip).toContain('viewBox="0 0 200 200"');
    expect(svgNoClip).toContain('<g transform="translate(-50 -50)">');
    expect(svgNoClip).not.toContain('<g clip-path=');
  });
});
