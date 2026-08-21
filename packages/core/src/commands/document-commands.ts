import type { Vec2 } from '@vectoria/shared';
import type { Command } from './command.js';
import type {
  DocumentModel,
  SceneObject,
  ObjectId,
  LayerId,
  ObjectStyle,
  Transform2D,
  PathNode,
} from '../model/types.js';

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
    if (!layer) return doc;

    const newObjectIds = [...layer.objectIds];

    for (const obj of this.objects) {
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
    private readonly objectIds: readonly ObjectId[],
    private readonly newTransforms: ReadonlyMap<ObjectId, Transform2D>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };

    for (const objectId of this.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj) continue;

      this.previousTransforms.set(objectId, obj.transform);

      const newTransform = this.newTransforms.get(objectId);
      if (!newTransform) continue;

      newObjects[objectId] = { ...obj, transform: newTransform };
    }

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
    } else {
      this.description = 'Change style';
    }
  }

  execute(doc: DocumentModel): DocumentModel {
    const newObjects = { ...doc.objects };

    for (const objectId of this.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj) continue;

      this.previousStyles.set(objectId, obj.style);

      newObjects[objectId] = {
        ...obj,
        style: { ...obj.style, ...this.stylePatch },
      };
    }

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

// ─── SetObjectGeometryCommand (deprecated — use type-specific commands) ──────

/**
 * @deprecated Use SetRectangleGeometryCommand, SetEllipseGeometryCommand,
 * SetLineGeometryCommand, or SetPathGeometryCommand instead.
 * This command uses unsafe `Record<string, unknown>` typing and will be
 * removed after all call sites are migrated.
 */
export class SetObjectGeometryCommand implements Command {
  readonly type = 'SetObjectGeometry';
  readonly description = 'Resize';
  private previousGeometry: Map<ObjectId, Record<string, unknown>> = new Map();

  constructor(
    private readonly objectId: ObjectId,
    private readonly geometryPatch: Record<string, unknown>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj) return doc;

    // Save previous geometry
    const prev: Record<string, unknown> = {};
    for (const key of Object.keys(this.geometryPatch)) {
      prev[key] = (obj as unknown as Record<string, unknown>)[key];
    }
    this.previousGeometry.set(this.objectId, prev);

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, ...this.geometryPatch },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj) return doc;

    const prev = this.previousGeometry.get(this.objectId);
    if (!prev) return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: { ...obj, ...prev },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

// ─── SetRectangleGeometryCommand ─────────────────────────────────────────────

export class SetRectangleGeometryCommand implements Command {
  readonly type = 'SetRectangleGeometry';
  readonly description: string;
  private previous: { width: number; height: number; cornerRadius: number } | null = null;

  constructor(
    private readonly objectId: ObjectId,
    private readonly patch: Readonly<{
      width?: number;
      height?: number;
      cornerRadius?: number;
    }>,
  ) {
    this.description =
      patch.cornerRadius !== undefined && patch.width === undefined && patch.height === undefined
        ? 'Change corner radius'
        : 'Resize';
  }

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'rectangle') return doc;

    const width = this.patch.width ?? obj.width;
    const height = this.patch.height ?? obj.height;
    const cornerRadius = Math.min(
      Math.max(0, this.patch.cornerRadius ?? obj.cornerRadius),
      width / 2,
      height / 2,
    );

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
    if (!obj || obj.type !== 'ellipse') return doc;

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
    if (!obj || obj.type !== 'line') return doc;

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
    if (!obj || obj.type !== 'path') return doc;

    const nodes = this.patch.nodes ?? obj.nodes;
    const closed = this.patch.closed ?? obj.closed;

    // Validate path nodes: open path needs >= 2, closed needs >= 3
    const minNodes = closed ? 3 : 2;
    if (nodes.length < minNodes) {
      return doc;
    }

    // Check all node coordinates are finite
    for (const node of nodes) {
      const points = [node.point, node.inHandle, node.outHandle].filter(Boolean) as Vec2[];
      if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
        return doc;
      }
    }

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
