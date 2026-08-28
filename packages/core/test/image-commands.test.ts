import { describe, it, expect } from 'vitest';
import {
  createDefaultDocument,
  createTransform,
  CreateImageObjectCommand,
  UpdateImagePropertiesCommand,
  CropImageCommand,
  TraceImageCommand,
  validateInvariants,
  type ImageObject,
  type PathObject,
} from '../src/index';

describe('Image Commands (EPIC-12)', () => {
  it('creates image object with embed/link source and supports undo/redo', () => {
    let doc = createDefaultDocument({ name: 'Image Doc' });
    const layerId = doc.layerIds[0]!;

    const imgTemplate: ImageObject = {
      id: 'img-1',
      name: 'Hero PNG',
      layerId,
      visible: true,
      locked: false,
      type: 'image',
      transform: createTransform({ x: 100, y: 100 }),
      style: { fill: { type: 'none' }, stroke: null, opacity: 1, blendMode: 'normal' },
      source: { type: 'embed', data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', mimeType: 'image/png' },
      naturalWidth: 800,
      naturalHeight: 600,
      width: 400,
      height: 300,
    };

    const cmd = new CreateImageObjectCommand(imgTemplate, layerId);
    doc = cmd.execute(doc);

    expect(doc.objects['img-1']).toBeDefined();
    expect(doc.layers[layerId]!.objectIds).toContain('img-1');
    expect(validateInvariants(doc)).toEqual([]);

    // Undo
    doc = cmd.undo(doc);
    expect(doc.objects['img-1']).toBeUndefined();
    expect(doc.layers[layerId]!.objectIds).not.toContain('img-1');

    // Redo
    doc = cmd.execute(doc);
    expect(doc.objects['img-1']).toBeDefined();
  });

  it('updates image properties (filters, embed/link conversion)', () => {
    let doc = createDefaultDocument({ name: 'Props Doc' });
    const layerId = doc.layerIds[0]!;
    const img: ImageObject = {
      id: 'img-2',
      name: 'Linked JPG',
      layerId,
      visible: true,
      locked: false,
      type: 'image',
      transform: createTransform({ x: 0, y: 0 }),
      style: { fill: { type: 'none' }, stroke: null, opacity: 1, blendMode: 'normal' },
      source: { type: 'link', url: 'https://example.com/photo.jpg', mimeType: 'image/jpeg' },
      naturalWidth: 1024,
      naturalHeight: 768,
      width: 512,
      height: 384,
    };
    doc = new CreateImageObjectCommand(img, layerId).execute(doc);

    const updateCmd = new UpdateImagePropertiesCommand('img-2', {
      filters: { brightness: 25, contrast: 10, saturation: 120, grayscale: true },
      width: 600,
      height: 450,
    });
    doc = updateCmd.execute(doc);

    const updated = doc.objects['img-2'] as ImageObject;
    expect(updated.filters?.brightness).toBe(25);
    expect(updated.filters?.grayscale).toBe(true);
    expect(updated.width).toBe(600);
    expect(validateInvariants(doc)).toEqual([]);

    // Undo restores previous
    doc = updateCmd.undo(doc);
    const reverted = doc.objects['img-2'] as ImageObject;
    expect(reverted.filters).toBeUndefined();
    expect(reverted.width).toBe(512);
  });

  it('crops image non-destructively and supports undo/redo', () => {
    let doc = createDefaultDocument({ name: 'Crop Doc' });
    const layerId = doc.layerIds[0]!;
    const img: ImageObject = {
      id: 'img-3',
      name: 'Crop Image',
      layerId,
      visible: true,
      locked: false,
      type: 'image',
      transform: createTransform({ x: 0, y: 0 }),
      style: { fill: { type: 'none' }, stroke: null, opacity: 1, blendMode: 'normal' },
      source: { type: 'embed', data: 'data:image/png;base64,...', mimeType: 'image/png' },
      naturalWidth: 1000,
      naturalHeight: 1000,
      width: 500,
      height: 500,
    };
    doc = new CreateImageObjectCommand(img, layerId).execute(doc);

    const cropCmd = new CropImageCommand('img-3', { x: 100, y: 100, width: 800, height: 800 });
    doc = cropCmd.execute(doc);

    const cropped = doc.objects['img-3'] as ImageObject;
    expect(cropped.crop).toEqual({ x: 100, y: 100, width: 800, height: 800 });
    expect(validateInvariants(doc)).toEqual([]);

    doc = cropCmd.undo(doc);
    expect((doc.objects['img-3'] as ImageObject).crop).toBeUndefined();
  });

  it('traces image to vector paths and replaces image with undo/redo', () => {
    let doc = createDefaultDocument({ name: 'Trace Doc' });
    const layerId = doc.layerIds[0]!;
    const img: ImageObject = {
      id: 'img-trace',
      name: 'Logo Image',
      layerId,
      visible: true,
      locked: false,
      type: 'image',
      transform: createTransform({ x: 0, y: 0 }),
      style: { fill: { type: 'none' }, stroke: null, opacity: 1, blendMode: 'normal' },
      source: { type: 'embed', data: 'data:image/png;base64,...', mimeType: 'image/png' },
      naturalWidth: 200,
      naturalHeight: 200,
      width: 200,
      height: 200,
    };
    doc = new CreateImageObjectCommand(img, layerId).execute(doc);

    const generatedPath: PathObject = {
      id: 'traced-path-1',
      name: 'Traced Contour',
      layerId,
      visible: true,
      locked: false,
      type: 'path',
      transform: createTransform({ x: 0, y: 0 }),
      style: { fill: { type: 'solid', color: '#000000' }, stroke: null, opacity: 1, blendMode: 'normal' },
      closed: true,
      nodes: [
        { id: 'n1', point: { x: 10, y: 10 }, kind: 'corner', inHandle: null, outHandle: null },
        { id: 'n2', point: { x: 50, y: 10 }, kind: 'corner', inHandle: null, outHandle: null },
        { id: 'n3', point: { x: 50, y: 50 }, kind: 'corner', inHandle: null, outHandle: null },
      ],
    };

    const traceCmd = new TraceImageCommand('img-trace', [generatedPath]);
    doc = traceCmd.execute(doc);

    expect(doc.objects['img-trace']).toBeUndefined();
    expect(doc.objects['traced-path-1']).toBeDefined();
    expect(doc.layers[layerId]!.objectIds).toContain('traced-path-1');
    expect(validateInvariants(doc)).toEqual([]);

    // Undo restores original image and removes generated path
    doc = traceCmd.undo(doc);
    expect(doc.objects['img-trace']).toBeDefined();
    expect(doc.objects['traced-path-1']).toBeUndefined();
    expect(doc.layers[layerId]!.objectIds).toContain('img-trace');
    expect(validateInvariants(doc)).toEqual([]);
  });
});
