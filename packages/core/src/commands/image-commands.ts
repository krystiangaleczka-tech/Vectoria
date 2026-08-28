import type { DocumentModel, ImageCrop, ImageObject, ObjectId, PathObject, LayerId } from '../model/types.js';
import type { Command } from './command.js';
import { generateId } from '@vectoria/shared';

/**
 * Inserts a raster image (PNG, JPG, WebP) into the document with undo support.
 */
export class CreateImageObjectCommand implements Command {
  readonly type = 'create-image-object';
  readonly description = 'Create image object';
  private imageId: ObjectId | null = null;
  private layerId: LayerId | null = null;

  constructor(
    private readonly imageTemplate: ImageObject,
    private readonly targetLayerId?: LayerId,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const layerId = this.targetLayerId ?? doc.activeLayerId ?? doc.layerIds[0];
    if (!layerId || !doc.layers[layerId]) return doc;

    const imageId = this.imageId ?? this.imageTemplate.id ?? generateId();
    this.imageId = imageId;
    this.layerId = layerId;

    const layer = doc.layers[layerId]!;
    const imageObject: ImageObject = {
      ...this.imageTemplate,
      id: imageId,
      layerId,
      name: this.imageTemplate.name || 'Image',
      visible: true,
      locked: false,
      type: 'image',
    };

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [imageId]: imageObject,
      },
      layers: {
        ...doc.layers,
        [layerId]: {
          ...layer,
          objectIds: [...layer.objectIds, imageId],
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.imageId || !this.layerId || !doc.layers[this.layerId]) return doc;

    const layer = doc.layers[this.layerId]!;
    const remainingObjects = Object.fromEntries(
      Object.entries(doc.objects).filter(([id]) => id !== this.imageId),
    );

    return {
      ...doc,
      objects: remainingObjects,
      layers: {
        ...doc.layers,
        [this.layerId]: {
          ...layer,
          objectIds: layer.objectIds.filter((id) => id !== this.imageId),
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Updates visual or source properties (filters, embed/link, dimensions) of an ImageObject.
 */
export class UpdateImagePropertiesCommand implements Command {
  readonly type = 'update-image-properties';
  readonly description = 'Update image properties';
  private previousProperties: Partial<ImageObject> | null = null;

  constructor(
    private readonly objectId: ObjectId,
    private readonly properties: Partial<ImageObject>,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'image' || obj.locked) return doc;

    this.previousProperties = {
      source: obj.source,
      width: obj.width,
      height: obj.height,
      crop: obj.crop,
      filters: obj.filters,
      isMissing: obj.isMissing,
    };

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: {
          ...obj,
          ...this.properties,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'image' || !this.previousProperties) return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: {
          ...obj,
          ...this.previousProperties,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Applies or resets non-destructive rectangular crop on an ImageObject.
 */
export class CropImageCommand implements Command {
  readonly type = 'crop-image';
  readonly description = 'Crop image';
  private previousCrop: ImageCrop | undefined;

  constructor(
    private readonly objectId: ObjectId,
    private readonly nextCrop: ImageCrop | undefined,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'image' || obj.locked) return doc;

    this.previousCrop = obj.crop;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: {
          ...obj,
          crop: this.nextCrop,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'image') return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: {
          ...obj,
          crop: this.previousCrop,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Replaces a raster image with vectorized vector paths (ASSET-016, ASSET-017).
 */
export class TraceImageCommand implements Command {
  readonly type = 'trace-image';
  readonly description = 'Trace image to vector';
  private previousObject: ImageObject | null = null;
  private generatedPathIds: ObjectId[] = [];

  constructor(
    private readonly objectId: ObjectId,
    private readonly generatedPaths: readonly PathObject[],
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.type !== 'image' || obj.locked) return doc;

    this.previousObject = obj;
    const layerId = obj.layerId;
    const layer = doc.layers[layerId];
    if (!layer) return doc;

    const nextObjects = { ...doc.objects };
    delete nextObjects[this.objectId];

    const newIds: ObjectId[] = [];
    for (const path of this.generatedPaths) {
      const id = path.id || generateId();
      newIds.push(id);
      nextObjects[id] = {
        ...path,
        id,
        layerId,
      };
    }
    this.generatedPathIds = newIds;

    const objIndex = layer.objectIds.indexOf(this.objectId);
    const nextLayerObjectIds = [...layer.objectIds];
    if (objIndex >= 0) {
      nextLayerObjectIds.splice(objIndex, 1, ...newIds);
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
    if (!this.previousObject) return doc;
    const layerId = this.previousObject.layerId;
    const layer = doc.layers[layerId];
    if (!layer) return doc;

    const nextObjects = { ...doc.objects };
    for (const id of this.generatedPathIds) {
      delete nextObjects[id];
    }
    nextObjects[this.objectId] = this.previousObject;

    const firstGeneratedIdx = layer.objectIds.indexOf(this.generatedPathIds[0] ?? '');
    const filteredObjectIds = layer.objectIds.filter((id) => !this.generatedPathIds.includes(id));
    if (firstGeneratedIdx >= 0) {
      filteredObjectIds.splice(firstGeneratedIdx, 0, this.objectId);
    } else {
      filteredObjectIds.push(this.objectId);
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
