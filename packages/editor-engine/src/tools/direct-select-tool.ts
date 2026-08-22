import type { DocumentModel, SelectionState } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';
import { getObjectBounds } from '@vectoria/core';
import { getTransformMatrix } from '@vectoria/core';
import { mat3TransformPoint } from '@vectoria/shared';

export interface NodeHit {
  readonly objectId: string;
  readonly nodeIndex: number;
  readonly distancePx: number;
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
        if (distancePx <= tolerancePx && (!best || distancePx < best.distancePx)) best = { objectId: object.id, nodeIndex, distancePx };
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
}
