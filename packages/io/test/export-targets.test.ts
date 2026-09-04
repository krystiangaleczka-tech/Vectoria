import { describe, it, expect } from 'vitest';
import { createDefaultDocument, createTransform, type RectangleObject } from '@vectoria/core';
import { resolveExportRect } from '../src/export/export-targets.js';

describe('resolveExportRect (EXPORT-015..017)', () => {
  it('resolves explicit world-space area rect', () => {
    const doc = createDefaultDocument({ width: 1000, height: 800 });
    const rect = resolveExportRect(doc, {
      kind: 'area',
      rect: { x: 50, y: 75, width: 300, height: 250 },
    });
    expect(rect).toEqual({ x: 50, y: 75, width: 300, height: 250 });
  });

  it('resolves artboard rect by id and throws for unknown id', () => {
    const doc = createDefaultDocument({ width: 1200, height: 900 });
    const rect = resolveExportRect(doc, {
      kind: 'artboard',
      artboardId: doc.activeArtboardId,
    });
    const artboard = doc.artboards[doc.activeArtboardId]!;
    expect(rect).toEqual({
      x: artboard.x,
      y: artboard.y,
      width: artboard.width,
      height: artboard.height,
    });

    expect(() =>
      resolveExportRect(doc, { kind: 'artboard', artboardId: 'nonexistent' }),
    ).toThrow('EXPORT_TARGET_MISSING');
  });

  it('resolves selection bounds from visible objects and throws if selection is empty', () => {
    const doc = createDefaultDocument({ width: 1000, height: 800 });
    const rect1: RectangleObject = {
      type: 'rectangle',
      id: 'rect-1',
      name: 'R1',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 50, y: 60 }),
      width: 100,
      height: 80,
      style: { fill: { type: 'solid', color: '#ff0000' }, stroke: null, opacity: 1 },
      cornerRadius: 0,
    };
    const rect2: RectangleObject = {
      type: 'rectangle',
      id: 'rect-2',
      name: 'R2',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 200, y: 150 }),
      width: 150,
      height: 100,
      style: { fill: { type: 'solid', color: '#00ff00' }, stroke: null, opacity: 1 },
      cornerRadius: 0,
    };
    const hidden: RectangleObject = {
      type: 'rectangle',
      id: 'rect-hidden',
      name: 'Hidden',
      layerId: doc.activeLayerId,
      visible: false,
      locked: false,
      transform: createTransform({ x: 1000, y: 1000 }),
      width: 500,
      height: 500,
      style: { fill: { type: 'solid', color: '#0000ff' }, stroke: null, opacity: 1 },
      cornerRadius: 0,
    };

    const docWithShapes = {
      ...doc,
      objects: {
        ...doc.objects,
        [rect1.id]: rect1,
        [rect2.id]: rect2,
        [hidden.id]: hidden,
      },
    };

    // Selection with rect1 and rect2 and hidden
    const result = resolveExportRect(
      docWithShapes,
      { kind: 'selection' },
      { objectIds: [rect1.id, rect2.id, hidden.id], nodeIds: [], mode: 'object' },
    );

    expect(result.x).toBe(50);
    expect(result.y).toBe(60);
    expect(result.width).toBe(200 + 150 - 50); // 300
    expect(result.height).toBe(150 + 100 - 60); // 190

    // Empty selection
    expect(() =>
      resolveExportRect(docWithShapes, { kind: 'selection' }, { objectIds: [], nodeIds: [], mode: 'object' }),
    ).toThrow('EXPORT_EMPTY_SELECTION');

    // Selection with only hidden objects
    expect(() =>
      resolveExportRect(docWithShapes, { kind: 'selection' }, { objectIds: [hidden.id], nodeIds: [], mode: 'object' }),
    ).toThrow('EXPORT_EMPTY_SELECTION');
  });
});
