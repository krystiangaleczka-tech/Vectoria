import { describe, it, expect } from 'vitest';
import { serializeFragment, deserializeFragment } from '../src/clipboard/clipboard-serialization.js';
import type { ClipboardFragment, RectangleObject } from '@vectoria/core';

describe('clipboard-serialization', () => {
  it('serialize → deserialize round-trips fragment with style', () => {
    const rect: RectangleObject = {
      id: 'src1',
      type: 'rectangle',
      name: 'R',
      layerId: 'layer1',
      visible: true,
      locked: false,
      transform: {
        position: { x: 10, y: 10 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        pivot: { x: 0, y: 0 },
      },
      style: {
        fill: { type: 'solid', color: '#123456' },
        stroke: {
          color: '#abcdef',
          width: 3,
          lineCap: 'round',
          lineJoin: 'bevel',
          miterLimit: 2,
          dashArray: [1, 2],
          opacity: 0.9,
        },
        opacity: 0.5,
      },
      width: 100,
      height: 100,
      cornerRadius: 0,
    };
    const fragment: ClipboardFragment = {
      schemaVersion: 1,
      type: 'ClipboardFragment',
      objects: [rect],
      origin: { x: 0, y: 0 },
    };
    const json = serializeFragment(fragment);
    const parsed = deserializeFragment(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.objects[0]!.style).toMatchObject(fragment.objects[0]!.style);
      expect(parsed.value.objects[0]!.id).toBe('src1');
    }
  });

  it('deserialize returns validation_failed for corrupted fragment schema', () => {
    const res = deserializeFragment('{"type":"NotClipboardFragment"}');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('validation_failed');
    }
  });
});
