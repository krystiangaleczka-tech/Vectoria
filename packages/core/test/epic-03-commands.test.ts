import { describe, expect, it } from 'vitest';
import {
  AlignObjectsCommand,
  CommandHistory,
  DuplicateObjectsCommand,
  ReorderObjectsCommand,
  TransformObjectsCommand,
  createDefaultDocument,
  createTransform,
  defaultObjectStyle,
  type RectangleObject,
  type DocumentModel,
} from '../src/index.js';

function documentWithRectangles(): DocumentModel {
  const doc = createDefaultDocument({ width: 800, height: 600 });
  const make = (id: string, x: number): RectangleObject => ({ type: 'rectangle', id, name: id, layerId: doc.activeLayerId, visible: true, locked: false, transform: createTransform({ x, y: 20 }), style: defaultObjectStyle, width: 40, height: 40, cornerRadius: 0 });
  const objects = { one: make('one', 20), two: make('two', 140), three: make('three', 260) };
  return { ...doc, objects, layers: { ...doc.layers, [doc.activeLayerId]: { ...doc.layers[doc.activeLayerId]!, objectIds: ['one', 'two', 'three'] } } };
}

describe('EPIC-03 command contracts', () => {
  it('duplicates with fresh IDs, reorders, and undoes as one history entry', () => {
    const history = new CommandHistory();
    let doc = documentWithRectangles();
    doc = history.execute(new DuplicateObjectsCommand(['one'], { x: 20, y: 20 }), doc);
    expect(Object.keys(doc.objects)).toHaveLength(4);
    expect(history.history).toHaveLength(1);
    doc = history.execute(new ReorderObjectsCommand(['one'], 'front'), doc);
    expect(doc.layers[doc.activeLayerId]!.objectIds.at(-1)).toBe('one');
    doc = history.undo(doc)!;
    expect(doc.layers[doc.activeLayerId]!.objectIds).not.toEqual(['two', 'three', 'one']);
  });

  it('aligns selected bounds and preserves undo', () => {
    let doc = documentWithRectangles();
    const history = new CommandHistory();
    doc = history.execute(new AlignObjectsCommand(['one', 'two'], 'right'), doc);
    expect(doc.objects.one!.transform.position.x).toBe(140);
    expect(doc.objects.two!.transform.position.x).toBe(140);
    doc = history.undo(doc)!;
    expect(doc.objects.one!.transform.position.x).toBe(20);
  });

  it('rejects invalid or locked transforms without history entries', () => {
    let doc = documentWithRectangles();
    const history = new CommandHistory();
    doc = { ...doc, objects: { ...doc.objects, one: { ...doc.objects.one!, locked: true } } };
    const unchanged = history.execute(new TransformObjectsCommand(['one'], new Map([['one', { ...doc.objects.one!.transform, scale: { x: 0, y: 1 } }]])), doc);
    expect(unchanged).toBe(doc);
    expect(history.canUndo).toBe(false);
  });
});
