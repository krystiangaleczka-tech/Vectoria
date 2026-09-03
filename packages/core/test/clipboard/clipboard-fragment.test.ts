import { describe, it, expect } from 'vitest';
import { cloneObjectsWithNewIds, createClipboardFragment } from '../../src/clipboard/clipboard-fragment.js';
import {
  createTransform,
  type RectangleObject,
  type PathObject,
} from '../../src/index.js';

describe('clipboard-fragment', () => {
  it('clone keeps style and generates fresh ids for objects and path nodes', () => {
    const obj: RectangleObject = {
      id: 'src1',
      type: 'rectangle',
      name: 'R',
      layerId: 'layer1',
      visible: true,
      locked: false,
      transform: createTransform({ x: 10, y: 10 }),
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
    const path: PathObject = {
      id: 'path1',
      type: 'path',
      name: 'P',
      layerId: 'layer1',
      visible: true,
      locked: false,
      transform: createTransform({ x: 0, y: 0 }),
      style: {
        fill: { type: 'none' },
        stroke: null,
        opacity: 1,
      },
      closed: false,
      nodes: [
        { id: 'n1', point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: 'n2', point: { x: 10, y: 10 }, inHandle: null, outHandle: null, kind: 'corner' },
      ],
    };

    const clones = cloneObjectsWithNewIds([obj, path]);
    expect(clones).toHaveLength(2);
    expect(clones[0]!.id).not.toBe(obj.id);
    expect(clones[0]!.style).toEqual(obj.style);

    const clonedPath = clones[1] as PathObject;
    expect(clonedPath.id).not.toBe(path.id);
    expect(clonedPath.nodes[0]!.id).not.toBe('n1');
    expect(clonedPath.nodes[1]!.id).not.toBe('n2');
  });

  it('createClipboardFragment creates a valid fragment with cloned objects', () => {
    const obj: RectangleObject = {
      id: 'src1',
      type: 'rectangle',
      name: 'R',
      layerId: 'layer1',
      visible: true,
      locked: false,
      transform: createTransform({ x: 0, y: 0 }),
      style: {
        fill: { type: 'solid', color: '#ff0000' },
        stroke: null,
        opacity: 1,
      },
      width: 50,
      height: 50,
      cornerRadius: 0,
    };
    const fragment = createClipboardFragment([obj]);
    expect(fragment.schemaVersion).toBe(1);
    expect(fragment.type).toBe('ClipboardFragment');
    expect(fragment.objects[0]!.id).not.toBe('src1');
    expect(fragment.objects[0]!.style).toEqual(obj.style);
  });
});
