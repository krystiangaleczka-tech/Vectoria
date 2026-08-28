import type { DocumentModel, SceneObject } from './types.js';

/**
 * Validates that no locked objects or layers were illegally mutated.
 * Returns an array of violation messages, or empty array if valid.
 */
export function validateLockedMutations(oldDoc: DocumentModel, newDoc: DocumentModel): string[] {
  const violations: string[] = [];

  for (const objectId of Object.keys(oldDoc.objects)) {
    const oldObj = oldDoc.objects[objectId];
    const newObj = newDoc.objects[objectId];

    // If object was deleted, check if it was locked or in a locked layer
    if (oldObj && !newObj) {
      if (oldObj.locked) {
        violations.push(`Cannot delete locked object: ${objectId}`);
      }
      const oldLayer = oldDoc.layers[oldObj.layerId];
      if (oldLayer?.locked) {
        violations.push(`Cannot delete object in locked layer: ${oldLayer.id}`);
      }
      continue;
    }

    if (oldObj && newObj && oldObj !== newObj) {
      const oldLayer = oldDoc.layers[oldObj.layerId];
      
      const isFullyLocked = oldObj.locked || oldLayer?.locked;
      const lockedAttrs = oldObj.lockedAttributes ?? [];

      if (isFullyLocked) {
        // Only allow non-editing changes: name, visible, locked, lockedAttributes
        if (
          oldObj.transform !== newObj.transform ||
          oldObj.style !== newObj.style ||
          oldObj.layerId !== newObj.layerId ||
          !areGeometriesEqual(oldObj, newObj)
        ) {
          violations.push(`Cannot mutate locked object or object in locked layer: ${objectId}`);
        }
      } else if (lockedAttrs.length > 0) {
        if (lockedAttrs.includes('position') && (oldObj.transform.position.x !== newObj.transform.position.x || oldObj.transform.position.y !== newObj.transform.position.y)) {
          violations.push(`Cannot mutate position of object with locked position: ${objectId}`);
        }
        if (lockedAttrs.includes('rotation') && oldObj.transform.rotation !== newObj.transform.rotation) {
          violations.push(`Cannot mutate rotation of object with locked rotation: ${objectId}`);
        }
        if (lockedAttrs.includes('size') && (oldObj.transform.scale.x !== newObj.transform.scale.x || oldObj.transform.scale.y !== newObj.transform.scale.y)) {
          violations.push(`Cannot mutate scale of object with locked size: ${objectId}`);
        }
        if (lockedAttrs.includes('style') && oldObj.style !== newObj.style) {
          violations.push(`Cannot mutate style of object with locked style: ${objectId}`);
        }
        if (lockedAttrs.includes('content') && !areGeometriesEqual(oldObj, newObj)) {
          violations.push(`Cannot mutate content/geometry of object with locked content: ${objectId}`);
        }
      }
    }
  }

  return violations;
}

function areGeometriesEqual(a: SceneObject, b: SceneObject): boolean {
  if (a.type !== b.type) return false;
  
  // Shallow compare all keys except the generic ones.
  // This is a rough heuristic to check if geometry/content changed without writing a huge switch statement.
  const ignoredKeys = new Set(['name', 'visible', 'locked', 'lockedAttributes', 'transform', 'style', 'layerId', 'id']);
  
  const keysA = Object.keys(a).filter(k => !ignoredKeys.has(k));
  const keysB = Object.keys(b).filter(k => !ignoredKeys.has(k));
  
  if (keysA.length !== keysB.length) return false;
  
  for (const k of keysA) {
    if ((a as any)[k] !== (b as any)[k]) return false;
  }
  
  return true;
}
