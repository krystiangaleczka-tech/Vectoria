// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  createDefaultDocument,
  createTextObject,
  createTextFrameObject,
  type SceneObject,
} from '@vectoria/core';
import { exportArtboardToSvg, importSvgWithReport } from '../src/index.js';

describe('VEC016: SVG text attributes must be valid XML', () => {
  it('round-trips plain, multiline and frame text with zero letter spacing', () => {
    const doc = createDefaultDocument();
    const objects: readonly SceneObject[] = [
      createTextObject('single', doc.activeLayerId, 'Single line'),
      createTextObject('multi', doc.activeLayerId, 'First line\nSecond line'),
      createTextFrameObject('frame', doc.activeLayerId, 'Frame content', 240, 120),
    ];

    for (const object of objects) {
      const source = {
        ...doc,
        objects: { [object.id]: object },
        layers: {
          ...doc.layers,
          [doc.activeLayerId]: {
            ...doc.layers[doc.activeLayerId]!,
            objectIds: [object.id],
          },
        },
      };
      const xml = exportArtboardToSvg(source);
      const parsed = new DOMParser().parseFromString(xml, 'image/svg+xml');
      expect(parsed.querySelector('parsererror')?.textContent ?? null, object.type).toBeNull();
      expect(parsed.querySelector('text')).not.toBeNull();
      const restored = importSvgWithReport(xml);
      expect(Object.values(restored.document.objects).some((item) => item.type === 'text')).toBe(true);
    }
  });

  it('keeps textPath markup well formed even with absent letter spacing', () => {
    const doc = createDefaultDocument();
    const text = {
      ...createTextObject('path-text', doc.activeLayerId, 'Along path'),
      pathId: 'path-1',
    };
    const source = {
      ...doc,
      objects: { [text.id]: text },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [text.id],
        },
      },
    };
    const xml = exportArtboardToSvg(source);
    const parsed = new DOMParser().parseFromString(xml, 'image/svg+xml');
    expect(parsed.querySelector('parsererror')?.textContent ?? null).toBeNull();
    expect(parsed.querySelector('textPath')).not.toBeNull();
  });
});
