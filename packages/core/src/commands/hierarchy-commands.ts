import type { DocumentModel, LayerId, ObjectId, SceneObject, GroupObject } from '../model/types.js';
import type { Command } from './command.js';

export type HierarchyDropTarget =
  | { readonly type: 'before'; readonly targetId: ObjectId }
  | { readonly type: 'after'; readonly targetId: ObjectId }
  | { readonly type: 'inside'; readonly targetId: ObjectId }
  | { readonly type: 'layer'; readonly targetLayerId: LayerId };

export interface HierarchyValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

/**
 * Recursively checks if candidateId is a descendant of ancestorId.
 */
export function isDescendantOf(
  doc: DocumentModel,
  candidateId: ObjectId,
  ancestorId: ObjectId,
  visited: Set<ObjectId> = new Set(),
): boolean {
  if (candidateId === ancestorId) return true;
  if (visited.has(ancestorId)) return false;
  visited.add(ancestorId);

  const ancestor = doc.objects[ancestorId];
  if (!ancestor || ancestor.type !== 'group') return false;

  for (const childId of ancestor.childIds) {
    if (childId === candidateId) return true;
    if (isDescendantOf(doc, candidateId, childId, visited)) return true;
  }
  return false;
}

/**
 * Finds the direct parent container (Layer or Group) holding the given objectId.
 */
export function findParentContainer(
  doc: DocumentModel,
  objectId: ObjectId,
): { type: 'layer'; layerId: LayerId; index: number } | { type: 'group'; groupId: ObjectId; index: number } | null {
  // Check in layers
  for (const [layerId, layer] of Object.entries(doc.layers)) {
    const idx = layer.objectIds.indexOf(objectId);
    if (idx !== -1) {
      return { type: 'layer', layerId, index: idx };
    }
  }

  // Check in groups
  for (const obj of Object.values(doc.objects)) {
    if (obj.type === 'group') {
      const idx = obj.childIds.indexOf(objectId);
      if (idx !== -1) {
        return { type: 'group', groupId: obj.id, index: idx };
      }
    }
  }

  return null;
}

/**
 * Checks whether any ancestor group of the object is locked.
 * A locked group must not lose or gain children via hierarchy moves.
 */
function hasLockedAncestorGroup(doc: DocumentModel, objectId: ObjectId): boolean {
  const parentMap = new Map<ObjectId, ObjectId>();
  for (const obj of Object.values(doc.objects)) {
    if (obj.type === 'group') {
      for (const childId of obj.childIds) {
        parentMap.set(childId, obj.id);
      }
    }
  }

  let current: ObjectId | undefined = parentMap.get(objectId);
  const visited = new Set<ObjectId>();
  while (current !== undefined && !visited.has(current)) {
    visited.add(current);
    const group = doc.objects[current];
    if (group && group.type === 'group' && group.locked) return true;
    current = parentMap.get(current);
  }
  return false;
}

/**
 * Validates whether moving the given objectIds to target is legally and structurally allowed.
 * Rejects cycles, locked sources/targets, locked layers, locked groups, and invalid parents.
 */
export function validateHierarchyMove(
  doc: DocumentModel,
  objectIds: readonly ObjectId[],
  target: HierarchyDropTarget,
): HierarchyValidationResult {
  if (!objectIds || objectIds.length === 0) {
    return { valid: false, reason: 'No objects selected to move' };
  }

  // Verify all source objects exist and are movable
  for (const id of objectIds) {
    const sourceObj = doc.objects[id];
    if (!sourceObj) {
      return { valid: false, reason: `Source object ${id} does not exist` };
    }
    if (sourceObj.locked) {
      return { valid: false, reason: `Cannot move locked object ${id}` };
    }
    const sourceLayer = doc.layers[sourceObj.layerId];
    if (sourceLayer?.locked) {
      return { valid: false, reason: `Cannot move object ${id} from locked layer ${sourceObj.layerId}` };
    }
    if (hasLockedAncestorGroup(doc, id)) {
      return { valid: false, reason: `Cannot move object ${id} out of a locked group` };
    }
  }

  if (target.type === 'layer') {
    const layer = doc.layers[target.targetLayerId];
    if (!layer) {
      return { valid: false, reason: `Target layer ${target.targetLayerId} does not exist` };
    }
    if (layer.locked) {
      return { valid: false, reason: `Target layer ${target.targetLayerId} is locked` };
    }
    return { valid: true };
  }

  // Target object must exist
  const targetObj = doc.objects[target.targetId];
  if (!targetObj) {
    return { valid: false, reason: `Target object ${target.targetId} does not exist` };
  }

  // Cannot drop an object relative to itself
  if (objectIds.includes(target.targetId)) {
    return { valid: false, reason: 'Cannot drop an object relative to itself' };
  }

  // Critical Cycle Protection: Target cannot be a descendant of any source object
  for (const sourceId of objectIds) {
    if (isDescendantOf(doc, target.targetId, sourceId)) {
      return {
        valid: false,
        reason: `Cannot move object into its own descendant (would create cycle: ${sourceId} -> ${target.targetId})`,
      };
    }
  }

  if (target.type === 'inside') {
    if (targetObj.type !== 'group') {
      return { valid: false, reason: 'Target object for inside drop must be a group' };
    }
    if (targetObj.locked) {
      return { valid: false, reason: `Cannot drop into locked group ${target.targetId}` };
    }
    const targetLayer = doc.layers[targetObj.layerId];
    if (targetLayer?.locked) {
      return { valid: false, reason: `Cannot drop into group in locked layer ${targetObj.layerId}` };
    }
  } else {
    // For 'before' or 'after', the target must have a valid parent container
    const parent = findParentContainer(doc, target.targetId);
    if (!parent) {
      return { valid: false, reason: `Target object ${target.targetId} has no parent container` };
    }
    if (parent.type === 'layer') {
      const parentLayer = doc.layers[parent.layerId];
      if (parentLayer?.locked) {
        return { valid: false, reason: `Cannot reorder objects in locked layer ${parent.layerId}` };
      }
    } else {
      const parentGroup = doc.objects[parent.groupId];
      if (parentGroup && parentGroup.type === 'group' && parentGroup.locked) {
        return { valid: false, reason: `Cannot reorder objects in locked group ${parent.groupId}` };
      }
      const parentLayer = doc.layers[parentGroup?.layerId ?? ''];
      if (parentLayer?.locked) {
        return { valid: false, reason: `Cannot reorder objects in locked layer ${parentGroup?.layerId}` };
      }
    }
  }

  return { valid: true };
}

/**
 * Command that moves one or more objects before, after, inside a group, or directly to a layer.
 * Updates layerId for all moved objects and their nested children.
 */
export class MoveHierarchyObjectsCommand implements Command {
  readonly type = 'MoveHierarchyObjects';
  readonly description = 'Move objects in hierarchy';

  private previousDoc: DocumentModel | null = null;

  constructor(
    private readonly objectIds: readonly ObjectId[],
    private readonly target: HierarchyDropTarget,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const validation = validateHierarchyMove(doc, this.objectIds, this.target);
    if (!validation.valid) {
      return doc;
    }

    this.previousDoc = doc;

    const sourceSet = new Set(this.objectIds);
    const nextObjects: Record<ObjectId, SceneObject> = { ...doc.objects };
    const nextLayers: Record<LayerId, import('../model/types.js').Layer> = {};

    // 1. Clean source objects from their current locations (layers and groups)
    for (const [layerId, layer] of Object.entries(doc.layers)) {
      nextLayers[layerId] = {
        ...layer,
        objectIds: layer.objectIds.filter((id) => !sourceSet.has(id)),
      };
    }

    for (const [objId, obj] of Object.entries(nextObjects)) {
      if (obj.type === 'group') {
        const filteredChildIds = obj.childIds.filter((id) => !sourceSet.has(id));
        if (filteredChildIds.length !== obj.childIds.length) {
          nextObjects[objId] = {
            ...obj,
            childIds: filteredChildIds,
          };
        }
      }
    }

    // Determine target layerId and insertion location
    let targetLayerId: LayerId;

    if (this.target.type === 'layer') {
      targetLayerId = this.target.targetLayerId;
      const targetLayer = nextLayers[targetLayerId]!;
      nextLayers[targetLayerId] = {
        ...targetLayer,
        objectIds: [...targetLayer.objectIds, ...this.objectIds],
      };
    } else if (this.target.type === 'inside') {
      const targetGroup = nextObjects[this.target.targetId] as GroupObject;
      targetLayerId = targetGroup.layerId;
      nextObjects[this.target.targetId] = {
        ...targetGroup,
        childIds: [...targetGroup.childIds, ...this.objectIds],
      };
    } else {
      // 'before' or 'after'
      const parent = findParentContainer(doc, this.target.targetId);
      if (!parent) return doc;

      if (parent.type === 'layer') {
        targetLayerId = parent.layerId;
        const targetLayer = nextLayers[targetLayerId]!;
        const currentList = [...targetLayer.objectIds];
        const targetIdx = currentList.indexOf(this.target.targetId);
        const insertIdx = this.target.type === 'before' ? targetIdx : targetIdx + 1;
        currentList.splice(insertIdx >= 0 ? insertIdx : currentList.length, 0, ...this.objectIds);
        nextLayers[targetLayerId] = {
          ...targetLayer,
          objectIds: currentList,
        };
      } else {
        const targetGroup = nextObjects[parent.groupId] as GroupObject;
        targetLayerId = targetGroup.layerId;
        const currentList = [...targetGroup.childIds];
        const targetIdx = currentList.indexOf(this.target.targetId);
        const insertIdx = this.target.type === 'before' ? targetIdx : targetIdx + 1;
        currentList.splice(insertIdx >= 0 ? insertIdx : currentList.length, 0, ...this.objectIds);
        nextObjects[parent.groupId] = {
          ...targetGroup,
          childIds: currentList,
        };
      }
    }

    // Update layerId for all moved objects and recursively for their children
    const updateLayerIdsRecursively = (id: ObjectId) => {
      const obj = nextObjects[id];
      if (obj) {
        nextObjects[id] = { ...obj, layerId: targetLayerId };
        if (obj.type === 'group') {
          obj.childIds.forEach(updateLayerIdsRecursively);
        }
      }
    };
    this.objectIds.forEach(updateLayerIdsRecursively);

    return {
      ...doc,
      layers: nextLayers,
      objects: nextObjects,
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previousDoc) return doc;
    return this.previousDoc;
  }
}
