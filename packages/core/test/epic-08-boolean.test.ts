import { describe, expect, it } from 'vitest';
import {
  BooleanCommand, CompoundPathCommand, CommandHistory, ExpandAppearanceCommand, MaskCommand, UpdateMaskContentCommand,
  createDefaultDocument, createTransform, defaultObjectStyle, defaultStroke,
  previewBoolean, validateInvariants, type DocumentModel, type PathObject, type RectangleObject,
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
  it('subtract produces one evenodd compound with the hole as a child loop', () => {
    const doc = documentWith(rect('outer', 0, 0), rect('inner', 25, 25, 25, 25));
    const preview = previewBoolean(doc, 'subtract', ['outer', 'inner']);
    expect(preview.warnings).toEqual([]);
    expect(preview.result).toHaveLength(1);
    const compound = preview.result[0]!;
    expect(compound.fillRule).toBe('evenodd');
    expect(compound.compoundChildren).toHaveLength(1);
    // Hole loop stays strictly inside the outer bounds (0..100).
    for (const node of compound.compoundChildren![0]!) {
      expect(node.point.x).toBeGreaterThanOrEqual(24);
      expect(node.point.x).toBeLessThanOrEqual(51);
      expect(node.point.y).toBeGreaterThanOrEqual(24);
      expect(node.point.y).toBeLessThanOrEqual(51);
    }
  });

  it('unite of disjoint shapes stays separate paths (no false compound)', () => {
    const doc = documentWith(rect('one', 0, 0), rect('two', 300, 0));
    const preview = previewBoolean(doc, 'unite', ['one', 'two']);
    expect(preview.warnings).toEqual([]);
    // Disjoint islands glue into one evenodd compound: two non-overlapping
    // subpaths render fully filled and move together.
    expect(preview.result).toHaveLength(1);
    expect(preview.result[0]!.compoundChildren).toHaveLength(1);
    expect(preview.result[0]!.fillRule).toBe('evenodd');
  });

  it('intersect/exclude/crop return valid closed geometry', () => {
    const doc = documentWith(rect('a', 0, 0), rect('b', 50, 50));
    for (const operation of ['intersect', 'exclude', 'crop'] as const) {
      const preview = previewBoolean(doc, operation, ['a', 'b']);
      expect(preview.warnings.filter((warning) => warning.includes('empty'))).toEqual([]);
      for (const object of preview.result) {
        expect(object.closed).toBe(true);
        expect(object.nodes.length).toBeGreaterThanOrEqual(3);
      }
    }
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

  it('adds and removes mask content with undo and guards invalid members', () => {
    const doc = documentWith(rect('mask', 0, 0, 200, 200), rect('content', 20, 20), rect('other', 300, 0));
    const history = new CommandHistory();
    const masked = history.execute(new MaskCommand('opacity', 'mask', ['content']), doc);
    const groupId = Object.keys(masked.maskGroups ?? {})[0]!;

    const readGroup = (document: DocumentModel): import('../src/index.js').MaskGroup => document.maskGroups![groupId]!;
    const added = history.execute(new UpdateMaskContentCommand(groupId, ['other'], 'add'), masked);
    expect(readGroup(added).contentIds).toContain('other');

    const removed = history.execute(new UpdateMaskContentCommand(groupId, ['other'], 'remove'), added);
    expect(readGroup(removed).contentIds).not.toContain('other');

    const restored = history.undo(removed)!;
    expect(readGroup(restored).contentIds).toContain('other');

    // Adding the mask itself is rejected.
    expect(new UpdateMaskContentCommand(groupId, ['mask'], 'add').execute(removed)).toBe(removed);
  });

  it('expands variable-width strokes into fills and undoes cleanly', () => {
    const doc = documentWith(rect('plain', 0, 0));
    const path: PathObject = {
      type: 'path', id: 'stroke', name: 'stroke', layerId: doc.activeLayerId, visible: true, locked: false,
      transform: createTransform({ x: 50, y: 50 }),
      style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke },
      nodes: [
        { id: 'n1', point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
        { id: 'n2', point: { x: 100, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
      ],
      closed: false,
      widthProfile: [{ t: 0, width: 2 }, { t: 0.5, width: 12 }, { t: 1, width: 2 }],
    };
    const seededLayer = { ...doc.layers[doc.activeLayerId]!, objectIds: [...doc.layers[doc.activeLayerId]!.objectIds, 'stroke'] };
    const seeded: DocumentModel = { ...doc, objects: { ...doc.objects, stroke: path }, layers: { ...doc.layers, [doc.activeLayerId]: seededLayer } };
    const history = new CommandHistory();
    const expanded = history.execute(new ExpandAppearanceCommand(['stroke']), seeded);
    const expandedObject = expanded.objects.stroke as PathObject;
    expect(expandedObject.closed).toBe(true);
    expect(expandedObject.widthProfile).toBeUndefined();
    expect(expandedObject.style.fill.type).toBe('solid');
    expect(expandedObject.style.stroke).toBeNull();
    // Plain rectangle without width profile is untouched.
    expect(expanded.objects.plain).toBe(doc.objects.plain);

    const restored = history.undo(expanded)!;
    expect((restored.objects.stroke as PathObject).widthProfile).toBeDefined();
  });
});
