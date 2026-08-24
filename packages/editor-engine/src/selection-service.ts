import type { ObjectId, SelectionState } from '@vectoria/core';
import type { Rect, Vec2 } from '@vectoria/shared';
import { rectContainsRect, rectIntersects } from '@vectoria/shared';
import type { DocumentModel } from '@vectoria/core';
import { getObjectBounds } from '@vectoria/core';
import { pointInPolygon } from '@vectoria/shared';

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

  /** Select objects whose bounds overlap a lasso polygon, preserving additive selection. */
  lasso(doc: DocumentModel, polygon: readonly Vec2[], additive = false, selection: SelectionState = emptySelection()): SelectionState {
    if (polygon.length < 3) return additive ? selection : emptySelection();
    const ids: ObjectId[] = [];
    for (const layerId of doc.layerIds) {
      const layer = doc.layers[layerId];
      if (!layer || !layer.visible || layer.locked) continue;
      for (const objectId of layer.objectIds) {
        const object = doc.objects[objectId];
        if (!object || !object.visible || object.locked) continue;
        const bounds = getObjectBounds(object);
        const corners = [
          { x: bounds.x, y: bounds.y },
          { x: bounds.x + bounds.width, y: bounds.y },
          { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
          { x: bounds.x, y: bounds.y + bounds.height },
        ];
        if (corners.some((corner) => pointInPolygon(corner, polygon))) ids.push(objectId);
      }
    }
    return this.selectObjects(selection, ids, additive);
  }

  /** Select path nodes contained by a lasso polygon using stable node keys. */
  lassoNodes(doc: DocumentModel, polygon: readonly Vec2[], objectId: ObjectId, additive = false, selection: SelectionState = emptySelection()): SelectionState {
    const object = doc.objects[objectId];
    if (polygon.length < 3 || object?.type !== 'path') return additive ? selection : { ...emptySelection(), mode: 'node' };
    const nodeIds = object.nodes.map((node, index) => pointInPolygon(node.point, polygon) ? `${objectId}:${index}` : null).filter((id): id is string => id !== null);
    const next = additive ? [...new Set([...selection.nodeIds, ...nodeIds])] : nodeIds;
    return { objectIds: [objectId], nodeIds: next, mode: 'node' };
  }
}

export const selectionService = new SelectionService();
