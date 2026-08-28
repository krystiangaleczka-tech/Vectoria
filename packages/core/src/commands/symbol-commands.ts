import type { DocumentModel, ObjectId, SceneObject, SymbolDefinition, SymbolId, SymbolInstanceObject, LayerId } from '../model/types.js';
import type { Command } from './command.js';
import { generateId, type Vec2 } from '@vectoria/shared';
import { createTransform } from '../model/transform.js';
import { getObjectBounds } from '../model/bounds.js';

/**
 * Creates a reusable symbol definition from selected scene objects (ASSET-018).
 * Optionally replaces the source objects on canvas with the first instance of the created symbol.
 */
export class CreateSymbolCommand implements Command {
  readonly type = 'create-symbol';
  readonly description = 'Create symbol';
  private createdSymbolId: SymbolId | null = null;
  private createdInstanceId: ObjectId | null = null;
  private previousObjects: Readonly<Record<ObjectId, SceneObject>> | null = null;
  private previousLayerObjectIds: Readonly<Record<LayerId, readonly ObjectId[]>> | null = null;

  constructor(
    private readonly name: string,
    private readonly sourceObjectIds: readonly ObjectId[],
    private readonly replaceWithInstance = true,
    private readonly isBrandAsset = false,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    if (this.sourceObjectIds.length === 0) return doc;

    const sourceObjects = this.sourceObjectIds
      .map((id) => doc.objects[id])
      .filter((obj): obj is SceneObject => Boolean(obj));
    if (sourceObjects.length === 0) return doc;

    const symbolId = this.createdSymbolId ?? generateId();
    this.createdSymbolId = symbolId;

    // Calculate union bounds of source objects
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const obj of sourceObjects) {
      const bounds = getObjectBounds(obj);
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);

    // Normalize source objects relative to symbol origin (minX, minY)
    const normalizedObjects: Record<ObjectId, SceneObject> = {};
    for (const obj of sourceObjects) {
      normalizedObjects[obj.id] = {
        ...obj,
        transform: {
          ...obj.transform,
          position: {
            x: obj.transform.position.x - minX,
            y: obj.transform.position.y - minY,
          },
        },
      };
    }

    const symbolDef: SymbolDefinition = {
      id: symbolId,
      name: this.name.trim() || `Symbol ${Object.keys(doc.symbols ?? {}).length + 1}`,
      objectIds: [...this.sourceObjectIds],
      objects: normalizedObjects,
      bounds: { x: 0, y: 0, width, height },
      isBrandAsset: this.isBrandAsset,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextSymbols = {
      ...(doc.symbols ?? {}),
      [symbolId]: symbolDef,
    };
    const nextSymbolIds = doc.symbolIds?.includes(symbolId)
      ? doc.symbolIds
      : [...(doc.symbolIds ?? []), symbolId];

    if (!this.replaceWithInstance) {
      return {
        ...doc,
        symbols: nextSymbols,
        symbolIds: nextSymbolIds,
        updatedAt: new Date().toISOString(),
      };
    }

    // Save previous state for undo
    this.previousObjects = { ...doc.objects };
    this.previousLayerObjectIds = Object.fromEntries(
      Object.entries(doc.layers).map(([lId, layer]) => [lId, layer.objectIds]),
    );

    const firstObj = sourceObjects[0]!;
    const targetLayerId = firstObj.layerId;
    const targetLayer = doc.layers[targetLayerId];
    if (!targetLayer) return doc;

    const instanceId = this.createdInstanceId ?? generateId();
    this.createdInstanceId = instanceId;

    const instanceObject: SymbolInstanceObject = {
      id: instanceId,
      name: symbolDef.name,
      layerId: targetLayerId,
      visible: true,
      locked: false,
      type: 'symbol-instance',
      symbolId,
      transform: createTransform({ x: minX, y: minY }),
      style: { fill: { type: 'none' }, stroke: null, opacity: 1, blendMode: 'normal' },
      width,
      height,
    };

    const nextObjects = { ...doc.objects };
    for (const id of this.sourceObjectIds) {
      delete nextObjects[id];
    }
    nextObjects[instanceId] = instanceObject;

    const nextLayerObjectIds = targetLayer.objectIds
      .filter((id) => !this.sourceObjectIds.includes(id))
      .concat(instanceId);

    return {
      ...doc,
      symbols: nextSymbols,
      symbolIds: nextSymbolIds,
      objects: nextObjects,
      layers: {
        ...doc.layers,
        [targetLayerId]: {
          ...targetLayer,
          objectIds: nextLayerObjectIds,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.createdSymbolId) return doc;

    const remainingSymbols = Object.fromEntries(
      Object.entries(doc.symbols ?? {}).filter(([id]) => id !== this.createdSymbolId),
    );
    const nextSymbolIds = (doc.symbolIds ?? []).filter((id) => id !== this.createdSymbolId);

    if (!this.replaceWithInstance || !this.previousObjects || !this.previousLayerObjectIds) {
      return {
        ...doc,
        symbols: remainingSymbols,
        symbolIds: nextSymbolIds,
        updatedAt: new Date().toISOString(),
      };
    }

    const nextLayers = { ...doc.layers };
    for (const [lId, objIds] of Object.entries(this.previousLayerObjectIds)) {
      if (nextLayers[lId]) {
        nextLayers[lId] = {
          ...nextLayers[lId]!,
          objectIds: objIds,
        };
      }
    }

    return {
      ...doc,
      symbols: remainingSymbols,
      symbolIds: nextSymbolIds,
      objects: this.previousObjects,
      layers: nextLayers,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Inserts a new instance of an existing symbol on the canvas (ASSET-019).
 */
export class InsertSymbolInstanceCommand implements Command {
  readonly type = 'insert-symbol-instance';
  readonly description = 'Insert symbol instance';
  private instanceId: ObjectId | null = null;
  private layerId: LayerId | null = null;

  constructor(
    private readonly symbolId: SymbolId,
    private readonly position: Vec2,
    private readonly targetLayerId?: LayerId,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const symbol = doc.symbols?.[this.symbolId];
    if (!symbol) return doc;

    const layerId = this.targetLayerId ?? doc.activeLayerId ?? doc.layerIds[0];
    if (!layerId || !doc.layers[layerId]) return doc;

    const instanceId = this.instanceId ?? generateId();
    this.instanceId = instanceId;
    this.layerId = layerId;

    const layer = doc.layers[layerId]!;
    const instanceObject: SymbolInstanceObject = {
      id: instanceId,
      name: `${symbol.name} Instance`,
      layerId,
      visible: true,
      locked: false,
      type: 'symbol-instance',
      symbolId: this.symbolId,
      transform: createTransform(this.position),
      style: { fill: { type: 'none' }, stroke: null, opacity: 1, blendMode: 'normal' },
      width: symbol.bounds.width,
      height: symbol.bounds.height,
    };

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [instanceId]: instanceObject,
      },
      layers: {
        ...doc.layers,
        [layerId]: {
          ...layer,
          objectIds: [...layer.objectIds, instanceId],
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.instanceId || !this.layerId || !doc.layers[this.layerId]) return doc;

    const layer = doc.layers[this.layerId]!;
    const remainingObjects = Object.fromEntries(
      Object.entries(doc.objects).filter(([id]) => id !== this.instanceId),
    );

    return {
      ...doc,
      objects: remainingObjects,
      layers: {
        ...doc.layers,
        [this.layerId]: {
          ...layer,
          objectIds: layer.objectIds.filter((id) => id !== this.instanceId),
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Updates a symbol definition, automatically propagating changes across all instances (ASSET-020).
 */
export class UpdateSymbolDefinitionCommand implements Command {
  readonly type = 'update-symbol-definition';
  readonly description = 'Update symbol definition';
  private previousDefinition: SymbolDefinition | null = null;

  constructor(
    private readonly symbolId: SymbolId,
    private readonly updatedObjects: Readonly<Record<ObjectId, SceneObject>>,
    private readonly name?: string,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const current = doc.symbols?.[this.symbolId];
    if (!current) return doc;

    this.previousDefinition = current;

    // Recalculate normalized bounds of the updated symbol objects
    const objectList = Object.values(this.updatedObjects);
    const bounds = objectList.reduce(
      (acc, obj) => {
        const b = getObjectBounds(obj);
        return {
          minX: Math.min(acc.minX, b.x),
          minY: Math.min(acc.minY, b.y),
          maxX: Math.max(acc.maxX, b.x + b.width),
          maxY: Math.max(acc.maxY, b.y + b.height),
        };
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
    );

    const width = bounds.maxX > bounds.minX ? bounds.maxX - bounds.minX : current.bounds.width;
    const height = bounds.maxY > bounds.minY ? bounds.maxY - bounds.minY : current.bounds.height;

    const updatedSymbol: SymbolDefinition = {
      ...current,
      name: this.name ?? current.name,
      objects: this.updatedObjects,
      bounds: {
        x: bounds.minX === Infinity ? 0 : bounds.minX,
        y: bounds.minY === Infinity ? 0 : bounds.minY,
        width,
        height,
      },
    };

    // Propagate updated width/height to all instances referencing this symbol
    const nextObjects: Record<ObjectId, SceneObject> = { ...doc.objects };
    for (const [id, obj] of Object.entries(doc.objects)) {
      if (obj.type === 'symbol-instance' && obj.symbolId === this.symbolId) {
        nextObjects[id] = {
          ...obj,
          width,
          height,
        };
      }
    }

    return {
      ...doc,
      objects: nextObjects,
      symbols: {
        ...(doc.symbols ?? {}),
        [this.symbolId]: updatedSymbol,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previousDefinition) return doc;

    const prevWidth = this.previousDefinition.bounds.width;
    const prevHeight = this.previousDefinition.bounds.height;

    const nextObjects: Record<ObjectId, SceneObject> = { ...doc.objects };
    for (const [id, obj] of Object.entries(doc.objects)) {
      if (obj.type === 'symbol-instance' && obj.symbolId === this.symbolId) {
        nextObjects[id] = {
          ...obj,
          width: prevWidth,
          height: prevHeight,
        };
      }
    }

    return {
      ...doc,
      objects: nextObjects,
      symbols: {
        ...(doc.symbols ?? {}),
        [this.symbolId]: this.previousDefinition,
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Detaches a symbol instance back into standalone editable objects on canvas.
 */
export class DetachSymbolInstanceCommand implements Command {
  readonly type = 'detach-symbol-instance';
  readonly description = 'Detach symbol instance';
  private previousInstance: SymbolInstanceObject | null = null;
  private createdObjectIds: ObjectId[] = [];

  constructor(private readonly instanceId: ObjectId) {}

  execute(doc: DocumentModel): DocumentModel {
    const instance = doc.objects[this.instanceId];
    if (!instance || instance.type !== 'symbol-instance') return doc;

    const symbol = doc.symbols?.[instance.symbolId];
    if (!symbol) return doc;

    const layerId = instance.layerId;
    const layer = doc.layers[layerId];
    if (!layer) return doc;

    this.previousInstance = instance;

    const nextObjects = { ...doc.objects };
    delete nextObjects[this.instanceId];

    const newIds: ObjectId[] = [];
    const posX = instance.transform.position.x;
    const posY = instance.transform.position.y;

    for (const srcObj of Object.values(symbol.objects)) {
      const newId = generateId();
      newIds.push(newId);
      nextObjects[newId] = {
        ...srcObj,
        id: newId,
        layerId,
        transform: {
          ...srcObj.transform,
          position: {
            x: srcObj.transform.position.x + posX,
            y: srcObj.transform.position.y + posY,
          },
        },
      };
    }
    this.createdObjectIds = newIds;

    const instIdx = layer.objectIds.indexOf(this.instanceId);
    const nextLayerObjectIds = [...layer.objectIds];
    if (instIdx >= 0) {
      nextLayerObjectIds.splice(instIdx, 1, ...newIds);
    } else {
      nextLayerObjectIds.push(...newIds);
    }

    return {
      ...doc,
      objects: nextObjects,
      layers: {
        ...doc.layers,
        [layerId]: {
          ...layer,
          objectIds: nextLayerObjectIds,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previousInstance) return doc;

    const layerId = this.previousInstance.layerId;
    const layer = doc.layers[layerId];
    if (!layer) return doc;

    const nextObjects = { ...doc.objects };
    for (const id of this.createdObjectIds) {
      delete nextObjects[id];
    }
    nextObjects[this.instanceId] = this.previousInstance;

    const firstCreatedIdx = layer.objectIds.indexOf(this.createdObjectIds[0] ?? '');
    const filteredObjectIds = layer.objectIds.filter((id) => !this.createdObjectIds.includes(id));
    if (firstCreatedIdx >= 0) {
      filteredObjectIds.splice(firstCreatedIdx, 0, this.instanceId);
    } else {
      filteredObjectIds.push(this.instanceId);
    }

    return {
      ...doc,
      objects: nextObjects,
      layers: {
        ...doc.layers,
        [layerId]: {
          ...layer,
          objectIds: filteredObjectIds,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}
