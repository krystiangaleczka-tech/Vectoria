import type { DocumentModel, ObjectId, SceneObject } from '../model/types.js';
import { normalizeColor } from '@vectoria/shared';

export interface FindStyleCriteria {
  fillColor?: string;
  strokeWidth?: number;
  opacity?: number;
  fontFamily?: string;
  objectType?: SceneObject['type'];
}

export interface FindStyleMatch {
  objectId: ObjectId;
  objectName: string;
}

const EPS = 1e-6;

export function findObjectsByStyleCriteria(doc: DocumentModel, criteria: FindStyleCriteria): FindStyleMatch[] {
  const results: FindStyleMatch[] = [];

  const matches = (obj: SceneObject): boolean => {
    if (criteria.objectType && obj.type !== criteria.objectType) return false;
    
    if (criteria.fillColor !== undefined) {
      if (obj.style.fill.type !== 'solid' || normalizeColor(obj.style.fill.color) !== normalizeColor(criteria.fillColor)) {
        return false;
      }
    }
    
    if (criteria.strokeWidth !== undefined) {
      if (!obj.style.stroke || Math.abs(obj.style.stroke.width - criteria.strokeWidth) > EPS) {
        return false;
      }
    }
    
    if (criteria.opacity !== undefined) {
      if (Math.abs(obj.style.opacity - criteria.opacity) > EPS) {
        return false;
      }
    }
    
    if (criteria.fontFamily !== undefined) {
      if (obj.type !== 'text' && obj.type !== 'text-frame') return false;
      if (obj.fontFamily !== criteria.fontFamily) return false;
    }
    
    return true;
  };

  for (const layerId of doc.layerIds) {
    const layer = doc.layers[layerId];
    if (!layer || !layer.visible || layer.locked) continue;
    
    for (const objectId of layer.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj || !obj.visible || obj.locked) continue;
      
      // If no criteria specified, don't match everything, wait, actually if no criteria specified it matches nothing?
      // Or it matches everything? The UI shouldn't allow empty criteria, but let's say empty criteria matches everything.
      if (Object.keys(criteria).length === 0) continue;

      if (matches(obj)) {
        results.push({
          objectId: obj.id,
          objectName: obj.name,
        });
      }
    }
  }

  return results;
}
