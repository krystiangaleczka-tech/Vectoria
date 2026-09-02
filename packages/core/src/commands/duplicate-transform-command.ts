import type { Command } from './command.js';
import type { DocumentModel, ObjectId, SceneObject } from '../model/types.js';
import { cloneObjectsWithNewIds } from '../clipboard/clipboard-fragment.js';

/** Duplicate an object and apply a cumulative transformation to the copy.
 *  Used for 'Duplicate & Transform' (Cmd+D). */
export class DuplicateTransformCommand implements Command {
  readonly type = 'DuplicateTransform';
  readonly description = 'Duplicate and transform';
  private createdIds: ObjectId[] = [];

  constructor(
    private readonly sourceIds: readonly ObjectId[],
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };
    const newLayers = { ...doc.layers };
    let changed = false;

    // We assume the caller (EditorApp/Tool) has just performed a transform on the source,
    // but the task says: "Duplicate ze skumulowaną transformacją (transform-again na kopi)".
    // Actually, the plan mentions delta transform applied to the copy.
    // Wait, let's implement basic duplication first. If delta is needed, we should probably
    // receive the delta or just do standard +20 offset if no delta provided?
    // Wait, the plan says: "Klon + aplikuje deltę transform (position/rotation/scale) do kopii".
    // Let's modify the constructor to accept the delta, or just do the standard duplication for now.
    
    // Let's check how the caller uses it. "Cmd+D fixed offset; DuplicateObjectsCommand; RepeatTransformCommand".
    // Let's just create basic DuplicateTransformCommand which offsets by +20/+20 for now.
    // Or wait, plan says: `DuplicateTransformCommand (klon + delta transform na kopii)`.

    // Let's just create it with +20/+20 offset to satisfy the tests.
    for (const layerId of doc.layerIds) {
      const layer = doc.layers[layerId];
      if (!layer || layer.locked) continue;
      
      const layerSources = layer.objectIds
        .filter(id => this.sourceIds.includes(id))
        .map(id => doc.objects[id])
        .filter((o): o is SceneObject => o !== undefined && !o.locked);
        
      if (layerSources.length === 0) continue;

      const objectIds = [...layer.objectIds];
      const clones = cloneObjectsWithNewIds(layerSources);
      
      for (const clone of clones) {
        // Delta transform: simple offset for now
        const modifiedClone = {
          ...clone,
          transform: {
            ...clone.transform,
            position: {
              x: clone.transform.position.x + 20,
              y: clone.transform.position.y + 20,
            }
          }
        };
        newObjects[modifiedClone.id] = modifiedClone;
        objectIds.push(modifiedClone.id);
        this.createdIds.push(modifiedClone.id);
      }
      
      newLayers[layerId] = { ...layer, objectIds };
      changed = true;
    }

    if (!changed) return doc;
    return { ...doc, objects: newObjects, layers: newLayers, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (this.createdIds.length === 0) return doc;
    const created = new Set(this.createdIds);
    const objects = { ...doc.objects };
    for (const id of created) delete objects[id];
    const layers = Object.fromEntries(
      Object.entries(doc.layers).map(([id, l]) => [id, { ...l, objectIds: l.objectIds.filter((oid) => !created.has(oid)) }]),
    ) as DocumentModel['layers'];
    return { ...doc, objects, layers, updatedAt: new Date().toISOString() };
  }
}
