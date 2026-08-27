import { generateId, unitToPx } from '@vectoria/shared';
import type {
  DocumentModel,
  DocumentUnit,
  Artboard,
  Layer,
  ObjectStyle,
  StrokeStyle,
  CornerRadii,
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
  align: 'center',
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
  blendMode: 'normal',
};

export const defaultCornerRadii: CornerRadii = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };

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
  const paletteId = generateId();
  const now = new Date().toISOString();

  const artboard: Artboard = {
    id: artboardId,
    name: 'Artboard 1',
    x: 0,
    y: 0,
    width: unitToPx(width, unit),
    height: unitToPx(height, unit),
    background: { type: 'color', color: '#ffffff' },
    visible: true,
    orientation: height >= width ? 'portrait' : 'landscape',
    frame: { x: 0, y: 0, width: unitToPx(width, unit), height: unitToPx(height, unit) },
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
    guides: [],
    grid: { visible: true, size: 10, subdivisions: 1 },
    snap: { enabled: false, tolerancePx: 8, sources: { grid: true, guide: true, node: true, edge: true, center: true, intersection: true, pixel: false } },
    palettes: [{ id: paletteId, name: 'Document colors', scope: 'document', colors: [
      { id: generateId(), name: 'Ink', color: '#1b1b19' },
      { id: generateId(), name: 'Paper', color: '#ffffff' },
      { id: generateId(), name: 'Accent', color: '#5caeff' },
      { id: generateId(), name: 'Warning', color: '#f0bd58' },
    ] }],
    objectStyles: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const defaultTextStyle: ObjectStyle = {
  fill: { type: 'solid', color: '#1b1b19' },
  stroke: null,
  opacity: 1,
  blendMode: 'normal',
};

export function createTextObject(
  id: string,
  layerId: string,
  text: string,
  options: Partial<import('./types.js').TextObject> = {},
): import('./types.js').TextObject {
  return {
    id,
    type: 'text',
    name: options.name || 'Text',
    layerId,
    visible: options.visible !== false,
    locked: Boolean(options.locked),
    transform: options.transform || {
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 },
      skew: { x: 0, y: 0 },
      pivot: { x: 0, y: 0 },
    },
    style: options.style || defaultTextStyle,
    text,
    fontFamily: options.fontFamily || 'Inter, sans-serif',
    fontSize: options.fontSize && options.fontSize > 0 ? options.fontSize : 24,
    fontWeight: options.fontWeight ?? 400,
    fontStyle: options.fontStyle ?? 'normal',
    letterSpacing: options.letterSpacing ?? 0,
    lineHeight: options.lineHeight && options.lineHeight > 0 ? options.lineHeight : 1.2,
    textAlign: options.textAlign ?? 'left',
    kerning: options.kerning !== false,
    pathId: options.pathId,
    runs: options.runs,
    variableAxes: options.variableAxes,
  };
}

export function createTextFrameObject(
  id: string,
  layerId: string,
  text: string,
  width: number,
  height: number,
  options: Partial<import('./types.js').TextFrameObject> = {},
): import('./types.js').TextFrameObject {
  return {
    id,
    type: 'text-frame',
    name: options.name || 'Text Frame',
    layerId,
    visible: options.visible !== false,
    locked: Boolean(options.locked),
    transform: options.transform || {
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 },
      skew: { x: 0, y: 0 },
      pivot: { x: 0, y: 0 },
    },
    style: options.style || defaultTextStyle,
    text,
    width: Math.max(10, width),
    height: Math.max(10, height),
    fontFamily: options.fontFamily || 'Inter, sans-serif',
    fontSize: options.fontSize && options.fontSize > 0 ? options.fontSize : 16,
    fontWeight: options.fontWeight ?? 400,
    fontStyle: options.fontStyle ?? 'normal',
    letterSpacing: options.letterSpacing ?? 0,
    lineHeight: options.lineHeight && options.lineHeight > 0 ? options.lineHeight : 1.4,
    textAlign: options.textAlign ?? 'left',
    kerning: options.kerning !== false,
    columnCount: Math.max(1, Math.min(8, options.columnCount ?? 1)),
    columnGutter: Math.max(0, options.columnGutter ?? 16),
    paragraphSpacing: Math.max(0, options.paragraphSpacing ?? 8),
    indent: Math.max(0, options.indent ?? 0),
    listType: options.listType ?? 'none',
    runs: options.runs,
    variableAxes: options.variableAxes,
  };
}
