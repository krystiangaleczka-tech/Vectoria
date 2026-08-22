import { generateId, type Vec2 } from '@vectoria/shared';
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

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || !Number.isFinite(cornerRadius)) {
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

// ─── Artboard and layer commands ─────────────────────────────────────────────

export class UpdateArtboardCommand implements Command {
  readonly type = 'UpdateArtboard';
  readonly description = 'Change artboard';
  private previous: Partial<Pick<import('../model/types.js').Artboard, 'name' | 'width' | 'height' | 'background' | 'visible' | 'frame'>> | null = null;

  constructor(
    private readonly artboardId: ArtboardId,
    private readonly patch: Partial<Pick<import('../model/types.js').Artboard, 'name' | 'width' | 'height' | 'background' | 'visible' | 'frame'>>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const artboard = doc.artboards[this.artboardId];
    if (!artboard) return doc;
    const width = this.patch.width ?? artboard.width;
    const height = this.patch.height ?? artboard.height;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return doc;
    this.previous = { name: artboard.name, width: artboard.width, height: artboard.height, background: artboard.background, visible: artboard.visible, frame: artboard.frame };
    return { ...doc, artboards: { ...doc.artboards, [this.artboardId]: { ...artboard, ...this.patch, width, height, frame: { x: artboard.x, y: artboard.y, width, height } } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const artboard = doc.artboards[this.artboardId];
    return this.previous && artboard ? { ...doc, artboards: { ...doc.artboards, [this.artboardId]: { ...artboard, ...this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
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
    this.previous = { name: object.name, visible: object.visible, locked: object.locked };
    return { ...doc, objects: { ...doc.objects, [this.objectId]: { ...object, ...this.patch } }, updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    const object = doc.objects[this.objectId];
    return this.previous && object ? { ...doc, objects: { ...doc.objects, [this.objectId]: { ...object, ...this.previous } }, updatedAt: new Date().toISOString() } : doc;
  }
}
