import { describe, it, expect } from 'vitest';
import {
  DocumentV1Schema,
  parseAndMigrateDocument,
  exportArtboardToSvg,
} from '../src/index';
import {
  createDefaultDocument,
  createTransform,
  type ImageObject,
  type SymbolDefinition,
  type SymbolInstanceObject,
} from '@vectoria/core';

describe('IO Image & Symbol serialization and SVG export (EPIC-12)', () => {
  it('validates document with ImageObject and SymbolDefinition via Zod schema and parseAndMigrateDocument', () => {
    let doc = createDefaultDocument({ name: 'IO Test Doc' });
    const layerId = doc.layerIds[0]!;

    const img: ImageObject = {
      id: 'img-embed-1',
      name: 'Embedded Photo',
      layerId,
      visible: true,
      locked: false,
      type: 'image',
      transform: createTransform({ x: 50, y: 50 }),
      style: { fill: { type: 'none' }, stroke: null, opacity: 0.9, blendMode: 'multiply' },
      source: { type: 'embed', data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', mimeType: 'image/png' },
      naturalWidth: 400,
      naturalHeight: 300,
      width: 200,
      height: 150,
      crop: { offset: { x: -10, y: -10 }, scale: { x: 1, y: 1 }, frame: { x: 0, y: 0, width: 380, height: 280 } },
      filters: { brightness: 15, contrast: 5, saturation: 110, grayscale: false },
    };

    const symbolDef: SymbolDefinition = {
      id: 'sym-btn',
      name: 'Primary Button',
      objectIds: ['btn-bg'],
      objects: {
        'btn-bg': {
          id: 'btn-bg',
          name: 'BG',
          layerId,
          visible: true,
          locked: false,
          type: 'rectangle',
          transform: createTransform({ x: 0, y: 0 }),
          style: { fill: { type: 'solid', color: '#2563eb' }, stroke: null, opacity: 1, blendMode: 'normal' },
          width: 120,
          height: 40,
          cornerRadius: { topLeft: 4, topRight: 4, bottomRight: 4, bottomLeft: 4 },
        },
      },
      bounds: { x: 0, y: 0, width: 120, height: 40 },
      isBrandAsset: true,
    };

    const symbolInst: SymbolInstanceObject = {
      id: 'sym-inst-1',
      name: 'Primary Button Instance',
      layerId,
      visible: true,
      locked: false,
      type: 'symbol-instance',
      symbolId: 'sym-btn',
      transform: createTransform({ x: 300, y: 100 }),
      style: { fill: { type: 'none' }, stroke: null, opacity: 1, blendMode: 'normal' },
      width: 120,
      height: 40,
    };

    doc = {
      ...doc,
      objects: {
        ...doc.objects,
        [img.id]: img,
        [symbolInst.id]: symbolInst,
      },
      layers: {
        ...doc.layers,
        [layerId]: {
          ...doc.layers[layerId]!,
          objectIds: [...doc.layers[layerId]!.objectIds, img.id, symbolInst.id],
        },
      },
      symbols: {
        [symbolDef.id]: symbolDef,
      },
      symbolIds: [symbolDef.id],
      brandKit: {
        logos: [{ id: 'logo-main', name: 'Main Logo', imageUrl: 'https://example.com/logo.svg' }],
        fontFamilies: ['Inter', 'Roboto'],
      },
    };

    // Validate with Zod
    const parsedDto = DocumentV1Schema.parse(doc);
    expect(parsedDto.objects['img-embed-1']).toBeDefined();
    expect(parsedDto.symbols?.['sym-btn']).toBeDefined();
    expect(parsedDto.brandKit?.logos?.length).toBe(1);

    // Validate with parseAndMigrateDocument
    const migrated = parseAndMigrateDocument(JSON.parse(JSON.stringify(doc)));
    expect(migrated.objects['img-embed-1']).toBeDefined();
    expect(migrated.symbols?.['sym-btn']).toBeDefined();
  });

  it('exports ImageObject and SymbolInstance to SVG with filters and defs', () => {
    let doc = createDefaultDocument({ name: 'SVG Export Test' });
    const layerId = doc.layerIds[0]!;

    const img: ImageObject = {
      id: 'img-export-1',
      name: 'Photo',
      layerId,
      visible: true,
      locked: false,
      type: 'image',
      transform: createTransform({ x: 40, y: 40 }),
      style: { fill: { type: 'none' }, stroke: null, opacity: 0.8, blendMode: 'normal' },
      source: { type: 'embed', data: 'data:image/png;base64,AAABBB...', mimeType: 'image/png' },
      naturalWidth: 100,
      naturalHeight: 100,
      width: 100,
      height: 100,
      filters: { brightness: 20, grayscale: true },
    };

    const symbolDef: SymbolDefinition = {
      id: 'sym-star',
      name: 'Star Def',
      objectIds: ['star-1'],
      objects: {
        'star-1': {
          id: 'star-1',
          name: 'Star Shape',
          layerId,
          visible: true,
          locked: false,
          type: 'star',
          transform: createTransform({ x: 0, y: 0 }),
          style: { fill: { type: 'solid', color: '#eab308' }, stroke: null, opacity: 1, blendMode: 'normal' },
          points: 5,
          outerRadius: 20,
          innerRadius: 10,
        },
      },
      bounds: { x: 0, y: 0, width: 40, height: 40 },
    };

    const symbolInst: SymbolInstanceObject = {
      id: 'inst-star-1',
      name: 'Star Instance',
      layerId,
      visible: true,
      locked: false,
      type: 'symbol-instance',
      symbolId: 'sym-star',
      transform: createTransform({ x: 200, y: 150 }),
      style: { fill: { type: 'none' }, stroke: null, opacity: 1, blendMode: 'normal' },
      width: 40,
      height: 40,
    };

    doc = {
      ...doc,
      objects: {
        ...doc.objects,
        [img.id]: img,
        [symbolInst.id]: symbolInst,
      },
      layers: {
        ...doc.layers,
        [layerId]: {
          ...doc.layers[layerId]!,
          objectIds: [...doc.layers[layerId]!.objectIds, img.id, symbolInst.id],
        },
      },
      symbols: {
        [symbolDef.id]: symbolDef,
      },
      symbolIds: [symbolDef.id],
    };

    const svg = exportArtboardToSvg(doc);
    expect(svg).toContain('<image');
    expect(svg).toContain('data:image/png;base64,AAABBB...');
    expect(svg).toContain('feColorMatrix');
    expect(svg).toContain('feComponentTransfer');
    expect(svg).toContain('<g id="symbol-sym-star">');
    expect(svg).toContain('<use href="#symbol-sym-star"');
  });
});
