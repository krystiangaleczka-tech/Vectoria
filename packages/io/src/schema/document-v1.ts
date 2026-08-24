import { z } from 'zod';
import type { DocumentModel } from '@vectoria/core';

export const Vec2Schema = z.object({
  x: z.number().refine(Number.isFinite, { message: 'x must be finite' }),
  y: z.number().refine(Number.isFinite, { message: 'y must be finite' }),
});

export const Transform2DSchema = z.object({
  position: Vec2Schema,
  rotation: z.number().refine(Number.isFinite, { message: 'rotation must be finite' }),
  scale: Vec2Schema.refine(
    (s) => Math.abs(s.x) >= 1e-6 && Math.abs(s.y) >= 1e-6,
    { message: 'scale absolute value must be >= 1e-6' }
  ),
  skew: Vec2Schema.default({ x: 0, y: 0 }),
  pivot: Vec2Schema,
});

export const SolidFillSchema = z.object({
  type: z.literal('solid'),
  color: z.string(),
});

export const NoFillSchema = z.object({
  type: z.literal('none'),
});

export const LinearGradientStopSchema = z.object({
  id: z.string().min(1).optional(),
  offset: z.number().min(0).max(1),
  color: z.string(),
  opacity: z.number().min(0).max(1),
});

export const LinearGradientFillSchema = z.object({
  type: z.literal('linear-gradient'),
  start: Vec2Schema,
  end: Vec2Schema,
  stops: z.array(LinearGradientStopSchema),
});

export const FillStyleSchema = z.discriminatedUnion('type', [
  SolidFillSchema,
  NoFillSchema,
  LinearGradientFillSchema,
]);

export const StrokeStyleSchema = z.object({
  color: z.string(),
  width: z.number().positive(),
  lineCap: z.enum(['butt', 'round', 'square']),
  lineJoin: z.enum(['miter', 'round', 'bevel']),
  miterLimit: z.number().min(1),
  dashArray: z.array(z.number().nonnegative()),
  opacity: z.number().min(0).max(1),
});

export const ObjectStyleSchema = z.object({
  fill: FillStyleSchema,
  stroke: StrokeStyleSchema.nullable(),
  opacity: z.number().min(0).max(1),
  blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay']).default('normal'),
});

export const RectangleObjectSchema = z.object({
  type: z.literal('rectangle'),
  id: z.string().min(1),
  name: z.string(),
  layerId: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  transform: Transform2DSchema,
  style: ObjectStyleSchema,
  width: z.number().positive().finite(),
  height: z.number().positive().finite(),
  cornerRadius: z.union([
    z.number().nonnegative(),
    z.object({
      topLeft: z.number().nonnegative().finite(),
      topRight: z.number().nonnegative().finite(),
      bottomRight: z.number().nonnegative().finite(),
      bottomLeft: z.number().nonnegative().finite(),
    }),
  ]),
});

export const EllipseObjectSchema = z.object({
  type: z.literal('ellipse'),
  id: z.string().min(1),
  name: z.string(),
  layerId: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  transform: Transform2DSchema,
  style: ObjectStyleSchema,
  width: z.number().positive().finite(),
  height: z.number().positive().finite(),
});

export const LineObjectSchema = z.object({
  type: z.literal('line'),
  id: z.string().min(1),
  name: z.string(),
  layerId: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  transform: Transform2DSchema,
  style: ObjectStyleSchema,
  endPoint: Vec2Schema,
});

export const PathNodeSchema = z.object({
  id: z.string().min(1).optional(),
  point: Vec2Schema,
  inHandle: Vec2Schema.nullable(),
  outHandle: Vec2Schema.nullable(),
  kind: z.enum(['corner', 'cusp', 'smooth', 'symmetric', 'auto']),
});

export const PathObjectSchema = z.object({
  type: z.literal('path'),
  id: z.string().min(1),
  name: z.string(),
  layerId: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  transform: Transform2DSchema,
  style: ObjectStyleSchema,
  nodes: z.array(PathNodeSchema),
  closed: z.boolean(),
  compoundChildren: z.array(z.array(PathNodeSchema)).optional(),
  fillRule: z.enum(['nonzero', 'evenodd']).optional(),
});

export const SceneObjectSchema = z.discriminatedUnion('type', [
  RectangleObjectSchema,
  EllipseObjectSchema,
  LineObjectSchema,
  PathObjectSchema,
]);

const PaletteColorSchema = z.object({ id: z.string().min(1), name: z.string(), color: z.string() });
const PaletteSchema = z.object({ id: z.string().min(1), name: z.string(), colors: z.array(PaletteColorSchema), scope: z.enum(['document', 'user', 'saved']) });
const SavedObjectStyleSchema = z.object({ id: z.string().min(1), name: z.string(), style: ObjectStyleSchema });

export const LayerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  visible: z.boolean(),
  locked: z.boolean(),
  opacity: z.number().min(0).max(1).default(1),
  objectIds: z.array(z.string().min(1)),
});

export const ArtboardSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  x: z.number().refine(Number.isFinite),
  y: z.number().refine(Number.isFinite),
  width: z.number().positive().finite(),
  height: z.number().positive().finite(),
  background: z.union([
    z.object({ type: z.literal('transparent') }),
    z.object({ type: z.literal('color'), color: z.string() }),
    z.string().nullable(), // legacy v1 payloads
  ]).transform((background) => {
    if (background === null || background === 'transparent') return { type: 'transparent' as const };
    if (typeof background === 'string') return { type: 'color' as const, color: background };
    return background;
  }),
  visible: z.boolean().default(true),
  frame: z.object({ x: z.number().finite(), y: z.number().finite(), width: z.number().positive().finite(), height: z.number().positive().finite() }).optional(),
});

export const DocumentV1Schema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string(),
  unit: z.enum(['px', 'mm', 'cm', 'in']),
  artboards: z.record(ArtboardSchema),
  artboardIds: z.array(z.string().min(1)),
  activeArtboardId: z.string().min(1),
  layers: z.record(LayerSchema),
  layerIds: z.array(z.string().min(1)),
  activeLayerId: z.string().min(1),
  objects: z.record(SceneObjectSchema),
  maskGroups: z.record(z.object({ id: z.string().min(1), mode: z.enum(['clip', 'opacity']), maskId: z.string().min(1), contentIds: z.array(z.string().min(1)), opacityMode: z.enum(['alpha', 'luminance']).optional() })).optional(),
  guides: z.array(z.object({ id: z.string().min(1), axis: z.enum(['horizontal', 'vertical']), position: z.number().finite(), visible: z.boolean(), locked: z.boolean() })).default([]),
  grid: z.object({ visible: z.boolean(), size: z.number().positive().finite(), subdivisions: z.number().int().min(1) }).default({ visible: true, size: 10, subdivisions: 1 }),
  snap: z.object({ enabled: z.boolean(), tolerancePx: z.number().nonnegative().finite(), sources: z.record(z.boolean()) }).default({ enabled: false, tolerancePx: 8, sources: { grid: true, guide: true, node: true, edge: true, center: true, intersection: true, pixel: false } }),
  palettes: z.array(PaletteSchema).default([]),
  objectStyles: z.array(SavedObjectStyleSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DocumentV1DTO = z.infer<typeof DocumentV1Schema>;

export const PersistedDocumentSchema = z.object({
  app: z.literal('vectoria'),
  schemaVersion: z.number().int().positive(),
  document: z.unknown(),
  revision: z.number().int().nonnegative(),
  savedAt: z.string(),
});

export interface PersistedDocument {
  readonly app: 'vectoria';
  readonly schemaVersion: number;
  readonly document: DocumentModel;
  readonly revision: number;
  readonly savedAt: string;
}

const DEFAULT_SNAP_SOURCES = { grid: true, guide: true, node: true, edge: true, center: true, intersection: true, pixel: false } as const;

/**
 * Validates and parses raw stored document JSON, migrating if needed.
 */
export function parseAndMigrateDocument(raw: unknown): DocumentModel {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid document payload: expected object');
  }

  const rawRecord = raw as Record<string, unknown>;
  if (rawRecord.app === 'vectoria' && 'document' in rawRecord) {
    return parseAndMigrateDocument(rawRecord.document);
  }
  const schemaVersion = rawRecord['schemaVersion'];

  if (schemaVersion === 1) {
    const parsed = DocumentV1Schema.parse(raw);
    const artboards = Object.fromEntries(Object.entries(parsed.artboards).map(([id, artboard]) => [id, {
      ...artboard,
      frame: artboard.frame ?? { x: artboard.x, y: artboard.y, width: artboard.width, height: artboard.height },
    }]));
    const objects = Object.fromEntries(Object.entries(parsed.objects).map(([id, object]) => [id, object.type === 'path'
      ? { ...object, nodes: object.nodes.map((node, index) => ({ ...node, id: node.id ?? `${object.id}-node-${index + 1}` })) }
      : object]));
    const normalizedObjects = Object.fromEntries(Object.entries(objects).map(([id, object]) => [id, { ...object, style: { ...object.style, blendMode: object.style.blendMode ?? 'normal' } }]));
    return { ...parsed, objects: normalizedObjects, artboards, snap: { ...parsed.snap, sources: { ...DEFAULT_SNAP_SOURCES, ...parsed.snap.sources } }, palettes: parsed.palettes ?? [], objectStyles: parsed.objectStyles ?? [] } as unknown as DocumentModel;
  }

  throw new Error(`Unsupported schema version: ${String(schemaVersion)}`);
}

/**
 * Serializes DocumentModel to string/JSON.
 */
export function serializeDocument(document: DocumentModel): string {
  return JSON.stringify(document);
}
