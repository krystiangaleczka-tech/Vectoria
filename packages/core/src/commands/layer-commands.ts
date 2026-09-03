import { generateId } from '@vectoria/shared';
import type { Command } from './command.js';
import type {
  DocumentModel,
  Layer,
  LayerId,
  LockedAttribute,
  MaskGroup,
  ObjectId,
  SceneObject,
} from '../model/types.js';

/**
 * Creates a new layer in the document at a specific z-index.
 */
export class CreateLayerCommand implements Command {
  readonly type = 'CreateLayer';
  private createdLayerId: LayerId | null = null;

  constructor(
    private readonly name?: string,
    private readonly index?: number,
    private readonly isTemplate?: boolean,
    private readonly labelColor?: string,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const existingNames = new Set(Object.values(doc.layers).map((l) => l.name));
    let layerName = this.name?.trim();
    if (!layerName) {
      let count = doc.layerIds.length + 1;
      const prefix = this.isTemplate ? 'Template' : 'Layer';
      while (existingNames.has(`${prefix} ${count}`)) {
        count++;
      }
      layerName = `${prefix} ${count}`;
    }

    const layerId: LayerId = this.createdLayerId ?? generateId();
    this.createdLayerId = layerId;

    const newLayer: Layer = {
      id: layerId,
      name: layerName,
      visible: true,
      locked: this.isTemplate ? true : false,
      opacity: this.isTemplate ? 0.5 : 1,
      objectIds: [],
      labelColor: this.labelColor,
      isTemplate: this.isTemplate,
    };

    const nextLayerIds = [...doc.layerIds];
    const targetIndex = this.index !== undefined && this.index >= 0 && this.index <= nextLayerIds.length
      ? this.index
      : nextLayerIds.length;
    nextLayerIds.splice(targetIndex, 0, layerId);

    return {
      ...doc,
      layers: {
        ...doc.layers,
        [layerId]: newLayer,
      },
      layerIds: nextLayerIds,
      activeLayerId: layerId,
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.createdLayerId) return doc;
    const remainingLayers = Object.fromEntries(Object.entries(doc.layers).filter(([id]) => id !== this.createdLayerId));
    const nextLayerIds = doc.layerIds.filter((id) => id !== this.createdLayerId);
    const activeLayerId = doc.activeLayerId === this.createdLayerId
      ? (nextLayerIds[nextLayerIds.length - 1] ?? doc.activeLayerId)
      : doc.activeLayerId;

    return {
      ...doc,
      layers: remainingLayers,
      layerIds: nextLayerIds,
      activeLayerId,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Deletes a layer and all its nested objects.
 * Refuses execution if document has only 1 layer remaining.
 */
export class DeleteLayerCommand implements Command {
  readonly type = 'DeleteLayer';
  private previousLayer: Layer | null = null;
  private previousIndex: number | null = null;
  private previousObjects: Record<ObjectId, SceneObject> = {};
  private previousMaskGroups: Record<string, MaskGroup> = {};

  constructor(private readonly layerId: LayerId) {}

  execute(doc: DocumentModel): DocumentModel {
    if (doc.layerIds.length <= 1) {
      // Invariant: Do not allow deleting the last remaining layer
      return doc;
    }

    const layer = doc.layers[this.layerId];
    if (!layer) return doc;

    this.previousLayer = layer;
    this.previousIndex = doc.layerIds.indexOf(this.layerId);

    // Collect all objects in this layer (including deeply nested groups)
    const objectsToDelete = new Set<ObjectId>();
    const collectIds = (id: ObjectId): void => {
      objectsToDelete.add(id);
      const obj = doc.objects[id];
      if (obj && obj.type === 'group') {
        obj.childIds.forEach(collectIds);
      }
    };
    layer.objectIds.forEach(collectIds);

    this.previousObjects = {};
    for (const id of objectsToDelete) {
      if (doc.objects[id]) {
        this.previousObjects[id] = doc.objects[id]!;
      }
    }

    // Check affected mask groups
    this.previousMaskGroups = {};
    const nextMaskGroups = { ...(doc.maskGroups ?? {}) };
    for (const [maskGroupId, group] of Object.entries(nextMaskGroups)) {
      if (objectsToDelete.has(group.maskId) || group.contentIds.some((id) => objectsToDelete.has(id))) {
        this.previousMaskGroups[maskGroupId] = group;
        delete nextMaskGroups[maskGroupId];
      }
    }

    const nextObjects = { ...doc.objects };
    for (const id of objectsToDelete) {
      delete nextObjects[id];
    }

    const remainingLayers = Object.fromEntries(Object.entries(doc.layers).filter(([id]) => id !== this.layerId));
    const nextLayerIds = doc.layerIds.filter((id) => id !== this.layerId);
    const activeLayerId = doc.activeLayerId === this.layerId
      ? (nextLayerIds[0] ?? nextLayerIds[nextLayerIds.length - 1] ?? '')
      : doc.activeLayerId;

    return {
      ...doc,
      layers: remainingLayers,
      layerIds: nextLayerIds,
      objects: nextObjects,
      maskGroups: nextMaskGroups,
      activeLayerId,
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previousLayer || this.previousIndex === null) return doc;

    const nextLayerIds = [...doc.layerIds];
    nextLayerIds.splice(this.previousIndex, 0, this.previousLayer.id);

    return {
      ...doc,
      layers: {
        ...doc.layers,
        [this.previousLayer.id]: this.previousLayer,
      },
      layerIds: nextLayerIds,
      objects: {
        ...doc.objects,
        ...this.previousObjects,
      },
      maskGroups: {
        ...(doc.maskGroups ?? {}),
        ...this.previousMaskGroups,
      },
      activeLayerId: this.previousLayer.id,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Renames a layer after validating non-empty input.
 */
export class RenameLayerCommand implements Command {
  readonly type = 'RenameLayer';
  private previousName: string | null = null;

  constructor(
    private readonly layerId: LayerId,
    private readonly nextName: string,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const layer = doc.layers[this.layerId];
    const trimmed = this.nextName.trim();
    if (!layer || !trimmed || layer.name === trimmed) return doc;

    this.previousName = layer.name;

    return {
      ...doc,
      layers: {
        ...doc.layers,
        [this.layerId]: {
          ...layer,
          name: trimmed,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (this.previousName === null) return doc;
    const layer = doc.layers[this.layerId];
    if (!layer) return doc;

    return {
      ...doc,
      layers: {
        ...doc.layers,
        [this.layerId]: {
          ...layer,
          name: this.previousName,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Updates visual or behavioral properties of a layer.
 */
export class UpdateLayerPropertiesCommand implements Command {
  readonly type = 'UpdateLayerProperties';
  private previous: Partial<Layer> | null = null;

  constructor(
    private readonly layerId: LayerId,
    private readonly patch: Partial<Pick<Layer, 'visible' | 'locked' | 'opacity' | 'labelColor' | 'isTemplate'>>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const layer = doc.layers[this.layerId];
    if (!layer) return doc;

    this.previous = {
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      labelColor: layer.labelColor,
      isTemplate: layer.isTemplate,
    };

    return {
      ...doc,
      layers: {
        ...doc.layers,
        [this.layerId]: {
          ...layer,
          ...this.patch,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previous) return doc;
    const layer = doc.layers[this.layerId];
    if (!layer) return doc;

    return {
      ...doc,
      layers: {
        ...doc.layers,
        [this.layerId]: {
          ...layer,
          ...this.previous,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Reorders layers in the document z-index stack.
 */
export class ReorderLayersCommand implements Command {
  readonly type = 'ReorderLayers';
  private previousLayerIds: readonly LayerId[] | null = null;

  constructor(private readonly nextLayerIds: readonly LayerId[]) {}

  execute(doc: DocumentModel): DocumentModel {
    if (this.nextLayerIds.length !== doc.layerIds.length) return doc;
    const allMatch = this.nextLayerIds.every((id) => id in doc.layers);
    if (!allMatch) return doc;

    this.previousLayerIds = doc.layerIds;

    return {
      ...doc,
      layerIds: [...this.nextLayerIds],
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previousLayerIds) return doc;

    return {
      ...doc,
      layerIds: [...this.previousLayerIds],
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Moves objects from their current layer to a designated target layer.
 */
export class MoveObjectsToLayerCommand implements Command {
  readonly type = 'MoveObjectsToLayer';
  private previousLayers: Record<LayerId, readonly ObjectId[]> = {};
  private previousObjectLayerIds: Record<ObjectId, LayerId> = {};

  constructor(
    private readonly objectIds: readonly ObjectId[],
    private readonly targetLayerId: LayerId,
    private readonly targetIndex?: number,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const targetLayer = doc.layers[this.targetLayerId];
    if (!targetLayer || this.objectIds.length === 0) return doc;

    const validObjectIds = this.objectIds.filter((id) => doc.objects[id]);
    if (validObjectIds.length === 0) return doc;

    this.previousLayers = {};
    for (const [id, layer] of Object.entries(doc.layers)) {
      this.previousLayers[id] = layer.objectIds;
    }
    this.previousObjectLayerIds = {};
    for (const id of validObjectIds) {
      this.previousObjectLayerIds[id] = doc.objects[id]!.layerId;
    }

    const nextLayers: Record<LayerId, Layer> = {};
    for (const [id, layer] of Object.entries(doc.layers)) {
      nextLayers[id] = {
        ...layer,
        objectIds: layer.objectIds.filter((objId) => !validObjectIds.includes(objId)),
      };
    }

    const targetList = [...nextLayers[this.targetLayerId]!.objectIds];
    const insertIdx = this.targetIndex !== undefined && this.targetIndex >= 0 && this.targetIndex <= targetList.length
      ? this.targetIndex
      : targetList.length;
    targetList.splice(insertIdx, 0, ...validObjectIds);
    nextLayers[this.targetLayerId] = {
      ...nextLayers[this.targetLayerId]!,
      objectIds: targetList,
    };

    const nextObjects: Record<ObjectId, SceneObject> = { ...doc.objects };
    for (const id of validObjectIds) {
      const obj = nextObjects[id];
      if (obj) {
        nextObjects[id] = { ...obj, layerId: this.targetLayerId };
      }
    }

    return {
      ...doc,
      layers: nextLayers,
      objects: nextObjects,
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const nextLayers: Record<LayerId, Layer> = {};
    for (const [id, layer] of Object.entries(doc.layers)) {
      nextLayers[id] = {
        ...layer,
        objectIds: this.previousLayers[id] ?? layer.objectIds,
      };
    }

    const nextObjects: Record<ObjectId, SceneObject> = { ...doc.objects };
    for (const [objId, oldLayerId] of Object.entries(this.previousObjectLayerIds)) {
      const obj = nextObjects[objId];
      if (obj) {
        nextObjects[objId] = { ...obj, layerId: oldLayerId };
      }
    }

    return {
      ...doc,
      layers: nextLayers,
      objects: nextObjects,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Locks or unlocks specific object attributes (position, size, rotation, style, content).
 */
export class LockObjectAttributesCommand implements Command {
  readonly type = 'LockObjectAttributes';
  private previous: Record<ObjectId, readonly LockedAttribute[] | undefined> = {};

  constructor(
    private readonly objectIds: readonly ObjectId[],
    private readonly attributes: readonly LockedAttribute[],
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    this.previous = {};
    const nextObjects = { ...doc.objects };
    let changed = false;

    for (const id of this.objectIds) {
      const obj = nextObjects[id];
      if (!obj) continue;
      this.previous[id] = obj.lockedAttributes;
      nextObjects[id] = {
        ...obj,
        lockedAttributes: this.attributes.length > 0 ? [...this.attributes] : undefined,
      };
      changed = true;
    }

    if (!changed) return doc;

    return {
      ...doc,
      objects: nextObjects,
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const nextObjects = { ...doc.objects };
    for (const [id, prevAttrs] of Object.entries(this.previous)) {
      const obj = nextObjects[id];
      if (obj) {
        nextObjects[id] = {
          ...obj,
          lockedAttributes: prevAttrs,
        };
      }
    }

    return {
      ...doc,
      objects: nextObjects,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Recursively checks whether moving sourceId under targetId would introduce a circular hierarchy.
 * Traverses parentId upwards through any arbitrary depth with cycle guards.
 */
export function canMoveLayer(
  document: DocumentModel,
  sourceId: string,
  targetId: string,
): boolean {
  if (sourceId === targetId) return false;

  let current: string | null = targetId;
  const visited = new Set<string>();

  while (current) {
    if (current === sourceId) {
      return false;
    }
    if (visited.has(current)) {
      return false;
    }
    visited.add(current);
    current = document.layers[current]?.parentId ?? null;
  }

  return true;
}

