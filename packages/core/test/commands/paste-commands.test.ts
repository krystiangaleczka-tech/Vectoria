import { describe, it, expect } from 'vitest';
import { PasteObjectsCommand } from '../../src/commands/paste-commands.js';
import {
  createDefaultDocument,
  createTransform,
  type DocumentModel,
  type ClipboardFragment,
  type RectangleObject,
} from '../../src/index.js';

function baseDoc(): DocumentModel {
  const doc = createDefaultDocument();
  const layer = doc.layers[doc.activeLayerId]!;
  return {
    ...doc,
    layers: {
      [doc.activeLayerId]: {
        ...layer,
        objectIds: [],
      },
    },
    objects: {},
  };
}

function fragmentAt(x: number, y: number): ClipboardFragment {
  const rect: RectangleObject = {
    id: 'src1',
    type: 'rectangle',
    name: 'Rect',
    layerId: 'layer1',
    visible: true,
    locked: false,
    transform: createTransform({ x, y }),
    style: {
      fill: { type: 'solid', color: '#ff0000' },
      stroke: null,
      opacity: 1,
    },
    width: 100,
    height: 100,
    cornerRadius: 0,
  };
  return {
    schemaVersion: 1,
    type: 'ClipboardFragment',
    objects: [rect],
    origin: { x, y },
  };
}

describe('PasteObjectsCommand', () => {
  it('pastes objects with offset', () => {
    const doc = baseDoc();
    const fragment = fragmentAt(10, 10);
    const layerId = doc.activeLayerId;

    const cmd = new PasteObjectsCommand(fragment, layerId, 'offset', []);
    const result = cmd.execute(doc);

    expect(result.layers[layerId]!.objectIds.length).toBe(1);
    const newId = result.layers[layerId]!.objectIds[0]!;
    const newObj = result.objects[newId];
    expect(newObj).toBeDefined();
    expect(newObj!.transform.position).toEqual({ x: 30, y: 30 }); // 10 + 20

    // undo
    const undone = cmd.undo(result);
    expect(undone.layers[layerId]!.objectIds.length).toBe(0);
    expect(undone.objects[newId]).toBeUndefined();
  });

  it('paste preserves full style (fill, stroke, opacity)', () => {
    const doc = baseDoc();
    const layerId = doc.activeLayerId;
    const rect: RectangleObject = {
      id: 'src1',
      type: 'rectangle',
      name: 'R',
      layerId,
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
    const fragment: ClipboardFragment = {
      schemaVersion: 1,
      type: 'ClipboardFragment',
      objects: [rect],
      origin: { x: 0, y: 0 },
    };
    const cmd = new PasteObjectsCommand(fragment, layerId, 'offset', []);
    const result = cmd.execute(doc);
    const pasted = Object.values(result.objects).find((o) => o!.id !== 'src1')!;
    expect(pasted.style.fill).toEqual({ type: 'solid', color: '#123456' });
    expect(pasted.style.stroke).toMatchObject({ color: '#abcdef', width: 3, dashArray: [1, 2] });
    expect(pasted.style.opacity).toBe(0.5);
    expect(pasted.id).not.toBe('src1'); // new ID
  });

  it('paste in-place keeps source world transform and is undoable', () => {
    const doc = baseDoc();
    const layerId = doc.activeLayerId;
    const fragment = fragmentAt(42, 24);
    const cmd = new PasteObjectsCommand(fragment, layerId, 'in-place', []);
    const result = cmd.execute(doc);
    const pasted = Object.values(result.objects).find((o) => o!.id !== 'src1')!;
    expect(pasted.transform.position).toEqual({ x: 42, y: 24 });
    const undone = cmd.undo(result);
    expect(undone.objects[pasted.id]).toBeUndefined();
    expect(undone.layers[layerId]!.objectIds).toHaveLength(0);
  });

  it('paste all-artboards creates one copy per artboard, single undo removes all', () => {
    const doc = baseDoc();
    const layerId = doc.activeLayerId;
    const docWithArtboards: DocumentModel = {
      ...doc,
      artboards: {
        ab1: { id: 'ab1', name: 'A1', x: 0, y: 0, width: 800, height: 600, visible: true, background: { type: 'color', color: '#ffffff' } },
        ab2: { id: 'ab2', name: 'A2', x: 900, y: 0, width: 800, height: 600, visible: true, background: { type: 'color', color: '#ffffff' } },
      },
    };
    const cmd = new PasteObjectsCommand(fragmentAt(5, 5), layerId, 'all-artboards', ['ab1', 'ab2']);
    const result = cmd.execute(docWithArtboards);
    expect(result.layers[layerId]!.objectIds).toHaveLength(2);
    expect(cmd.undo(result).layers[layerId]!.objectIds).toHaveLength(0);
  });
});
