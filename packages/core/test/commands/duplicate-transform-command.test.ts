import { describe, it, expect } from 'vitest';
import { DuplicateTransformCommand } from '../../src/commands/duplicate-transform-command.js';
import {
  createDefaultDocument,
  createTransform,
  type DocumentModel,
  type RectangleObject,
} from '../../src/index.js';

function docWithRect(id: string, x: number, y: number): DocumentModel {
  const doc = createDefaultDocument();
  const layerId = doc.activeLayerId;
  const rect: RectangleObject = {
    id,
    type: 'rectangle',
    name: 'Rect',
    layerId,
    visible: true,
    locked: false,
    transform: createTransform({ x, y }),
    style: {
      fill: { type: 'none' },
      stroke: null,
      opacity: 1,
    },
    width: 100,
    height: 100,
    cornerRadius: 0,
  };
  const layer = doc.layers[layerId]!;
  return {
    ...doc,
    layers: {
      [layerId]: {
        ...layer,
        objectIds: [id],
      },
    },
    objects: { [id]: rect },
  };
}

describe('DuplicateTransformCommand', () => {
  it('duplicates objects with default offset', () => {
    const doc = docWithRect('obj1', 10, 10);
    const layerId = doc.activeLayerId;

    const cmd = new DuplicateTransformCommand(['obj1']);
    const result = cmd.execute(doc);

    expect(result.layers[layerId]!.objectIds.length).toBe(2);
    const newId = result.layers[layerId]!.objectIds.find((id) => id !== 'obj1')!;
    const newObj = result.objects[newId];
    expect(newObj).toBeDefined();
    expect(newObj!.transform.position).toEqual({ x: 30, y: 30 }); // 10 + 20

    // undo
    const undone = cmd.undo(result);
    expect(undone.layers[layerId]!.objectIds.length).toBe(1);
    expect(undone.objects[newId]).toBeUndefined();
  });

  it('applies custom delta (dx, dy, rotationDeg) to the copy', () => {
    const doc = docWithRect('src1', 10, 10); // transform.position {10,10}, rotation 0
    const cmd = new DuplicateTransformCommand(['src1'], { dx: 30, dy: -10, rotationDeg: 90 });
    const result = cmd.execute(doc);
    const copy = Object.values(result.objects).find((o) => o!.id !== 'src1')!;
    expect(copy.transform.position).toEqual({ x: 40, y: 0 });
    expect(copy.transform.rotation).toBeCloseTo(Math.PI / 2, 10);
    const undone = cmd.undo(result);
    expect(undone.objects[copy.id]).toBeUndefined();
  });

  it('rejects non-finite delta without mutation', () => {
    const doc = docWithRect('src1', 10, 10);
    const cmd = new DuplicateTransformCommand(['src1'], { dx: Number.NaN });
    expect(cmd.execute(doc)).toBe(doc);
  });
});
