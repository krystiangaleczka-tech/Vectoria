import type { Command } from './command.js';
import type { DocumentModel, ObjectId, ObjectStyle } from '../model/types.js';

export class ReplaceStylesBatchCommand implements Command {
  readonly type = 'ReplaceStylesBatch';
  readonly description = 'Replace styles';
  private previousStyles = new Map<ObjectId, ObjectStyle>();

  constructor(private readonly updates: ReadonlyMap<ObjectId, Partial<ObjectStyle>>) {}

  execute(doc: DocumentModel): DocumentModel {
    const objects = { ...doc.objects };
    let changed = false;
    this.previousStyles.clear();
    
    for (const [objectId, patch] of this.updates) {
      const object = doc.objects[objectId];
      if (!object || object.locked) continue;
      
      if (patch.opacity !== undefined && (!Number.isFinite(patch.opacity) || patch.opacity < 0 || patch.opacity > 1)) continue;
      
      const nextStyle: ObjectStyle = { ...object.style, ...patch };
      
      // simple JSON compare to avoid unnecessary history entries
      if (JSON.stringify(nextStyle) === JSON.stringify(object.style)) continue;
      
      this.previousStyles.set(objectId, object.style);
      objects[objectId] = { ...object, style: nextStyle };
      changed = true;
    }
    
    return changed ? { ...doc, objects, updatedAt: new Date().toISOString() } : doc;
  }

  undo(doc: DocumentModel): DocumentModel {
    if (this.previousStyles.size === 0) return doc;
    
    const objects = { ...doc.objects };
    for (const [id, style] of this.previousStyles) {
      if (objects[id]) {
        objects[id] = { ...objects[id]!, style };
      }
    }
    
    return { ...doc, objects, updatedAt: new Date().toISOString() };
  }
}
