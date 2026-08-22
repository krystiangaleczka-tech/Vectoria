import type { ObjectId, SelectionState } from '@vectoria/core';
import type { Rect } from '@vectoria/shared';
import { rectContainsRect, rectIntersects } from '@vectoria/shared';
import type { DocumentModel } from '@vectoria/core';
import { getObjectBounds } from '@vectoria/core';

export const emptySelection = (): SelectionState => ({ objectIds: [], nodeIds: [], mode: 'object' });

/** Pure selection operations shared by canvas tools and non-React consumers. */
export class SelectionService {
  /** Select or toggle one object while clearing stale node selection. */
  selectObject(selection: SelectionState, objectId: ObjectId | null, additive = false): SelectionState {
    if (!objectId) return { ...emptySelection(), mode: selection.mode };
    const ids = additive
      ? selection.objectIds.includes(objectId)
        ? selection.objectIds.filter((id) => id !== objectId)
        : [...selection.objectIds, objectId]
      : [objectId];
    return { objectIds: ids, nodeIds: [], mode: 'object' };
  }

  /** Replace or extend object selection with de-duplicated IDs. */
  selectObjects(selection: SelectionState, objectIds: readonly ObjectId[], additive = false): SelectionState {
    const next = [...new Set(objectIds)];
    if (!additive) return { objectIds: next, nodeIds: [], mode: 'object' };
    const existing = new Set(selection.objectIds);
    for (const id of next) existing.add(id);
    return { objectIds: [...existing], nodeIds: [], mode: 'object' };
  }

  /** Select or toggle one path node without changing object-mode contracts. */
  selectNode(selection: SelectionState, nodeId: string | null, additive = false): SelectionState {
    if (!nodeId) return { ...selection, nodeIds: [], mode: 'node' };
    const nodeIds = additive
      ? selection.nodeIds.includes(nodeId)
        ? selection.nodeIds.filter((id) => id !== nodeId)
        : [...selection.nodeIds, nodeId]
      : [nodeId];
    return { ...selection, nodeIds, mode: 'node' };
  }

  /** Select visible, unlocked objects intersecting or contained by marquee. */
  marquee(doc: DocumentModel, area: Rect, additive = false, fullyContained = false, visibleWorldRect?: Rect, selection: SelectionState = emptySelection()): SelectionState {
    const ids: ObjectId[] = [];
    for (const layerId of doc.layerIds) {
      const layer = doc.layers[layerId];
      if (!layer || !layer.visible || layer.locked) continue;
      for (const objectId of layer.objectIds) {
        const object = doc.objects[objectId];
        if (!object || !object.visible || object.locked) continue;
        const bounds = getObjectBounds(object);
        if (visibleWorldRect && !rectIntersects(bounds, visibleWorldRect)) continue;
        if (fullyContained ? rectContainsRect(area, bounds) : rectIntersects(area, bounds)) ids.push(objectId);
      }
    }
    return this.selectObjects(selection, ids, additive);
  }
}

export const selectionService = new SelectionService();
