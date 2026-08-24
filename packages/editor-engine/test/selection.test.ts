import { describe, expect, it } from 'vitest';
import {
  createDefaultDocument,
  createTransform,
  defaultObjectStyle,
  type DocumentModel,
  type RectangleObject,
  type PathObject,
} from '@vectoria/core';
import { DirectSelectTool, DragSession, SelectTool, SelectionService, emptySelection, hitTestDetailed } from '../src/index.js';

function withObjects(objects: readonly (RectangleObject | PathObject)[]): DocumentModel {
  const doc = createDefaultDocument({ width: 800, height: 600 });
  return {
    ...doc,
    objects: Object.fromEntries(objects.map((object) => [object.id, object])),
    layers: { ...doc.layers, [doc.activeLayerId]: { ...doc.layers[doc.activeLayerId]!, objectIds: objects.map((object) => object.id) } },
  };
}

const rectangle = (id: string, x: number, y: number): RectangleObject => ({
  type: 'rectangle', id, name: id, layerId: 'layer', visible: true, locked: false,
  transform: createTransform({ x, y }), style: defaultObjectStyle, width: 100, height: 80, cornerRadius: 0,
});

describe('Selection contracts', () => {
  it('toggles additive object selection and selects marquee candidates', () => {
    const doc = withObjects([rectangle('one', 20, 20), rectangle('two', 160, 20)]);
    const service = new SelectionService();
    let selection = service.selectObject({ objectIds: [], nodeIds: [], mode: 'object' }, 'one');
    selection = service.selectObject(selection, 'two', true);
    expect(selection.objectIds).toEqual(['one', 'two']);
    selection = service.selectObject(selection, 'one', true);
    expect(selection.objectIds).toEqual(['two']);
    expect(service.marquee(doc, { x: 0, y: 0, width: 280, height: 120 }).objectIds).toEqual(['one', 'two']);
  });

  it('returns top-most detailed hit and skips locked objects', () => {
    const top = { ...rectangle('top', 20, 20), locked: false };
    const bottom = { ...rectangle('bottom', 20, 20), locked: true };
    const doc = withObjects([bottom, top]);
    expect(hitTestDetailed(doc, { x: 60, y: 50 }, { zoom: 2 })[0]?.objectId).toBe('top');
    expect(hitTestDetailed({ ...doc, objects: { bottom, top: { ...top, locked: true } } }, { x: 60, y: 50 })).toEqual([]);
  });

  it('selects transformed path nodes in direct-select mode', () => {
    const path: PathObject = {
      type: 'path', id: 'path', name: 'Path', layerId: 'layer', visible: true, locked: false,
      transform: { ...createTransform({ x: 100, y: 80 }), rotation: Math.PI / 2 }, style: defaultObjectStyle,
      nodes: [
        { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
        { point: { x: 40, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
      ], closed: false,
    };
    const hit = new DirectSelectTool().hitNode(withObjects([path]), { x: 100, y: 120 }, 1);
    expect(hit?.objectId).toBe('path');
    expect(hit?.nodeIndex).toBe(1);
  });

  it('keeps drag displacement transient until command commit', () => {
    const session = new DragSession({ objectIds: ['one'], initialTransforms: {}, initialBounds: { x: 0, y: 0, width: 1, height: 1 }, pivotWorld: { x: 0, y: 0 }, operation: 'move' }, { x: 10, y: 20 });
    session.update({ x: 18, y: 14 });
    expect(session.delta).toEqual({ x: 8, y: -6 });
  });

  it('cycles overlapping candidates deterministically', () => {
    const doc = withObjects([rectangle('bottom', 20, 20), rectangle('top', 20, 20)]);
    const tool = new SelectTool();
    const context = { document: doc, selection: emptySelection(), screenPoint: { x: 50, y: 50 }, worldPoint: { x: 50, y: 50 }, zoom: 1 };
    expect(tool.pick(context).hit?.objectId).toBe('top');
    expect(tool.cycle(context).hit?.objectId).toBe('bottom');
  });

  it('selects object bounds and nodes with lasso', () => {
    const doc = withObjects([rectangle('one', 20, 20), rectangle('two', 300, 300)]);
    const service = new SelectionService();
    const polygon = [{ x: 0, y: 0 }, { x: 160, y: 0 }, { x: 160, y: 160 }, { x: 0, y: 160 }];
    expect(service.lasso(doc, polygon).objectIds).toEqual(['one']);
  });
});
