import { generateId, normalizeColor, type Vec2 } from '@vectoria/shared';
import type { Command } from './command.js';
import type {
  DocumentModel,
  SceneObject,
  ObjectId,
  LayerId,
  ObjectStyle,
  Transform2D,
  PathNode,
  ArtboardId,
  Artboard,
  DocumentUnit,
  Guide,
  GridSettings,
  SnapSettings,
  CornerRadii,
  StrokeStyle,
  ArrowheadStyle,
  GroupObject,
} from '../model/types.js';
import { isValidTransform } from '../model/transform.js';
import { getObjectBounds } from '../model/bounds.js';
import { normalizeCornerRadii } from '../model/shapes.js';
import { applyAutoSmooth, applyNodeKind, createPathNode, getCubicSegment, isValidPathGeometry, reversePathNodes, splitCubic } from '../model/path.js';

// ─── CreateObjectsCommand ─────────────────────────────────────────────────────

export class CreateObjectsCommand implements Command {
  readonly type = 'CreateObjects';
  readonly description: string;

  constructor(
    private readonly objects: readonly SceneObject[],
    private readonly targetLayerId: LayerId,
  ) {
    const count = objects.length;
    this.description = count === 1
      ? `Create ${objects[0]!.type}`
      : `Create ${count} objects`;
  }

  execute(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };
    const newLayers = { ...doc.layers };
    const layer = newLayers[this.targetLayerId];
    if (!layer || layer.locked) return doc;

    const newObjectIds = [...layer.objectIds];

    for (const obj of this.objects) {
      if (obj.layerId !== this.targetLayerId || newObjects[obj.id] || newObjectIds.includes(obj.id)) return doc;
      if (!isValidTransform(obj.transform)) return doc;
      if (obj.type === 'path' && !isValidPathGeometry(obj.nodes, obj.closed)) return doc;
      newObjects[obj.id] = obj;
      newObjectIds.push(obj.id);
    }

    newLayers[this.targetLayerId] = {
      ...layer,
      objectIds: newObjectIds,
    };

    return {
      ...doc,
      objects: newObjects,
      layers: newLayers,
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };
    const newLayers = { ...doc.layers };
    const layer = newLayers[this.targetLayerId];
    if (!layer) return doc;

    const idsToRemove = new Set(this.objects.map((o) => o.id));

    for (const obj of this.objects) {
      delete newObjects[obj.id];
    }

    newLayers[this.targetLayerId] = {
      ...layer,
      objectIds: layer.objectIds.filter((id) => !idsToRemove.has(id)),
    };

    return {
      ...doc,
      objects: newObjects,
      layers: newLayers,
      updatedAt: new Date().toISOString(),
    };
  }
}

// ─── DeleteObjectsCommand ─────────────────────────────────────────────────────

interface DeletedObjectInfo {
  object: SceneObject;
  layerId: LayerId;
  indexInLayer: number;
}

export class DeleteObjectsCommand implements Command {
  readonly type = 'DeleteObjects';
  readonly description: string;
  private deletedInfos: DeletedObjectInfo[] = [];

  constructor(
    private readonly objectIds: readonly ObjectId[],
  ) {
    this.description = objectIds.length === 1
      ? 'Delete object'
      : `Delete ${objectIds.length} objects`;
  }

  execute(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };
    const newLayers = { ...doc.layers };
    this.deletedInfos = [];

    for (const objectId of this.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj) continue;

      const layer = doc.layers[obj.layerId];
      if (!layer) continue;

      const indexInLayer = layer.objectIds.indexOf(objectId);

      this.deletedInfos.push({
        object: obj,
        layerId: obj.layerId,
        indexInLayer,
      });

      delete newObjects[objectId];

      newLayers[obj.layerId] = {
        ...newLayers[obj.layerId]!,
        objectIds: newLayers[obj.layerId]!.objectIds.filter((id) => id !== objectId),
      };
    }

    if (this.deletedInfos.length === 0) return doc;

    return {
      ...doc,
      objects: newObjects,
      layers: newLayers,
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };
    const newLayers = { ...doc.layers };

    // Restore in reverse order to preserve z-order indices
    for (let i = this.deletedInfos.length - 1; i >= 0; i--) {
      const info = this.deletedInfos[i]!;
      newObjects[info.object.id] = info.object;

      const layer = newLayers[info.layerId];
      if (!layer) continue;

      const newObjectIds = [...layer.objectIds];
      // Insert at original index
      newObjectIds.splice(info.indexInLayer, 0, info.object.id);

      newLayers[info.layerId] = {
        ...layer,
        objectIds: newObjectIds,
      };
    }

    return {
      ...doc,
      objects: newObjects,
      layers: newLayers,
      updatedAt: new Date().toISOString(),
    };
  }
}

// ─── TransformObjectsCommand ──────────────────────────────────────────────────

export class TransformObjectsCommand implements Command {
  readonly type = 'TransformObjects';
  readonly description = 'Move';
  private previousTransforms: Map<ObjectId, Transform2D> = new Map();

  constructor(
    public readonly objectIds: readonly ObjectId[],
    public readonly newTransforms: ReadonlyMap<ObjectId, Transform2D>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };
    let changed = false;

    for (const objectId of this.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj || obj.locked) continue;

      this.previousTransforms.set(objectId, obj.transform);

      const newTransform = this.newTransforms.get(objectId);
      if (!newTransform || !isValidTransform(newTransform)) continue;

      newObjects[objectId] = { ...obj, transform: newTransform };
      changed = true;
    }

    if (!changed) return doc;

    return {
      ...doc,
      objects: newObjects,
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };

    for (const objectId of this.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj) continue;

      const prev = this.previousTransforms.get(objectId);
      if (!prev) continue;

      newObjects[objectId] = { ...obj, transform: prev };
    }

    return {
      ...doc,
      objects: newObjects,
      updatedAt: new Date().toISOString(),
    };
  }
}

/** Update one object's transform through the same command contract as a drag. */
export class UpdateObjectTransformCommand extends TransformObjectsCommand {
  constructor(objectId: ObjectId, transform: Transform2D) {
    super([objectId], new Map([[objectId, transform]]));
  }
}

export type ReorderDirection = 'front' | 'back' | 'forward' | 'backward';

/** Apply bounded skew around the existing transform pivot. */
export class SkewObjectsCommand extends TransformObjectsCommand {
  constructor(objectIds: readonly ObjectId[], axis: 'horizontal' | 'vertical', angle: number, doc: DocumentModel) {
    const transforms = new Map<ObjectId, Transform2D>();
    for (const id of objectIds) {
      const object = doc.objects[id];
      if (!object || !Number.isFinite(angle) || Math.abs(angle) >= Math.PI / 2) continue;
      const skew = object.transform.skew ?? { x: 0, y: 0 };
      transforms.set(id, { ...object.transform, skew: { ...skew, [axis === 'horizontal' ? 'x' : 'y']: angle } });
    }
    super(objectIds, transforms);
  }
}

/** Group selected objects into one layer-owned hierarchy entry. */
export class GroupObjectsCommand implements Command {
  readonly type = 'GroupObjects';
  readonly description = 'Group objects';
  private group: GroupObject | null = null;
  private layerId: LayerId | null = null;
  private originalIds: readonly ObjectId[] = [];

  constructor(private readonly objectIds: readonly ObjectId[]) {}

  execute(doc: DocumentModel): DocumentModel {
    const ids = [...new Set(this.objectIds)];
    if (ids.length < 2) return doc;
    const objects = ids.map((id) => doc.objects[id]);
    const layerId = objects[0]?.layerId;
    if (!layerId || objects.some((object) => !object || object.layerId !== layerId || object.locked)) return doc;
    const layer = doc.layers[layerId];
    if (!layer || layer.locked || ids.some((id) => !layer.objectIds.includes(id))) return doc;
    const groupId = this.group?.id ?? generateId();
    const group: GroupObject = this.group ?? {
      type: 'group', id: groupId, name: 'Group', layerId, visible: true, locked: false,
      transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } },
      style: { fill: { type: 'none' }, stroke: null, opacity: 1, blendMode: 'normal' }, childIds: ids,
    };
    this.group = group;
    this.layerId = layerId;
    this.originalIds = layer.objectIds;
    const firstIndex = Math.min(...ids.map((id) => layer.objectIds.indexOf(id)));
    const nextIds = layer.objectIds.filter((id) => !ids.includes(id));
    nextIds.splice(firstIndex, 0, group.id);
    return { ...doc, objects: { ...doc.objects, [group.id]: group }, layers: { ...doc.layers, [layerId]: { ...layer, objectIds: nextIds } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.group || !this.layerId) return doc;
    const layer = doc.layers[this.layerId];
    if (!layer) return doc;
    const objects = { ...doc.objects };
    delete objects[this.group.id];
    return { ...doc, objects, layers: { ...doc.layers, [this.layerId]: { ...layer, objectIds: this.originalIds } }, updatedAt: new Date().toISOString() };
  }
}

/** Remove selected groups while restoring their children at the original z-order. */
export class UngroupObjectsCommand implements Command {
  readonly type = 'UngroupObjects';
  readonly description = 'Ungroup objects';
  private previous: { group: GroupObject; layerId: LayerId; objectIds: readonly ObjectId[] }[] = [];

  constructor(private readonly groupIds: readonly ObjectId[]) {}

  execute(doc: DocumentModel): DocumentModel {
    const objects = { ...doc.objects };
    const layers = { ...doc.layers };
    this.previous = [];
    for (const groupId of this.groupIds) {
      const group = doc.objects[groupId];
      const layer = group?.type === 'group' ? doc.layers[group.layerId] : undefined;
      if (!group || group.type !== 'group' || !layer || layer.locked || !layer.objectIds.includes(groupId)) continue;
      this.previous.push({ group, layerId: layer.id, objectIds: layer.objectIds });
      delete objects[groupId];
      layers[layer.id] = { ...layer, objectIds: layer.objectIds.flatMap((id) => id === groupId ? group.childIds : [id]) };
    }
    return this.previous.length === 0 ? doc : { ...doc, objects, layers, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (this.previous.length === 0) return doc;
    const objects = { ...doc.objects };
    const layers = { ...doc.layers };
    for (const item of this.previous) {
      const layer = layers[item.layerId];
      if (!layer) continue;
      objects[item.group.id] = item.group;
      layers[item.layerId] = { ...layer, objectIds: item.objectIds };
    }
    return { ...doc, objects, layers, updatedAt: new Date().toISOString() };
  }
}

/** Replace active document atomically so version restore remains undoable. */
export class ReplaceDocumentCommand implements Command {
  readonly type = 'ReplaceDocument';
  readonly description = 'Restore document version';
  private previous: DocumentModel | null = null;

  constructor(private readonly replacement: DocumentModel) {}

  execute(doc: DocumentModel): DocumentModel {
    this.previous = doc;
    return this.replacement;
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ?? doc;
  }
}

/** Reorder selected objects inside their layers without changing ownership. */
export class ReorderObjectsCommand implements Command {
  readonly type = 'ReorderObjects';
  readonly description: string;
  private previous: Readonly<Record<LayerId, readonly ObjectId[]>> | null = null;

  constructor(private readonly objectIds: readonly ObjectId[], private readonly direction: ReorderDirection) {
    this.description = direction === 'front' ? 'Bring to front' : direction === 'back' ? 'Send to back' : direction === 'forward' ? 'Bring forward' : 'Send backward';
  }

  execute(doc: DocumentModel): DocumentModel {
    const selected = new Set(this.objectIds);
    const nextLayers = { ...doc.layers };
    const previous: Record<LayerId, readonly ObjectId[]> = {};
    let changed = false;
    for (const layerId of doc.layerIds) {
      const layer = doc.layers[layerId];
      if (!layer) continue;
      const ids = layer.objectIds.filter((id) => selected.has(id));
      if (ids.length === 0) continue;
      previous[layerId] = layer.objectIds;
      let next = [...layer.objectIds];
      if (this.direction === 'front' || this.direction === 'back') {
        const rest = next.filter((id) => !selected.has(id));
        next = this.direction === 'front' ? [...rest, ...ids] : [...ids, ...rest];
      } else {
        const step = this.direction === 'forward' ? 1 : -1;
        const order = this.direction === 'forward' ? [...next].reverse() : [...next];
        for (const id of order) {
          if (!selected.has(id)) continue;
          const index = next.indexOf(id);
          const target = Math.max(0, Math.min(next.length - 1, index + step));
          if (target === index || selected.has(next[target]!)) continue;
          [next[index], next[target]] = [next[target]!, next[index]!];
        }
      }
      if (next.some((id, index) => id !== layer.objectIds[index])) changed = true;
      nextLayers[layerId] = { ...layer, objectIds: next };
    }
    if (!changed) return doc;
    this.previous = previous;
    return { ...doc, layers: nextLayers, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previous) return doc;
    const layers = { ...doc.layers };
    for (const [layerId, objectIds] of Object.entries(this.previous)) {
      const layer = layers[layerId];
      if (layer) layers[layerId] = { ...layer, objectIds };
    }
    return { ...doc, layers, updatedAt: new Date().toISOString() };
  }
}

/** Duplicate objects with fresh IDs and a deterministic world-space offset. */
export class DuplicateObjectsCommand implements Command {
  readonly type = 'DuplicateObjects';
  readonly description = 'Duplicate objects';
  private createdIds: ObjectId[] = [];

  constructor(private readonly objectIds: readonly ObjectId[], private readonly offset: Vec2 = { x: 20, y: 20 }) {}

  execute(doc: DocumentModel): DocumentModel {
    const objects = { ...doc.objects };
    const layers = { ...doc.layers };
    this.createdIds = [];
    for (const sourceId of this.objectIds) {
      const source = doc.objects[sourceId];
      const layer = source ? layers[source.layerId] : undefined;
      if (!source || source.locked || !layer || layer.locked) continue;
      const id = generateId();
      this.createdIds.push(id);
      const cloned = structuredClone(source);
      const duplicated = cloned.type === 'path'
        ? { ...cloned, nodes: cloned.nodes.map((node) => ({ ...node, id: generateId() })) }
        : cloned;
      objects[id] = { ...duplicated, id, name: `${source.name} copy`, transform: { ...source.transform, position: { x: source.transform.position.x + this.offset.x, y: source.transform.position.y + this.offset.y } } };
      layers[source.layerId] = { ...layer, objectIds: [...layers[source.layerId]!.objectIds, id] };
    }
    if (this.createdIds.length === 0) return doc;
    return { ...doc, objects, layers, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (this.createdIds.length === 0) return doc;
    const created = new Set(this.createdIds);
    const objects = { ...doc.objects };
    for (const id of this.createdIds) delete objects[id];
    const layers = Object.fromEntries(Object.entries(doc.layers).map(([id, layer]) => [id, { ...layer, objectIds: layer.objectIds.filter((objectId) => !created.has(objectId)) }])) as DocumentModel['layers'];
    return { ...doc, objects, layers, updatedAt: new Date().toISOString() };
  }
}

export type Alignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

/** Align objects to selection bounds or the active artboard. */
export class AlignObjectsCommand implements Command {
  readonly type = 'AlignObjects';
  readonly description = 'Align objects';
  private previous = new Map<ObjectId, Transform2D>();

  constructor(private readonly objectIds: readonly ObjectId[], private readonly alignment: Alignment, private readonly target: 'selection' | 'artboard' | 'key' = 'selection', private readonly keyObjectId?: ObjectId) {}

  execute(doc: DocumentModel): DocumentModel {
    const objects = { ...doc.objects };
    const selected = this.objectIds.map((id) => doc.objects[id]).filter((object): object is SceneObject => Boolean(object));
    if (selected.length === 0) return doc;
    const bounds = selected.map((object) => getObjectBounds(object, doc));
    const artboard = doc.artboards[doc.activeArtboardId];
    const keyObject = this.target === 'key' ? doc.objects[this.keyObjectId ?? ''] : undefined;
    const target = this.target === 'artboard' && artboard ? { x: artboard.x, y: artboard.y, width: artboard.width, height: artboard.height } : keyObject ? getObjectBounds(keyObject, doc) : {
      x: Math.min(...bounds.map((bound) => bound.x)), y: Math.min(...bounds.map((bound) => bound.y)),
      width: Math.max(...bounds.map((bound) => bound.x + bound.width)) - Math.min(...bounds.map((bound) => bound.x)),
      height: Math.max(...bounds.map((bound) => bound.y + bound.height)) - Math.min(...bounds.map((bound) => bound.y)),
    };
    let changed = false;
    selected.forEach((object, index) => {
      if (object.locked) return;
      const bound = bounds[index]!;
      const nextX = this.alignment === 'left' ? target.x : this.alignment === 'right' ? target.x + target.width - bound.width : this.alignment === 'center' ? target.x + (target.width - bound.width) / 2 : bound.x;
      const nextY = this.alignment === 'top' ? target.y : this.alignment === 'bottom' ? target.y + target.height - bound.height : this.alignment === 'middle' ? target.y + (target.height - bound.height) / 2 : bound.y;
      const transform = { ...object.transform, position: { x: object.transform.position.x + nextX - bound.x, y: object.transform.position.y + nextY - bound.y } };
      if (!isValidTransform(transform)) return;
      this.previous.set(object.id, object.transform);
      objects[object.id] = { ...object, transform };
      changed = changed || transform.position.x !== object.transform.position.x || transform.position.y !== object.transform.position.y;
    });
    return changed ? { ...doc, objects, updatedAt: new Date().toISOString() } : doc;
  }

  undo(doc: DocumentModel): DocumentModel {
    if (this.previous.size === 0) return doc;
    const objects = { ...doc.objects };
    for (const [id, transform] of this.previous) if (objects[id]) objects[id] = { ...objects[id]!, transform };
    return { ...doc, objects, updatedAt: new Date().toISOString() };
  }
}

/** Apply equal spacing between three or more selected object bounds. */
export class DistributeObjectsCommand implements Command {
  readonly type = 'DistributeObjects';
  readonly description = 'Distribute objects';
  private previous = new Map<ObjectId, Transform2D>();

  constructor(private readonly objectIds: readonly ObjectId[], private readonly axis: 'horizontal' | 'vertical') {}

  execute(doc: DocumentModel): DocumentModel {
    const selected = this.objectIds.map((id) => doc.objects[id]).filter((object): object is SceneObject => Boolean(object)).filter((object) => !object.locked).map((object) => ({ object, bounds: getObjectBounds(object) })).sort((a, b) => this.axis === 'horizontal' ? a.bounds.x - b.bounds.x : a.bounds.y - b.bounds.y);
    if (selected.length < 3) return doc;
    const first = selected[0]!.bounds;
    const last = selected[selected.length - 1]!.bounds;
    const total = this.axis === 'horizontal' ? last.x + last.width - first.x : last.y + last.height - first.y;
    const occupied = selected.reduce((sum, item) => sum + (this.axis === 'horizontal' ? item.bounds.width : item.bounds.height), 0);
    const gap = (total - occupied) / (selected.length - 1);
    const objects = { ...doc.objects };
    let cursor = this.axis === 'horizontal' ? first.x : first.y;
    for (const item of selected) {
      const coordinate = this.axis === 'horizontal' ? item.bounds.x : item.bounds.y;
      const delta = cursor - coordinate;
      if (delta !== 0) {
        this.previous.set(item.object.id, item.object.transform);
        objects[item.object.id] = { ...item.object, transform: { ...item.object.transform, position: { x: item.object.transform.position.x + (this.axis === 'horizontal' ? delta : 0), y: item.object.transform.position.y + (this.axis === 'vertical' ? delta : 0) } } };
      }
      cursor += (this.axis === 'horizontal' ? item.bounds.width : item.bounds.height) + gap;
    }
    return this.previous.size > 0 ? { ...doc, objects, updatedAt: new Date().toISOString() } : doc;
  }

  undo(doc: DocumentModel): DocumentModel {
    const objects = { ...doc.objects };
    for (const [id, transform] of this.previous) if (objects[id]) objects[id] = { ...objects[id]!, transform };
    return this.previous.size > 0 ? { ...doc, objects, updatedAt: new Date().toISOString() } : doc;
  }
}

/** Flip selected objects around their current local center. */
export class FlipObjectsCommand extends TransformObjectsCommand {
  constructor(objectIds: readonly ObjectId[], axis: 'horizontal' | 'vertical', doc: DocumentModel) {
    super(objectIds, new Map(objectIds.map((id) => {
      const object = doc.objects[id];
      if (!object) return [id, undefined] as const;
      const bounds = getObjectBounds(object);
      return [id, { ...object.transform, scale: { x: axis === 'horizontal' ? -object.transform.scale.x : object.transform.scale.x, y: axis === 'vertical' ? -object.transform.scale.y : object.transform.scale.y }, position: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }, pivot: { x: bounds.width / 2, y: bounds.height / 2 } }] as const;
    }).filter((entry): entry is [ObjectId, Transform2D] => Boolean(entry[1]))));
  }
}

/** Apply last transform delta to current objects. */
export class RepeatTransformCommand extends TransformObjectsCommand {
  constructor(objectIds: readonly ObjectId[], delta: Readonly<Partial<Transform2D>>, doc: DocumentModel) {
    super(objectIds, new Map(objectIds.map((id) => {
      const object = doc.objects[id];
      if (!object) return [id, undefined] as const;
      return [id, { ...object.transform, position: { x: object.transform.position.x + (delta.position?.x ?? 0), y: object.transform.position.y + (delta.position?.y ?? 0) }, rotation: object.transform.rotation + (delta.rotation ?? 0), scale: { x: object.transform.scale.x * (delta.scale?.x ?? 1), y: object.transform.scale.y * (delta.scale?.y ?? 1) } }] as const;
    }).filter((entry): entry is [ObjectId, Transform2D] => Boolean(entry[1]))));
  }
}

// ─── SetObjectStyleCommand ────────────────────────────────────────────────────

export class SetObjectStyleCommand implements Command {
  readonly type = 'SetObjectStyle';
  readonly description: string;
  private previousStyles: Map<ObjectId, ObjectStyle> = new Map();

  constructor(
    private readonly objectIds: readonly ObjectId[],
    private readonly stylePatch: Partial<ObjectStyle>,
  ) {
    if (stylePatch.fill !== undefined) {
      this.description = 'Change fill';
    } else if (stylePatch.stroke !== undefined) {
      this.description = 'Change stroke';
    } else if (stylePatch.opacity !== undefined) {
      this.description = 'Change opacity';
    } else if (stylePatch.blendMode !== undefined) {
      this.description = 'Change blend mode';
    } else {
      this.description = 'Change style';
    }
  }

  execute(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };
    let changed = false;
    this.previousStyles.clear();

    for (const objectId of this.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj || obj.locked) continue;

      const fill = this.stylePatch.fill;
      const stroke = this.stylePatch.stroke;
      const normalizedFill = fill === undefined ? undefined : normalizeFill(fill);
      const normalizedStroke = stroke ? normalizeColor(stroke.color) : null;
      if (normalizedFill === null) continue;
      if (stroke && normalizedStroke === null) continue;
      if (this.stylePatch.opacity !== undefined && (!Number.isFinite(this.stylePatch.opacity) || this.stylePatch.opacity < 0 || this.stylePatch.opacity > 1)) continue;

      const nextStyle: ObjectStyle = {
        ...obj.style,
        ...this.stylePatch,
        ...(normalizedFill !== undefined ? { fill: normalizedFill } : {}),
        ...(stroke && normalizedStroke ? { stroke: { ...stroke, color: normalizedStroke } } : {}),
      };
      if (JSON.stringify(nextStyle) === JSON.stringify(obj.style)) continue;
      this.previousStyles.set(objectId, obj.style);
      newObjects[objectId] = {
        ...obj,
        style: nextStyle,
      };
      changed = true;
    }

    if (!changed) return doc;

    return {
      ...doc,
      objects: newObjects,
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };

    for (const objectId of this.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj) continue;

      const prev = this.previousStyles.get(objectId);
      if (!prev) continue;

      newObjects[objectId] = { ...obj, style: prev };
    }

    return {
      ...doc,
      objects: newObjects,
      updatedAt: new Date().toISOString(),
    };
  }
}

function normalizeFill(fill: ObjectStyle['fill']): ObjectStyle['fill'] | null {
  if (fill.type === 'none') return fill;
  if (fill.type === 'solid') {
    const color = normalizeColor(fill.color);
    return color ? { ...fill, color } : null;
  }
  if (fill.type === 'pattern') {
    const foreground = normalizeColor(fill.foreground);
    const background = normalizeColor(fill.background);
    return foreground && background && Number.isFinite(fill.size) && fill.size > 0 ? { ...fill, foreground, background } : null;
  }
  const stops = fill.stops.map((stop) => {
    const color = normalizeColor(stop.color);
    return color && Number.isFinite(stop.offset) && stop.offset >= 0 && stop.offset <= 1 && Number.isFinite(stop.opacity) && stop.opacity >= 0 && stop.opacity <= 1 ? { ...stop, color } : null;
  });
  if (stops.some((stop) => stop === null) || stops.length < 2) return null;
  if (fill.type === 'linear-gradient' && fill.start.x === fill.end.x && fill.start.y === fill.end.y) return null;
  if (fill.type === 'radial-gradient' && (!Number.isFinite(fill.radius) || fill.radius <= 0)) return null;
  return { ...fill, stops: stops as typeof fill.stops };
}


// ─── SetRectangleGeometryCommand ─────────────────────────────────────────────

export class SetRectangleGeometryCommand implements Command {
  readonly type = 'SetRectangleGeometry';
  readonly description: string;
  private previous: { width: number; height: number; cornerRadius: number | CornerRadii } | null = null;

  constructor(
    private readonly objectId: ObjectId,
    private readonly patch: Readonly<{
      width?: number;
      height?: number;
      cornerRadius?: number | Partial<CornerRadii>;
    }>,
  ) {
    this.description =
      patch.cornerRadius !== undefined && patch.width === undefined && patch.height === undefined
        ? 'Change corner radius'
        : 'Resize';
  }

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'rectangle' || obj.locked) return doc;

    const width = this.patch.width ?? obj.width;
    const height = this.patch.height ?? obj.height;
    const nextRadius = this.patch.cornerRadius ?? obj.cornerRadius;
    const normalizedRadii = normalizeCornerRadii(nextRadius, width, height);
    const cornerRadius = typeof nextRadius === 'number' && typeof obj.cornerRadius === 'number'
      ? normalizedRadii.topLeft
      : normalizedRadii;

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return doc;
    }

    this.previous = { width: obj.width, height: obj.height, cornerRadius: obj.cornerRadius };

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, width, height, cornerRadius },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previous) return doc;
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'rectangle') return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, ...this.previous },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

// ─── SetEllipseGeometryCommand ───────────────────────────────────────────────

export class SetEllipseGeometryCommand implements Command {
  readonly type = 'SetEllipseGeometry';
  readonly description = 'Resize';
  private previous: { width: number; height: number } | null = null;

  constructor(
    private readonly objectId: ObjectId,
    private readonly patch: Readonly<{
      width?: number;
      height?: number;
    }>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'ellipse' || obj.locked) return doc;

    const width = this.patch.width ?? obj.width;
    const height = this.patch.height ?? obj.height;

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return doc;
    }

    this.previous = { width: obj.width, height: obj.height };

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, width, height },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previous) return doc;
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'ellipse') return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, ...this.previous },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

// ─── SetLineGeometryCommand ──────────────────────────────────────────────────

export class SetLineGeometryCommand implements Command {
  readonly type = 'SetLineGeometry';
  readonly description = 'Change line endpoint';
  private previous: { endPoint: Vec2 } | null = null;

  constructor(
    private readonly objectId: ObjectId,
    private readonly patch: Readonly<{
      endPoint?: Vec2;
    }>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'line' || obj.locked) return doc;

    const endPoint = this.patch.endPoint ?? obj.endPoint;

    if (!Number.isFinite(endPoint.x) || !Number.isFinite(endPoint.y)) {
      return doc;
    }

    this.previous = { endPoint: obj.endPoint };

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, endPoint },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previous) return doc;
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'line') return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, ...this.previous },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

// ─── SetPathGeometryCommand ──────────────────────────────────────────────────

export class SetPathGeometryCommand implements Command {
  readonly type = 'SetPathGeometry';
  readonly description = 'Edit path';
  private previous: { nodes: readonly PathNode[]; closed: boolean } | null = null;

  constructor(
    private readonly objectId: ObjectId,
    private readonly patch: Readonly<{
      nodes?: readonly PathNode[];
      closed?: boolean;
    }>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'path' || obj.locked) return doc;

    const nodes = this.patch.nodes ?? obj.nodes;
    const closed = this.patch.closed ?? obj.closed;

    if (!isValidPathGeometry(nodes, closed)) return doc;

    this.previous = { nodes: obj.nodes, closed: obj.closed };

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, nodes, closed },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previous) return doc;
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'path') return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, ...this.previous },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

export class UpdatePathNodeCommand implements Command {
  readonly type = 'UpdatePathNode';
  readonly description = 'Edit path node';
  private previous: PathNode | null = null;

  constructor(private readonly objectId: ObjectId, private readonly nodeIndex: number, private readonly patch: Partial<Omit<PathNode, 'id'>>) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    const node = object?.type === 'path' ? object.nodes[this.nodeIndex] : undefined;
    if (!object || object.type !== 'path' || object.locked || !node) return doc;
    const nextNode = { ...node, ...this.patch };
    const nodes = object.nodes.map((item, index) => index === this.nodeIndex ? nextNode : item);
    if (!isValidPathGeometry(nodes, object.closed)) return doc;
    this.previous = node;
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (!this.previous || object?.type !== 'path') return doc;
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: object.nodes.map((node, index) => index === this.nodeIndex ? this.previous! : node) } }, updatedAt: new Date().toISOString() };
  }
}

export class SetPathNodeKindCommand extends UpdatePathNodeCommand {
  constructor(objectId: ObjectId, nodeIndex: number, kind: PathNode['kind'], doc: DocumentModel) {
    const object = doc.objects[objectId];
    if (!object || object.type !== 'path') { super(objectId, nodeIndex, { kind }); return; }
    const node = object.nodes[nodeIndex];
    if (!node) { super(objectId, nodeIndex, { kind }); return; }
    // 'auto' derives handles from neighbouring geometry, so it needs context
    // the plain applyNodeKind contract cannot see.
    const nextNode = kind === 'auto'
      ? applyAutoSmooth(node, object.nodes[nodeIndex - 1] ?? (object.closed ? object.nodes.at(-1) ?? null : null), object.nodes[nodeIndex + 1] ?? (object.closed ? object.nodes[0] ?? null : null))
      : applyNodeKind(node, kind);
    super(objectId, nodeIndex, nextNode);
  }
}

export class AddPathNodeCommand implements Command {
  readonly type = 'AddPathNode';
  readonly description = 'Add path node';
  private previous: readonly PathNode[] | null = null;
  private inserted: PathNode | null = null;

  constructor(private readonly objectId: ObjectId, private readonly segmentIndex: number, private readonly t = 0.5) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (object?.type !== 'path' || object.locked || !Number.isFinite(this.t) || this.t <= 0 || this.t >= 1) return doc;
    const segment = getCubicSegment(object.nodes, this.segmentIndex, object.closed);
    if (!segment) return doc;
    const split = splitCubic(segment, this.t);
    const nextIndex = this.segmentIndex + 1 < object.nodes.length ? this.segmentIndex + 1 : 0;
    const inserted = this.inserted ?? createPathNode(split.left.end, { inHandle: split.left.control2, outHandle: split.right.control1, kind: 'smooth' });
    this.inserted = inserted;
    let nodes = [...object.nodes];
    const previousIndex = this.segmentIndex;
    nodes = nodes.map((node, index) => index === previousIndex ? { ...node, outHandle: split.left.control1 } : index === nextIndex ? { ...node, inHandle: split.right.control2 } : node);
    if (nextIndex === 0 && object.closed) nodes = [...nodes, inserted];
    else nodes.splice(nextIndex, 0, inserted);
    if (!isValidPathGeometry(nodes, object.closed)) return doc;
    this.previous = object.nodes;
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    return this.previous && object?.type === 'path' ? { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}

export class RemovePathNodeCommand implements Command {
  readonly type = 'RemovePathNode';
  readonly description = 'Remove path node';
  private previous: readonly PathNode[] | null = null;

  constructor(private readonly objectId: ObjectId, private readonly nodeIndex: number) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (object?.type !== 'path' || object.locked || !object.nodes[this.nodeIndex]) return doc;
    const nodes = object.nodes.filter((_, index) => index !== this.nodeIndex);
    if (!isValidPathGeometry(nodes, object.closed)) return doc;
    this.previous = object.nodes;
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    return this.previous && object?.type === 'path' ? { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}

export class ReversePathCommand implements Command {
  readonly type = 'ReversePath';
  readonly description = 'Reverse path direction';
  private previous: readonly PathNode[] | null = null;

  constructor(private readonly objectId: ObjectId) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (object?.type !== 'path' || object.locked) return doc;
    this.previous = object.nodes;
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: reversePathNodes(object.nodes) } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    return this.previous && object?.type === 'path' ? { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}

export class ConvertPathSegmentCommand implements Command {
  readonly type = 'ConvertPathSegment';
  readonly description = 'Convert path segment';
  private previous: readonly PathNode[] | null = null;

  constructor(private readonly objectId: ObjectId, private readonly segmentIndex: number, private readonly to: 'line' | 'curve') {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    const segment = object?.type === 'path' ? getCubicSegment(object.nodes, this.segmentIndex, object.closed) : null;
    if (object?.type !== 'path' || object.locked || !segment) return doc;
    const endIndex = this.segmentIndex + 1 < object.nodes.length ? this.segmentIndex + 1 : 0;
    const nodes = object.nodes.map((node, index) => {
      if (this.to === 'line') {
        return index === this.segmentIndex || index === endIndex ? { ...node, inHandle: index === endIndex ? null : node.inHandle, outHandle: index === this.segmentIndex ? null : node.outHandle } : node;
      }
      const first = { x: segment.start.x + (segment.end.x - segment.start.x) / 3, y: segment.start.y + (segment.end.y - segment.start.y) / 3 };
      const second = { x: segment.start.x + 2 * (segment.end.x - segment.start.x) / 3, y: segment.start.y + 2 * (segment.end.y - segment.start.y) / 3 };
      return index === this.segmentIndex ? { ...node, outHandle: node.outHandle ?? first } : index === endIndex ? { ...node, inHandle: node.inHandle ?? second } : node;
    });
    if (!isValidPathGeometry(nodes, object.closed)) return doc;
    this.previous = object.nodes;
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    return this.previous && object?.type === 'path' ? { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}

export class MergePathNodesCommand implements Command {
  readonly type = 'MergePathNodes';
  readonly description = 'Merge path nodes';
  private previous: readonly PathNode[] | null = null;

  constructor(private readonly objectId: ObjectId, private readonly firstIndex: number, private readonly secondIndex: number) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (object?.type !== 'path' || object.locked || this.firstIndex === this.secondIndex) return doc;
    const first = object.nodes[this.firstIndex];
    const second = object.nodes[this.secondIndex];
    if (!first || !second) return doc;
    const merged = createPathNode({ x: (first.point.x + second.point.x) / 2, y: (first.point.y + second.point.y) / 2 }, {
      id: first.id, kind: first.kind, inHandle: first.inHandle ?? second.inHandle, outHandle: first.outHandle ?? second.outHandle,
    });
    const nodes = object.nodes.map((node, index) => index === this.firstIndex ? merged : node).filter((_, index) => index !== this.secondIndex);
    if (!isValidPathGeometry(nodes, object.closed)) return doc;
    this.previous = object.nodes;
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    return this.previous && object?.type === 'path' ? { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}

export class SplitPathCommand implements Command {
  readonly type = 'SplitPath';
  readonly description = 'Split path';
  private created: SceneObject | null = null;
  private previous: SceneObject | null = null;
  private layerIndex = -1;

  constructor(private readonly objectId: ObjectId, private readonly nodeIndex: number) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    const layer = object ? doc.layers[object.layerId] : undefined;
    if (object?.type !== 'path' || object.closed || !layer || this.nodeIndex < 1 || this.nodeIndex >= object.nodes.length - 1) return doc;
    const firstNodes = object.nodes.slice(0, this.nodeIndex + 1);
    const secondNodes = object.nodes.slice(this.nodeIndex);
    if (!isValidPathGeometry(firstNodes, false) || !isValidPathGeometry(secondNodes, false)) return doc;
    const created = { ...object, id: generateId(), name: `${object.name} split`, nodes: secondNodes, closed: false };
    this.previous = object;
    this.created = created;
    this.layerIndex = layer.objectIds.indexOf(object.id);
    const ids = [...layer.objectIds];
    ids.splice(this.layerIndex + 1, 0, created.id);
    return { ...doc, objects: { ...doc.objects, [object.id]: { ...object, nodes: firstNodes }, [created.id]: created }, layers: { ...doc.layers, [layer.id]: { ...layer, objectIds: ids } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previous || !this.created) return doc;
    const layer = doc.layers[this.previous.layerId];
    if (!layer) return doc;
    const objects = { ...doc.objects, [this.previous.id]: this.previous };
    delete objects[this.created.id];
    return { ...doc, objects, layers: { ...doc.layers, [layer.id]: { ...layer, objectIds: layer.objectIds.filter((id) => id !== this.created!.id) } }, updatedAt: new Date().toISOString() };
  }
}

export class JoinOpenPathsCommand implements Command {
  readonly type = 'JoinOpenPaths';
  readonly description = 'Join open paths';
  private first: SceneObject | null = null;
  private second: SceneObject | null = null;
  private secondIndex = -1;

  constructor(private readonly firstId: ObjectId, private readonly secondId: ObjectId) {}

  execute(doc: DocumentModel): DocumentModel {
    const first = doc.objects[this.firstId];
    const second = doc.objects[this.secondId];
    const layer = first ? doc.layers[first.layerId] : undefined;
    if (first?.type !== 'path' || second?.type !== 'path' || first.closed || second.closed || first.layerId !== second.layerId || !layer || first.id === second.id) return doc;
    this.first = first;
    this.second = second;
    this.secondIndex = layer.objectIds.indexOf(second.id);
    const firstCandidates = [first.nodes, reversePathNodes(first.nodes)];
    const secondCandidates = [second.nodes, reversePathNodes(second.nodes)];
    let best: { first: readonly PathNode[]; second: readonly PathNode[]; distance: number } | null = null;
    for (const firstNodes of firstCandidates) {
      for (const secondNodes of secondCandidates) {
        const firstEnd = firstNodes.at(-1)!.point;
        const secondStart = secondNodes[0]!.point;
        const distance = Math.hypot(firstEnd.x - secondStart.x, firstEnd.y - secondStart.y);
        if (!best || distance < best.distance) best = { first: firstNodes, second: secondNodes, distance };
      }
    }
    if (!best) return doc;
    const sameEnd = best.distance <= 1e-6;
    const usedNodeIds = new Set(best.first.map((node) => node.id).filter((id): id is string => Boolean(id)));
    const secondNodes = best.second.map((node, index) => {
      if (sameEnd && index === 0) return node;
      if (!node.id || !usedNodeIds.has(node.id)) {
        if (node.id) usedNodeIds.add(node.id);
        return node;
      }
      const next = { ...node, id: generateId() };
      usedNodeIds.add(next.id!);
      return next;
    });
    const nodes = sameEnd ? [...best.first, ...secondNodes.slice(1)] : [...best.first, ...secondNodes];
    if (!isValidPathGeometry(nodes, false)) return doc;
    const objects = { ...doc.objects, [first.id]: { ...first, nodes } };
    delete objects[second.id];
    return { ...doc, objects, layers: { ...doc.layers, [layer.id]: { ...layer, objectIds: layer.objectIds.filter((id) => id !== second.id) } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const layer = this.first ? doc.layers[this.first.layerId] : undefined;
    if (!this.first || !this.second || !layer) return doc;
    const objectIds = [...layer.objectIds];
    if (!objectIds.includes(this.second.id)) objectIds.splice(Math.max(0, this.secondIndex), 0, this.second.id);
    return { ...doc, objects: { ...doc.objects, [this.first.id]: this.first, [this.second.id]: this.second }, layers: { ...doc.layers, [layer.id]: { ...layer, objectIds } }, updatedAt: new Date().toISOString() };
  }
}

export class SetPathNodeHandlesCommand extends UpdatePathNodeCommand {
  constructor(objectId: ObjectId, nodeIndex: number, handles: Pick<PathNode, 'inHandle' | 'outHandle'>) {
    super(objectId, nodeIndex, handles);
  }
}

export class DisconnectPathNodeHandlesCommand extends UpdatePathNodeCommand {
  constructor(objectId: ObjectId, nodeIndex: number, side: 'in' | 'out' | 'both' = 'both') {
    super(objectId, nodeIndex, {
      ...(side === 'in' || side === 'both' ? { inHandle: null } : {}),
      ...(side === 'out' || side === 'both' ? { outHandle: null } : {}),
      kind: 'cusp',
    });
  }
}

export class ConnectPathNodeHandlesCommand extends UpdatePathNodeCommand {
  constructor(objectId: ObjectId, nodeIndex: number, doc: DocumentModel) {
    const object = doc.objects[objectId];
    const node = object?.type === 'path' ? object.nodes[nodeIndex] : undefined;
    super(objectId, nodeIndex, node ? applyNodeKind(node, 'smooth') : { kind: 'smooth' });
  }
}

export class ConvertObjectToPathCommand implements Command {
  readonly type = 'ConvertObjectToPath';
  readonly description = 'Convert to curves';
  private previous: SceneObject | null = null;

  constructor(private readonly objectId: ObjectId) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (!object || object.locked || object.type === 'path' || object.type === 'group') return doc;
    if (object.type !== 'rectangle' && object.type !== 'ellipse' && object.type !== 'line') return doc;
    const nodes: PathNode[] = object.type === 'rectangle'
      ? [createPathNode({ x: 0, y: 0 }), createPathNode({ x: object.width, y: 0 }), createPathNode({ x: object.width, y: object.height }), createPathNode({ x: 0, y: object.height })]
      : object.type === 'ellipse'
        ? ellipsePathNodes(object.width, object.height)
        : [createPathNode({ x: 0, y: 0 }), createPathNode(object.endPoint)];
    const path: import('../model/types.js').PathObject = { ...object, type: 'path', nodes, closed: object.type !== 'line', style: object.type === 'line' ? { ...object.style, fill: { type: 'none' } } : object.style };
    if (!isValidPathGeometry(path.nodes, path.closed)) return doc;
    this.previous = object;
    return { ...doc, objects: { ...doc.objects, [object.id]: path }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, objects: { ...doc.objects, [this.previous.id]: this.previous }, updatedAt: new Date().toISOString() } : doc;
  }
}

export class ConvertStrokeToPathCommand implements Command {
  readonly type = 'ConvertStrokeToPath';
  readonly description = 'Convert stroke to path';
  private previous: SceneObject | null = null;

  constructor(private readonly objectId: ObjectId) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (!object || object.locked || !object.style.stroke) return doc;
    if (object.type === 'group') return doc;
    if (object.type !== 'path' && object.type !== 'line' && object.type !== 'rectangle' && object.type !== 'ellipse') return doc;
    const centerline = object.type === 'path'
      ? samplePath(object.nodes, object.closed)
      : object.type === 'line'
        ? [{ x: 0, y: 0 }, object.endPoint]
        : object.type === 'rectangle'
          ? [{ x: 0, y: 0 }, { x: object.width, y: 0 }, { x: object.width, y: object.height }, { x: 0, y: object.height }]
          : samplePath(ellipsePathNodes(object.width, object.height), true);
    if (!centerline || centerline.length < 2 || object.style.stroke.width <= 0) return doc;
    const outline = strokeOutline(centerline, object.style.stroke.width / 2, object.style.stroke.lineCap, object.type === 'path' && object.closed);
    if (outline.length < 3) return doc;
    const path: import('../model/types.js').PathObject = {
      ...object,
      type: 'path',
      nodes: outline.map((point) => createPathNode(point)),
      closed: true,
      style: { ...object.style, fill: object.style.fill.type === 'none' ? { type: 'solid', color: object.style.stroke!.color } : object.style.fill, stroke: null },
    };
    if (!isValidPathGeometry(path.nodes, true)) return doc;
    this.previous = object;
    return { ...doc, objects: { ...doc.objects, [object.id]: path }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, objects: { ...doc.objects, [this.previous.id]: this.previous }, updatedAt: new Date().toISOString() } : doc;
  }
}

function samplePath(nodes: readonly PathNode[], closed: boolean): Vec2[] {
  const points: Vec2[] = [];
  const segmentCount = closed ? nodes.length : nodes.length - 1;
  for (let i = 0; i < segmentCount; i += 1) {
    const segment = getCubicSegment(nodes, i, closed);
    if (!segment) continue;
    for (let step = i === 0 ? 0 : 1; step <= 8; step += 1) {
      const t = step / 8;
      const mt = 1 - t;
      points.push({
        x: mt ** 3 * segment.start.x + 3 * mt ** 2 * t * segment.control1.x + 3 * mt * t ** 2 * segment.control2.x + t ** 3 * segment.end.x,
        y: mt ** 3 * segment.start.y + 3 * mt ** 2 * t * segment.control1.y + 3 * mt * t ** 2 * segment.control2.y + t ** 3 * segment.end.y,
      });
    }
  }
  return points;
}

function strokeOutline(points: readonly Vec2[], radius: number, cap: StrokeStyle['lineCap'], closed = false): Vec2[] {
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const previous = points[Math.max(0, i - 1)]!;
    const next = points[Math.min(points.length - 1, i + 1)]!;
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    const normal = { x: -dy / length * radius, y: dx / length * radius };
    left.push({ x: points[i]!.x + normal.x, y: points[i]!.y + normal.y });
    right.push({ x: points[i]!.x - normal.x, y: points[i]!.y - normal.y });
  }
  if (!closed && cap === 'square') {
    const extend = (point: Vec2, toward: Vec2) => { const length = Math.hypot(toward.x, toward.y) || 1; return { x: point.x + toward.x / length * radius, y: point.y + toward.y / length * radius }; };
    const startDirection = { x: points[0]!.x - points[1]!.x, y: points[0]!.y - points[1]!.y };
    const endDirection = { x: points.at(-1)!.x - points.at(-2)!.x, y: points.at(-1)!.y - points.at(-2)!.y };
    left[0] = extend(left[0]!, startDirection);
    right[0] = extend(right[0]!, startDirection);
    left[left.length - 1] = extend(left.at(-1)!, endDirection);
    right[right.length - 1] = extend(right.at(-1)!, endDirection);
  }
  return [...left, ...right.reverse()];
}

function ellipsePathNodes(width: number, height: number): PathNode[] {
  const rx = width / 2;
  const ry = height / 2;
  const k = 0.5522847498;
  return [
    createPathNode({ x: rx, y: 0 }, { outHandle: { x: rx + k * rx, y: 0 }, inHandle: { x: rx - k * rx, y: 0 }, kind: 'smooth' }),
    createPathNode({ x: width, y: ry }, { outHandle: { x: width, y: ry + k * ry }, inHandle: { x: width, y: ry - k * ry }, kind: 'smooth' }),
    createPathNode({ x: rx, y: height }, { outHandle: { x: rx - k * rx, y: height }, inHandle: { x: rx + k * rx, y: height }, kind: 'smooth' }),
    createPathNode({ x: 0, y: ry }, { outHandle: { x: 0, y: ry - k * ry }, inHandle: { x: 0, y: ry + k * ry }, kind: 'smooth' }),
  ];
}

// ─── Artboard and layer commands ─────────────────────────────────────────────

export class UpdateArtboardCommand implements Command {
  readonly type = 'UpdateArtboard';
  readonly description = 'Change artboard';
  private previous: Partial<Pick<import('../model/types.js').Artboard, 'name' | 'width' | 'height' | 'background' | 'visible' | 'frame' | 'orientation'>> | null = null;

  constructor(
    private readonly artboardId: ArtboardId,
    private readonly patch: Partial<Pick<import('../model/types.js').Artboard, 'name' | 'width' | 'height' | 'background' | 'visible' | 'frame' | 'orientation'>>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const artboard = doc.artboards[this.artboardId];
    if (!artboard) return doc;
    const width = this.patch.width ?? artboard.width;
    const height = this.patch.height ?? artboard.height;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return doc;
    this.previous = { name: artboard.name, width: artboard.width, height: artboard.height, background: artboard.background, visible: artboard.visible, frame: artboard.frame, orientation: artboard.orientation };
    return { ...doc, artboards: { ...doc.artboards, [this.artboardId]: { ...artboard, ...this.patch, width, height, frame: { x: artboard.x, y: artboard.y, width, height } } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const artboard = doc.artboards[this.artboardId];
    return this.previous && artboard ? { ...doc, artboards: { ...doc.artboards, [this.artboardId]: { ...artboard, ...this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}

/** Rename an artboard without changing its geometry or active selection. */
export class RenameArtboardCommand extends UpdateArtboardCommand {
  constructor(artboardId: ArtboardId, name: string) { super(artboardId, { name: name.trim().slice(0, 120) }); }
}

/** Set artboard orientation by swapping dimensions only when orientation changes. */
export class SetArtboardOrientationCommand extends UpdateArtboardCommand {
  constructor(artboardId: ArtboardId, orientation: 'portrait' | 'landscape', doc: DocumentModel) {
    const artboard = doc.artboards[artboardId];
    const shouldSwap = Boolean(artboard && ((orientation === 'portrait' && artboard.width > artboard.height) || (orientation === 'landscape' && artboard.height > artboard.width)));
    super(artboardId, { ...(shouldSwap && artboard ? { width: artboard.height, height: artboard.width } : {}), orientation });
  }
}

/** Update artboard background through the document command boundary. */
export class UpdateArtboardBackgroundCommand extends UpdateArtboardCommand {
  constructor(artboardId: ArtboardId, background: Artboard['background']) { super(artboardId, { background }); }
}

export class SetDocumentUnitCommand implements Command {
  readonly type = 'SetDocumentUnit';
  readonly description = 'Change document units';
  private previous: DocumentUnit | null = null;

  constructor(private readonly unit: DocumentUnit) {}

  execute(doc: DocumentModel): DocumentModel {
    if (doc.unit === this.unit) return doc;
    this.previous = doc.unit;
    return { ...doc, unit: this.unit, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, unit: this.previous, updatedAt: new Date().toISOString() } : doc;
  }
}

export class SelectArtboardCommand implements Command {
  readonly type = 'SelectArtboard';
  readonly description = 'Select artboard';
  private previous: ArtboardId | null = null;

  constructor(private readonly artboardId: ArtboardId) {}

  execute(doc: DocumentModel): DocumentModel {
    if (!doc.artboards[this.artboardId] || doc.activeArtboardId === this.artboardId) return doc;
    this.previous = doc.activeArtboardId;
    return { ...doc, activeArtboardId: this.artboardId };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, activeArtboardId: this.previous } : doc;
  }
}

function nextArtboardPosition(doc: DocumentModel): { x: number; y: number } {
  const boards = Object.values(doc.artboards);
  if (boards.length === 0) return { x: 0, y: 0 };
  const right = Math.max(...boards.map((board) => board.x + board.width));
  return { x: right + 80, y: boards[0]?.y ?? 0 };
}

function uniqueArtboardName(doc: DocumentModel, requested: string): string {
  const names = new Set(Object.values(doc.artboards).map((board) => board.name));
  if (!names.has(requested)) return requested;
  let suffix = 2;
  while (names.has(`${requested} ${suffix}`)) suffix += 1;
  return `${requested} ${suffix}`;
}

export class CreateArtboardCommand implements Command {
  readonly type = 'CreateArtboard';
  readonly description = 'Add artboard';
  private created: Artboard | null = null;

  constructor(private readonly options: Partial<Pick<Artboard, 'name' | 'x' | 'y' | 'width' | 'height' | 'background'>> = {}) {}

  execute(doc: DocumentModel): DocumentModel {
    const position = nextArtboardPosition(doc);
    const id = generateId();
    const board: Artboard = {
      id,
      name: uniqueArtboardName(doc, this.options.name?.trim() || `Artboard ${doc.artboardIds.length + 1}`),
      x: this.options.x ?? position.x,
      y: this.options.y ?? position.y,
      width: this.options.width ?? 1920,
      height: this.options.height ?? 1080,
      background: this.options.background ?? { type: 'color', color: '#ffffff' },
      visible: true,
      orientation: (this.options.height ?? 1080) >= (this.options.width ?? 1920) ? 'portrait' : 'landscape',
      frame: { x: this.options.x ?? position.x, y: this.options.y ?? position.y, width: this.options.width ?? 1920, height: this.options.height ?? 1080 },
    };
    if (!Number.isFinite(board.x) || !Number.isFinite(board.y) || !Number.isFinite(board.width) || !Number.isFinite(board.height) || board.width <= 0 || board.height <= 0) return doc;
    this.created = board;
    return { ...doc, artboards: { ...doc.artboards, [id]: board }, artboardIds: [...doc.artboardIds, id], activeArtboardId: id, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.created || doc.artboardIds.length <= 1) return doc;
    const artboards = { ...doc.artboards };
    delete artboards[this.created.id];
    const artboardIds = doc.artboardIds.filter((id) => id !== this.created!.id);
    return { ...doc, artboards, artboardIds, activeArtboardId: artboardIds[artboardIds.length - 1]!, updatedAt: new Date().toISOString() };
  }
}

export class DuplicateArtboardCommand implements Command {
  readonly type = 'DuplicateArtboard';
  readonly description = 'Duplicate artboard';
  private duplicateId: ArtboardId | null = null;

  constructor(private readonly sourceId: ArtboardId) {}

  execute(doc: DocumentModel): DocumentModel {
    const source = doc.artboards[this.sourceId];
    if (!source) return doc;
    const id = generateId();
    const position = nextArtboardPosition(doc);
    const duplicate: Artboard = { ...source, id, name: uniqueArtboardName(doc, `${source.name} copy`), x: position.x, y: position.y, frame: { x: position.x, y: position.y, width: source.width, height: source.height } };
    this.duplicateId = id;
    return { ...doc, artboards: { ...doc.artboards, [id]: duplicate }, artboardIds: [...doc.artboardIds, id], activeArtboardId: id, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.duplicateId || doc.artboardIds.length <= 1) return doc;
    const artboards = { ...doc.artboards };
    delete artboards[this.duplicateId];
    const artboardIds = doc.artboardIds.filter((id) => id !== this.duplicateId);
    return { ...doc, artboards, artboardIds, activeArtboardId: artboardIds[artboardIds.length - 1]!, updatedAt: new Date().toISOString() };
  }
}

export class DeleteArtboardCommand implements Command {
  readonly type = 'DeleteArtboard';
  readonly description = 'Delete artboard';
  private deleted: Artboard | null = null;
  private deletedIndex = -1;
  private previousActive: ArtboardId | null = null;

  constructor(private readonly artboardId: ArtboardId) {}

  execute(doc: DocumentModel): DocumentModel {
    if (doc.artboardIds.length <= 1) return doc;
    const board = doc.artboards[this.artboardId];
    if (!board) return doc;
    this.deleted = board;
    this.deletedIndex = doc.artboardIds.indexOf(this.artboardId);
    this.previousActive = doc.activeArtboardId;
    const artboards = { ...doc.artboards };
    delete artboards[this.artboardId];
    const artboardIds = doc.artboardIds.filter((id) => id !== this.artboardId);
    const fallback = artboardIds[Math.min(Math.max(this.deletedIndex, 0), artboardIds.length - 1)]!;
    return { ...doc, artboards, artboardIds, activeArtboardId: doc.activeArtboardId === this.artboardId ? fallback : doc.activeArtboardId, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.deleted || doc.artboards[this.deleted.id]) return doc;
    const ids = [...doc.artboardIds];
    ids.splice(Math.max(0, this.deletedIndex), 0, this.deleted.id);
    return { ...doc, artboards: { ...doc.artboards, [this.deleted.id]: this.deleted }, artboardIds: ids, activeArtboardId: this.previousActive ?? doc.activeArtboardId, updatedAt: new Date().toISOString() };
  }
}

export class AddGuideCommand implements Command {
  readonly type = 'AddGuide';
  readonly description = 'Add guide';
  private guide: Guide;

  constructor(guide: Guide) { this.guide = { ...guide }; }

  execute(doc: DocumentModel): DocumentModel {
    if (!Number.isFinite(this.guide.position) || doc.guides.some((guide) => guide.id === this.guide.id)) return doc;
    return { ...doc, guides: [...doc.guides, this.guide], updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return { ...doc, guides: doc.guides.filter((guide) => guide.id !== this.guide.id), updatedAt: new Date().toISOString() };
  }
}

export class UpdateGuideCommand implements Command {
  readonly type = 'UpdateGuide';
  readonly description = 'Move guide';
  private previous: Guide | null = null;

  constructor(private readonly guideId: string, private readonly patch: Partial<Omit<Guide, 'id'>>) {}

  execute(doc: DocumentModel): DocumentModel {
    const guide = doc.guides.find((candidate) => candidate.id === this.guideId);
    if (!guide) return doc;
    const next = { ...guide, ...this.patch };
    if (!Number.isFinite(next.position)) return doc;
    this.previous = guide;
    return { ...doc, guides: doc.guides.map((candidate) => candidate.id === this.guideId ? next : candidate), updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, guides: doc.guides.map((guide) => guide.id === this.guideId ? this.previous! : guide), updatedAt: new Date().toISOString() } : doc;
  }
}

export class DeleteGuideCommand implements Command {
  readonly type = 'DeleteGuide';
  readonly description = 'Delete guide';
  private deleted: Guide | null = null;

  constructor(private readonly guideId: string) {}

  execute(doc: DocumentModel): DocumentModel {
    const guide = doc.guides.find((candidate) => candidate.id === this.guideId);
    if (!guide || guide.locked) return doc;
    this.deleted = guide;
    return { ...doc, guides: doc.guides.filter((candidate) => candidate.id !== this.guideId), updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.deleted && !doc.guides.some((guide) => guide.id === this.deleted!.id) ? { ...doc, guides: [...doc.guides, this.deleted], updatedAt: new Date().toISOString() } : doc;
  }
}

export class SetGridSettingsCommand implements Command {
  readonly type = 'SetGridSettings';
  readonly description = 'Change grid settings';
  private previous: GridSettings | null = null;

  constructor(private readonly patch: Partial<GridSettings>) {}

  execute(doc: DocumentModel): DocumentModel {
    const next = { ...doc.grid, ...this.patch };
    if (!Number.isFinite(next.size) || next.size <= 0 || !Number.isInteger(next.subdivisions) || next.subdivisions < 1) return doc;
    this.previous = doc.grid;
    return { ...doc, grid: next, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, grid: this.previous, updatedAt: new Date().toISOString() } : doc;
  }
}

export class SetSnapSettingsCommand implements Command {
  readonly type = 'SetSnapSettings';
  readonly description = 'Change snap settings';
  private previous: SnapSettings | null = null;

  constructor(private readonly patch: Partial<SnapSettings>) {}

  execute(doc: DocumentModel): DocumentModel {
    const next = { ...doc.snap, ...this.patch };
    if (!Number.isFinite(next.tolerancePx) || next.tolerancePx < 0) return doc;
    this.previous = doc.snap;
    return { ...doc, snap: next, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, snap: this.previous, updatedAt: new Date().toISOString() } : doc;
  }
}

export class UpdateLayerCommand implements Command {
  readonly type = 'UpdateLayer';
  readonly description = 'Change layer';
  private previous: Partial<Pick<import('../model/types.js').Layer, 'name' | 'visible' | 'locked' | 'opacity'>> | null = null;

  constructor(
    private readonly layerId: LayerId,
    private readonly patch: Partial<Pick<import('../model/types.js').Layer, 'name' | 'visible' | 'locked' | 'opacity'>>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const layer = doc.layers[this.layerId];
    if (!layer) return doc;
    if (this.patch.opacity !== undefined && (!Number.isFinite(this.patch.opacity) || this.patch.opacity < 0 || this.patch.opacity > 1)) return doc;
    this.previous = { name: layer.name, visible: layer.visible, locked: layer.locked, opacity: layer.opacity };
    return { ...doc, layers: { ...doc.layers, [this.layerId]: { ...layer, ...this.patch } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const layer = doc.layers[this.layerId];
    return this.previous && layer ? { ...doc, layers: { ...doc.layers, [this.layerId]: { ...layer, ...this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}

export class UpdateObjectCommand implements Command {
  readonly type = 'UpdateObject';
  readonly description = 'Change object';
  private previous: Partial<Pick<SceneObject, 'name' | 'visible' | 'locked'>> | null = null;

  constructor(private readonly objectId: ObjectId, private readonly patch: Partial<Pick<SceneObject, 'name' | 'visible' | 'locked'>>) {}

  execute(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    if (!object) return doc;
    if (object.locked && this.patch.locked !== false) return doc;
    this.previous = { name: object.name, visible: object.visible, locked: object.locked };
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...object, ...this.patch } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    return this.previous && object ? { ...doc, objects: { ...doc.objects, [this.objectId]: { ...object, ...this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}

// ─── Parametric Geometry Commands ───────────────────────────────────────────

export class SetPolygonGeometryCommand implements Command {
  readonly type = 'SetPolygonGeometry';
  readonly description = 'Edit polygon';
  private previous: { sides: number; radius: number } | null = null;
  constructor(private readonly objectId: ObjectId, private readonly patch: { sides?: number; radius?: number }) {}
  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'polygon' || obj.locked) return doc;
    const sides = this.patch.sides ?? obj.sides;
    const radius = this.patch.radius ?? obj.radius;
    if (!Number.isFinite(sides) || sides < 3 || sides > 64 || !Number.isFinite(radius) || radius <= 0) return doc;
    this.previous = { sides: obj.sides, radius: obj.radius };
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, sides, radius } }, updatedAt: new Date().toISOString() };
  }
  undo(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!this.previous || !obj || obj.type !== 'polygon') return doc;
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, ...this.previous } }, updatedAt: new Date().toISOString() };
  }
}

export class SetStarGeometryCommand implements Command {
  readonly type = 'SetStarGeometry';
  readonly description = 'Edit star';
  private previous: { points: number; outerRadius: number; innerRadius: number } | null = null;
  constructor(private readonly objectId: ObjectId, private readonly patch: { points?: number; outerRadius?: number; innerRadius?: number }) {}
  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'star' || obj.locked) return doc;
    const points = this.patch.points ?? obj.points;
    const outerRadius = this.patch.outerRadius ?? obj.outerRadius;
    const innerRadius = this.patch.innerRadius ?? obj.innerRadius;
    if (!Number.isFinite(points) || points < 3 || points > 64 || !Number.isFinite(outerRadius) || !Number.isFinite(innerRadius) || innerRadius < 0 || innerRadius >= outerRadius) return doc;
    this.previous = { points: obj.points, outerRadius: obj.outerRadius, innerRadius: obj.innerRadius };
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, points, outerRadius, innerRadius } }, updatedAt: new Date().toISOString() };
  }
  undo(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!this.previous || !obj || obj.type !== 'star') return doc;
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, ...this.previous } }, updatedAt: new Date().toISOString() };
  }
}

export class SetArcGeometryCommand implements Command {
  readonly type = 'SetArcGeometry';
  readonly description = 'Edit arc';
  private previous: { radiusX: number; radiusY: number; startAngle: number; endAngle: number; closed: boolean } | null = null;
  constructor(private readonly objectId: ObjectId, private readonly patch: { radiusX?: number; radiusY?: number; startAngle?: number; endAngle?: number; closed?: boolean }) {}
  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'arc' || obj.locked) return doc;
    const radiusX = this.patch.radiusX ?? obj.radiusX;
    const radiusY = this.patch.radiusY ?? obj.radiusY;
    const startAngle = this.patch.startAngle ?? obj.startAngle;
    const endAngle = this.patch.endAngle ?? obj.endAngle;
    const closed = this.patch.closed ?? obj.closed;
    if (!Number.isFinite(radiusX) || radiusX <= 0 || !Number.isFinite(radiusY) || radiusY <= 0 || !Number.isFinite(startAngle) || !Number.isFinite(endAngle)) return doc;
    this.previous = { radiusX: obj.radiusX, radiusY: obj.radiusY, startAngle: obj.startAngle, endAngle: obj.endAngle, closed: obj.closed };
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, radiusX, radiusY, startAngle, endAngle, closed } }, updatedAt: new Date().toISOString() };
  }
  undo(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!this.previous || !obj || obj.type !== 'arc') return doc;
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, ...this.previous } }, updatedAt: new Date().toISOString() };
  }
}

export class SetPieGeometryCommand implements Command {
  readonly type = 'SetPieGeometry';
  readonly description = 'Edit pie';
  private previous: { radiusX: number; radiusY: number; startAngle: number; endAngle: number } | null = null;
  constructor(private readonly objectId: ObjectId, private readonly patch: { radiusX?: number; radiusY?: number; startAngle?: number; endAngle?: number }) {}
  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'pie' || obj.locked) return doc;
    const radiusX = this.patch.radiusX ?? obj.radiusX;
    const radiusY = this.patch.radiusY ?? obj.radiusY;
    const startAngle = this.patch.startAngle ?? obj.startAngle;
    const endAngle = this.patch.endAngle ?? obj.endAngle;
    if (!Number.isFinite(radiusX) || radiusX <= 0 || !Number.isFinite(radiusY) || radiusY <= 0 || !Number.isFinite(startAngle) || !Number.isFinite(endAngle)) return doc;
    this.previous = { radiusX: obj.radiusX, radiusY: obj.radiusY, startAngle: obj.startAngle, endAngle: obj.endAngle };
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, radiusX, radiusY, startAngle, endAngle } }, updatedAt: new Date().toISOString() };
  }
  undo(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!this.previous || !obj || obj.type !== 'pie') return doc;
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, ...this.previous } }, updatedAt: new Date().toISOString() };
  }
}

export class SetRingGeometryCommand implements Command {
  readonly type = 'SetRingGeometry';
  readonly description = 'Edit ring';
  private previous: { outerRadius: number; innerRadius: number } | null = null;
  constructor(private readonly objectId: ObjectId, private readonly patch: { outerRadius?: number; innerRadius?: number }) {}
  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'ring' || obj.locked) return doc;
    const outerRadius = this.patch.outerRadius ?? obj.outerRadius;
    const innerRadius = this.patch.innerRadius ?? obj.innerRadius;
    if (!Number.isFinite(outerRadius) || !Number.isFinite(innerRadius) || innerRadius < 0 || innerRadius >= outerRadius) return doc;
    this.previous = { outerRadius: obj.outerRadius, innerRadius: obj.innerRadius };
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, outerRadius, innerRadius } }, updatedAt: new Date().toISOString() };
  }
  undo(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!this.previous || !obj || obj.type !== 'ring') return doc;
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, ...this.previous } }, updatedAt: new Date().toISOString() };
  }
}

export class SetSpiralGeometryCommand implements Command {
  readonly type = 'SetSpiralGeometry';
  readonly description = 'Edit spiral';
  private previous: { turns: number; decay: number; direction: 'cw' | 'ccw' } | null = null;
  constructor(private readonly objectId: ObjectId, private readonly patch: { turns?: number; decay?: number; direction?: 'cw' | 'ccw' }) {}
  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'spiral' || obj.locked) return doc;
    const turns = this.patch.turns ?? obj.turns;
    const decay = this.patch.decay ?? obj.decay;
    const direction = this.patch.direction ?? obj.direction;
    if (!Number.isFinite(turns) || turns <= 0 || turns > 20 || !Number.isFinite(decay) || decay <= 0) return doc;
    this.previous = { turns: obj.turns, decay: obj.decay, direction: obj.direction };
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, turns, decay, direction } }, updatedAt: new Date().toISOString() };
  }
  undo(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!this.previous || !obj || obj.type !== 'spiral') return doc;
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, ...this.previous } }, updatedAt: new Date().toISOString() };
  }
}

export class SetCalloutGeometryCommand implements Command {
  readonly type = 'SetCalloutGeometry';
  readonly description = 'Edit callout';
  private previous: { width: number; height: number; cornerRadius: number; tailTip: Vec2; tailBaseWidth: number } | null = null;
  constructor(private readonly objectId: ObjectId, private readonly patch: { width?: number; height?: number; cornerRadius?: number; tailTip?: Vec2; tailBaseWidth?: number }) {}
  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'callout' || obj.locked) return doc;
    const width = this.patch.width ?? obj.width;
    const height = this.patch.height ?? obj.height;
    const cornerRadius = this.patch.cornerRadius ?? obj.cornerRadius;
    const tailTip = this.patch.tailTip ?? obj.tailTip;
    const tailBaseWidth = this.patch.tailBaseWidth ?? obj.tailBaseWidth;
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0 || !Number.isFinite(cornerRadius) || cornerRadius < 0 || !Number.isFinite(tailBaseWidth) || tailBaseWidth < 0 || !Number.isFinite(tailTip.x) || !Number.isFinite(tailTip.y)) return doc;
    this.previous = { width: obj.width, height: obj.height, cornerRadius: obj.cornerRadius, tailTip: obj.tailTip, tailBaseWidth: obj.tailBaseWidth };
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, width, height, cornerRadius, tailTip, tailBaseWidth } }, updatedAt: new Date().toISOString() };
  }
  undo(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!this.previous || !obj || obj.type !== 'callout') return doc;
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, ...this.previous } }, updatedAt: new Date().toISOString() };
  }
}

export class SetPolylineGeometryCommand implements Command {
  readonly type = 'SetPolylineGeometry';
  readonly description = 'Edit polyline';
  private previous: { points: readonly Vec2[] } | null = null;
  constructor(private readonly objectId: ObjectId, private readonly patch: { points: readonly Vec2[] }) {}
  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'polyline' || obj.locked) return doc;
    const points = this.patch.points;
    if (points.length < 2 || points.some(pt => !Number.isFinite(pt.x) || !Number.isFinite(pt.y))) return doc;
    this.previous = { points: obj.points };
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, points } }, updatedAt: new Date().toISOString() };
  }
  undo(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!this.previous || !obj || obj.type !== 'polyline') return doc;
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, ...this.previous } }, updatedAt: new Date().toISOString() };
  }
}

export class SetStrokeArrowheadsCommand implements Command {
  readonly type = 'SetStrokeArrowheads';
  readonly description = 'Change arrowheads';
  private previous: { markerStart?: ArrowheadStyle; markerEnd?: ArrowheadStyle } | null = null;
  constructor(private readonly objectId: ObjectId, private readonly patch: { markerStart?: ArrowheadStyle | null; markerEnd?: ArrowheadStyle | null }) {}
  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.locked || !obj.style.stroke) return doc;
    const markerStart = this.patch.markerStart !== undefined ? (this.patch.markerStart === null ? undefined : this.patch.markerStart) : obj.style.stroke.markerStart;
    const markerEnd = this.patch.markerEnd !== undefined ? (this.patch.markerEnd === null ? undefined : this.patch.markerEnd) : obj.style.stroke.markerEnd;
    this.previous = { markerStart: obj.style.stroke.markerStart, markerEnd: obj.style.stroke.markerEnd };
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, style: { ...obj.style, stroke: { ...obj.style.stroke, markerStart, markerEnd } } } }, updatedAt: new Date().toISOString() };
  }
  undo(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!this.previous || !obj || !obj.style.stroke) return doc;
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...obj, style: { ...obj.style, stroke: { ...obj.style.stroke, markerStart: this.previous.markerStart, markerEnd: this.previous.markerEnd } } } }, updatedAt: new Date().toISOString() };
  }
}
