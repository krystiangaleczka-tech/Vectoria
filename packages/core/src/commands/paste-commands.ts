import type { Command } from './command.js';
import type { DocumentModel, LayerId, ObjectId, SceneObject, Transform2D } from '../model/types.js';
import { isValidTransform } from '../model/transform.js';
import { isValidPathGeometry } from '../model/path.js';
import { cloneObjectsWithNewIds, type ClipboardFragment } from '../clipboard/clipboard-fragment.js';

export type PasteMode = 'offset' | 'in-place' | 'all-artboards';

/** Paste a clipboard fragment in one undoable step.
 *  offset:       +20/+20 world offset (legacy behaviour).
 *  in-place:     keep source world position.
 *  all-artboards: one copy per artboard at the source world position,
 *                 every copy on the target layer; single history entry. */
export class PasteObjectsCommand implements Command {
  readonly type = 'PasteObjects';
  readonly description: string;
  private createdIds: ObjectId[] = [];

  constructor(
    private readonly fragment: ClipboardFragment,
    private readonly targetLayerId: LayerId,
    private readonly mode: PasteMode,
    private readonly artboardIds: readonly string[],
  ) {
    this.description = mode === 'in-place' ? 'Paste in place'
      : mode === 'all-artboards' ? 'Paste on all artboards' : 'Paste';
  }

  execute(doc: DocumentModel): DocumentModel {
    const layer = doc.layers[this.targetLayerId];
    if (!layer || layer.locked) return doc;

    const newObjects = { ...doc.objects };
    const newLayers = { ...doc.layers };
    const objectIds = [...layer.objectIds];
    const placements = this.mode === 'all-artboards' ? this.artboardIds : [null];

    for (let i = 0; i < placements.length; i++) {
      for (const source of this.fragment.objects) {
        if (source.locked) continue;
        const clone = cloneObjectsWithNewIds([source])[0]!;
        const transform: Transform2D = this.mode === 'offset'
          ? { ...clone.transform, position: { x: clone.transform.position.x + 20, y: clone.transform.position.y + 20 } }
          : clone.transform; // in-place i all-artboards: world position bez zmian
        if (!isValidTransform(transform)) continue;
        const placed: SceneObject = {
          ...clone, layerId: this.targetLayerId, transform,
          type: clone.type === 'path' && !isValidPathGeometry(clone.nodes, clone.closed) ? clone.type : clone.type,
        } as SceneObject;
        if (newObjects[placed.id]) continue;
        newObjects[placed.id] = placed;
        objectIds.push(placed.id);
        this.createdIds.push(placed.id);
      }
    }

    if (this.createdIds.length === 0) return doc;
    newLayers[this.targetLayerId] = { ...layer, objectIds };
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
