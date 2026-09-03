import { describe, it, expect } from 'vitest';
import { ReplaceStylesBatchCommand } from '../../src/commands/replace-styles-command.js';
import {
  createDefaultDocument,
  createTransform,
  type DocumentModel,
  type ObjectStyle,
  type RectangleObject,
} from '../../src/index.js';

const style = (color: string, opacity = 1): ObjectStyle => ({
  fill: { type: 'solid', color },
  stroke: null,
  opacity,
});

function docWith(id: string, st: ObjectStyle, locked = false): DocumentModel {
  const doc = createDefaultDocument();
  const layerId = doc.activeLayerId;
  const obj: RectangleObject = {
    id,
    type: 'rectangle',
    name: id,
    layerId,
    visible: true,
    locked,
    transform: createTransform({ x: 0, y: 0 }),
    style: st,
    width: 10,
    height: 10,
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
    objects: { [id]: obj },
  };
}

describe('ReplaceStylesBatchCommand', () => {
  it('applies patches and undo restores exact previous styles', () => {
    const doc = docWith('a', style('#ff0000'));
    const updates = new Map([['a', { fill: { type: 'solid' as const, color: '#00ff00' }, opacity: 0.5 }]]);
    const cmd = new ReplaceStylesBatchCommand(updates);
    const result = cmd.execute(doc);
    expect(result.objects['a']!.style.fill).toEqual({ type: 'solid', color: '#00ff00' });
    expect(result.objects['a']!.style.opacity).toBe(0.5);
    const undone = cmd.undo(result);
    expect(undone.objects['a']!.style).toEqual(style('#ff0000'));
  });

  it('skips locked objects and out-of-range opacity', () => {
    const lockedDoc = docWith('a', style('#ff0000'), true);
    const cmd = new ReplaceStylesBatchCommand(new Map([['a', { opacity: 0.1 }]]));
    expect(cmd.execute(lockedDoc)).toBe(lockedDoc);
    const badOpacity = new ReplaceStylesBatchCommand(new Map([['a', { opacity: 1.5 }]]));
    const doc = docWith('a', style('#ff0000'));
    expect(badOpacity.execute(doc)).toBe(doc);
  });

  it('input map is not mutated (command immutability)', () => {
    const updates = new Map([['a', { opacity: 0.3 }]]);
    const snapshot = new Map(updates);
    const cmd = new ReplaceStylesBatchCommand(updates);
    cmd.execute(docWith('a', style('#ff0000')));
    expect(updates).toEqual(snapshot);
  });
});
