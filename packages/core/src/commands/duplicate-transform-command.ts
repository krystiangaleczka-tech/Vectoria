import type { Command } from './command.js';
import type { DocumentModel, ObjectId, SceneObject, Transform2D } from '../model/types.js';
import { isValidTransform } from '../model/transform.js';
import { cloneObjectsWithNewIds } from '../clipboard/clipboard-fragment.js';

export interface DuplicateTransformOptions {
  readonly dx?: number;
  readonly dy?: number;
  readonly rotationDeg?: number;
}

/** Duplicate objects and apply a delta transform to each copy (transform-again). */
export class DuplicateTransformCommand implements Command {
  readonly type = 'DuplicateTransform';
  readonly description: string;
  private createdIds: ObjectId[] = [];

  constructor(
    private readonly sourceIds: readonly ObjectId[],
    private readonly options: DuplicateTransformOptions = { dx: 20, dy: 20 },
  ) {
    const { rotationDeg = 0 } = this.options;
    this.description = rotationDeg !== 0 ? 'Duplicate and transform' : 'Duplicate';
  }

  execute(doc: DocumentModel): DocumentModel {
    const { dx = 0, dy = 0, rotationDeg = 0 } = this.options;
    if (![dx, dy, rotationDeg].every(Number.isFinite)) return doc;

    const newObjects = { ...doc.objects };
    const newLayers = { ...doc.layers };
    let changed = false;

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
        const transform: Transform2D = {
          ...clone.transform,
          position: { x: clone.transform.position.x + dx, y: clone.transform.position.y + dy },
          rotation: clone.transform.rotation + (rotationDeg * Math.PI) / 180,
        };
        if (!isValidTransform(transform)) continue;
        const modifiedClone: SceneObject = { ...clone, transform };
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

