import { generateId } from '@vectoria/shared';
import type {
  DocumentModel,
  DocumentUnit,
  Artboard,
  Layer,
  ObjectStyle,
  StrokeStyle,
} from './types.js';
import { CURRENT_SCHEMA_VERSION } from './types.js';

export interface CreateDocumentOptions {
  name?: string;
  width?: number;
  height?: number;
  unit?: DocumentUnit;
}

/**
 * Default stroke style used for new objects.
 */
export const defaultStroke: StrokeStyle = {
  color: '#000000',
  width: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  dashArray: [],
  opacity: 1,
};

/**
 * Default object style for new objects.
 */
export const defaultObjectStyle: ObjectStyle = {
  fill: { type: 'solid', color: '#cccccc' },
  stroke: null,
  opacity: 1,
};

/**
 * Create a default document with one artboard and one empty layer.
 */
export function createDefaultDocument(options: CreateDocumentOptions = {}): DocumentModel {
  const {
    name = 'Untitled',
    width = 1920,
    height = 1080,
    unit = 'px',
  } = options;

  const docId = generateId();
  const artboardId = generateId();
  const layerId = generateId();
  const now = new Date().toISOString();

  const artboard: Artboard = {
    id: artboardId,
    name: 'Artboard 1',
    x: 0,
    y: 0,
    width,
    height,
    background: '#ffffff',
    visible: true,
  };

  const layer: Layer = {
    id: layerId,
    name: 'Layer 1',
    visible: true,
    locked: false,
    opacity: 1,
    objectIds: [],
  };

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: docId,
    name,
    unit,
    artboards: { [artboardId]: artboard },
    artboardIds: [artboardId],
    activeArtboardId: artboardId,
    layers: { [layerId]: layer },
    layerIds: [layerId],
    activeLayerId: layerId,
    objects: {},
    createdAt: now,
    updatedAt: now,
  };
}
