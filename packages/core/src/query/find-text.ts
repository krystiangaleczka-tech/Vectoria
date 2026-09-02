import type { DocumentModel, ObjectId } from '../model/types.js';

export interface FindTextMatch {
  objectId: ObjectId;
  objectName: string;
  startIndex: number;
  length: number;
  text: string;
}

export interface FindTextCriteria {
  searchTerm: string;
  matchCase?: boolean;
  wholeWord?: boolean;
}

export function findTextMatches(doc: DocumentModel, criteria: FindTextCriteria): FindTextMatch[] {
  const { searchTerm, matchCase, wholeWord } = criteria;
  if (!searchTerm) return [];

  const results: FindTextMatch[] = [];
  const flags = matchCase ? 'gu' : 'giu';
  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patternStr = wholeWord ? `\\b${escaped}\\b` : escaped;
  
  let regex: RegExp;
  try {
    regex = new RegExp(patternStr, flags);
  } catch {
    return [];
  }

  for (const layerId of doc.layerIds) {
    const layer = doc.layers[layerId];
    if (!layer || !layer.visible || layer.locked) continue;
    
    for (const objectId of layer.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj || !obj.visible || obj.locked) continue;
      
      if ((obj.type === 'text' || obj.type === 'text-frame') && obj.text) {
        let match: RegExpExecArray | null;
        regex.lastIndex = 0; // reset for each object just in case
        while ((match = regex.exec(obj.text)) !== null) {
          const startIndex = Array.from(obj.text.slice(0, match.index)).length;
          const matchLength = Array.from(match[0]).length;
          results.push({
            objectId: obj.id,
            objectName: obj.name,
            startIndex,
            length: matchLength,
            text: obj.text,
          });
          if (match[0].length === 0) regex.lastIndex += 1;
        }
      }
    }
  }

  return results;
}
