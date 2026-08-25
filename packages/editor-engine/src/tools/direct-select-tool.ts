import type { DocumentModel, SelectionState } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';
import { getObjectBounds } from '@vectoria/core';
import { getTransformMatrix } from '@vectoria/core';
import { mat3TransformPoint } from '@vectoria/shared';
import { pointInPolygon } from '@vectoria/shared';

export interface NodeHit {
  readonly objectId: string;
  readonly nodeIndex: number;
  readonly distancePx: number;
  readonly part?: 'node' | 'in-handle' | 'out-handle';
}

/** Node-mode selection policy for path objects. Node IDs use stable object:index keys. */
export class DirectSelectTool {
  readonly id = 'direct-select' as const;
  readonly cursor = 'default';

  /** Find nearest visible, unlocked path node within screen-space tolerance. */
  hitNode(doc: DocumentModel, worldPoint: Vec2, zoom: number, tolerancePx = 8): NodeHit | null {
    let best: NodeHit | null = null;
    for (const object of Object.values(doc.objects)) {
      if (object.type !== 'path' || !object.visible || object.locked) continue;
      const bounds = getObjectBounds(object);
      if (worldPoint.x < bounds.x - tolerancePx / zoom || worldPoint.x > bounds.x + bounds.width + tolerancePx / zoom || worldPoint.y < bounds.y - tolerancePx / zoom || worldPoint.y > bounds.y + bounds.height + tolerancePx / zoom) continue;
      const matrix = getTransformMatrix(object.transform);
      for (let nodeIndex = 0; nodeIndex < object.nodes.length; nodeIndex += 1) {
        const node = object.nodes[nodeIndex]!;
        const point = mat3TransformPoint(matrix, node.point);
        const distancePx = Math.hypot(worldPoint.x - point.x, worldPoint.y - point.y) * zoom;
        if (distancePx <= tolerancePx && (!best || distancePx < best.distancePx)) best = { objectId: object.id, nodeIndex, distancePx, part: 'node' };
      }
    }
    return best;
  }

  /** Find a node handle in screen-space. Nodes take precedence over handles. */
  hitHandle(doc: DocumentModel, worldPoint: Vec2, zoom: number, objectId?: string, tolerancePx = 8): NodeHit | null {
    let best: NodeHit | null = null;
    for (const object of Object.values(doc.objects)) {
      if (object.type !== 'path' || object.id !== (objectId ?? object.id) || !object.visible || object.locked) continue;
      const matrix = getTransformMatrix(object.transform);
      for (let nodeIndex = 0; nodeIndex < object.nodes.length; nodeIndex += 1) {
        const node = object.nodes[nodeIndex]!;
        for (const [part, handle] of [['in-handle', node.inHandle], ['out-handle', node.outHandle] ] as const) {
          if (!handle) continue;
          const point = mat3TransformPoint(matrix, handle);
          const distancePx = Math.hypot(worldPoint.x - point.x, worldPoint.y - point.y) * zoom;
          if (distancePx <= tolerancePx && (!best || distancePx < best.distancePx)) best = { objectId: object.id, nodeIndex, distancePx, part };
        }
      }
    }
    return best;
  }

  /** Produce node-mode selection after click or Shift+click. */
  select(selection: SelectionState, hit: NodeHit | null, additive = false): SelectionState {
    const nodeId = hit ? `${hit.objectId}:${hit.nodeIndex}` : null;
    const nodeIds = nodeId
      ? additive
        ? selection.nodeIds.includes(nodeId) ? selection.nodeIds.filter((id) => id !== nodeId) : [...selection.nodeIds, nodeId]
        : [nodeId]
      : [];
    return { objectIds: hit ? [hit.objectId] : selection.objectIds, nodeIds, mode: 'node' };
  }

  /** Select transformed path nodes enclosed by a lasso polygon. */
  lasso(context: { document: DocumentModel; selection: SelectionState; polygon: readonly Vec2[]; objectId: string; additive?: boolean }): SelectionState {
    const object = context.document.objects[context.objectId];
    if (object?.type !== 'path' || context.polygon.length < 3) return { ...context.selection, mode: 'node' };
    const matrix = getTransformMatrix(object.transform);
    const ids = object.nodes.map((node, index) => pointInPolygon(mat3TransformPoint(matrix, node.point), context.polygon) ? `${object.id}:${index}` : null).filter((id): id is string => id !== null);
    return { objectIds: [object.id], nodeIds: context.additive ? [...new Set([...context.selection.nodeIds, ...ids])] : ids, mode: 'node' };
  }
}
