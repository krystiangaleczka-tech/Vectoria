import { describe, expect, it } from 'vitest';
import {
  BooleanCommand, CompoundPathCommand, CommandHistory, MaskCommand, createDefaultDocument, createTransform, defaultObjectStyle,
  previewBoolean, validateInvariants, type DocumentModel, type RectangleObject,
} from '../src/index.js';

function rect(id: string, x: number, y: number, width = 100, height = 100): RectangleObject {
  return { type: 'rectangle', id, name: id, layerId: 'layer', visible: true, locked: false, transform: createTransform({ x, y }), style: defaultObjectStyle, width, height, cornerRadius: 0 };
}

function documentWith(...objects: RectangleObject[]): DocumentModel {
  const base = createDefaultDocument();
  const normalized = Object.fromEntries(objects.map((object) => [object.id, { ...object, layerId: base.activeLayerId }]));
  return { ...base, objects: normalized, layers: { ...base.layers, [base.activeLayerId]: { ...base.layers[base.activeLayerId]!, objectIds: objects.map((object) => object.id) } } };
}

describe('EPIC-08 boolean and mask contracts', () => {
  it('normalizes rectangles and returns deterministic subtract holes', () => {
    const doc = documentWith(rect('outer', 0, 0), rect('inner', 25, 25, 25, 25));
    const preview = previewBoolean(doc, 'subtract', ['outer', 'inner']);
    expect(preview.warnings).toEqual([]);
    expect(preview.result).toHaveLength(2);
    expect(preview.result[0]!.transform.position).toEqual({ x: 0, y: 0 });
  });

  it('applies one reversible command and preserves sources on failed preview', () => {
    const doc = documentWith(rect('one', 0, 0));
    const history = new CommandHistory();
    expect(history.execute(new BooleanCommand('unite', ['one']), doc)).toBe(doc);
    expect(history.historyEntries).toHaveLength(0);
  });

  it('stores compound children and mask references atomically', () => {
    const doc = documentWith(rect('one', 0, 0), rect('two', 120, 0));
    const history = new CommandHistory();
    const compound = history.execute(new CompoundPathCommand(['one', 'two']), doc);
    const compoundObject = compound.objects.one;
    expect(compoundObject?.type).toBe('path');
    expect(compoundObject?.type === 'path' ? compoundObject.compoundChildren : undefined).toHaveLength(2);
    const masked = history.execute(new MaskCommand('clip', 'one', ['two']), doc);
    expect(Object.values(masked.maskGroups ?? {})).toHaveLength(1);
    expect(validateInvariants(masked)).toEqual([]);
    expect(history.undo(masked)?.objects.one?.type).toBe('rectangle');
  });
});
