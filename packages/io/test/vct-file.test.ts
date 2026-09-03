import { describe, it, expect } from 'vitest';
import { exportVctFile, importVctFile } from '../src/vct/vct-file.js';
import {
  createDefaultDocument,
  CreateObjectsCommand,
  createTransform,
  type RectangleObject,
} from '@vectoria/core';

describe('VCT File I/O', () => {
  it('export → import round-trips the document (uncompressed fallback in Node)', async () => {
    let doc = createDefaultDocument({ name: 'T', width: 800, height: 600 });
    const rect: RectangleObject = {
      id: 'rect-vct-1',
      type: 'rectangle',
      name: 'R1',
      layerId: doc.activeLayerId,
      visible: true,
      locked: false,
      transform: createTransform({ x: 50, y: 50 }),
      style: {
        fill: { type: 'solid', color: '#123456' },
        stroke: null,
        opacity: 0.8,
      },
      width: 120,
      height: 80,
      cornerRadius: 4,
    };
    doc = new CreateObjectsCommand([rect], doc.activeLayerId).execute(doc);

    const blob = await exportVctFile(doc);
    const file = new File([blob], 'test.vct', { type: 'application/x-vectoria-vct' });
    const restored = await importVctFile(file);

    expect(restored.name).toBe('T');
    expect(restored.schemaVersion).toBe(doc.schemaVersion);
    expect(restored.objects['rect-vct-1']?.style.fill).toEqual({ type: 'solid', color: '#123456' });
    expect(restored.objects['rect-vct-1']?.style.opacity).toBe(0.8);
  });

  it('import rejects corrupted file without partial state', async () => {
    const file = new File(['not json'], 'broken.vct');
    await expect(importVctFile(file)).rejects.toThrow();
  });
});
