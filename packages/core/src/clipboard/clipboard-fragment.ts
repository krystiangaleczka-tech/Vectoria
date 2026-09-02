import { generateId } from '@vectoria/shared';
import type { SceneObject } from '../model/types.js';
import type { Vec2 } from '@vectoria/shared';

/** Session-scoped copy payload. Type-only contract (epic L27).
 *  Serialization + validation live in @vectoria/io (Zod); this module stays pure. */
export interface ClipboardFragment {
  readonly schemaVersion: 1;
  readonly type: 'ClipboardFragment';
  readonly objects: readonly SceneObject[];
  readonly sourceArtboardId?: string;
  readonly sourceLayerId?: string;
  readonly origin: Vec2;
}

export function createClipboardFragment(objects: readonly SceneObject[]): ClipboardFragment {
  return {
    schemaVersion: 1,
    type: 'ClipboardFragment',
    objects: cloneObjectsWithNewIds(objects),
    origin: { x: 0, y: 0 }
  };
}

/** Deep-clone fragment objects with fresh object IDs and fresh path node IDs.
 *  Path node IDs must regenerate too — they are addressed as `${objectId}:${index}`
 *  in selection state and would collide across pastes otherwise. */
export function cloneObjectsWithNewIds(objects: readonly SceneObject[]): SceneObject[] {
  return objects.map((object) => {
    const clone = structuredClone(object) as SceneObject;
    const withNewId = { ...clone, id: generateId() };
    return withNewId.type === 'path'
      ? { ...withNewId, nodes: withNewId.nodes.map((node) => ({ ...node, id: generateId() })) }
      : withNewId;
  });
}
