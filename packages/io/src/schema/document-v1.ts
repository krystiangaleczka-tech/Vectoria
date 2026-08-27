import { z } from 'zod';
import type { DocumentModel } from '@vectoria/core';
import { normalizeColor } from '@vectoria/shared';

export const DOCUMENT_LIMITS = {
  maxObjects: 100_000,
  maxLayers: 10_000,
  maxArtboards: 1_000,
  maxGuides: 10_000,
  maxPathNodes: 1_000_000,
  maxPalettes: 256,
  maxPaletteEntries: 2048,
} as const;

const ColorSchema = z.string().refine((value) => normalizeColor(value) !== null, { message: 'color must be a supported finite color value' });

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
  color: ColorSchema,
});

export const NoFillSchema = z.object({
  type: z.literal('none'),
});

export const LinearGradientStopSchema = z.object({
  id: z.string().min(1).optional(),
  offset: z.number().min(0).max(1),
  color: ColorSchema,
  opacity: z.number().min(0).max(1),
});

export const LinearGradientFillSchema = z.object({
  type: z.literal('linear-gradient'),
  start: Vec2Schema,
  end: Vec2Schema,
  stops: z.array(LinearGradientStopSchema).min(2),
});

export const RadialGradientFillSchema = z.object({
  type: z.literal('radial-gradient'),
  center: Vec2Schema,
  radius: z.number().positive().finite(),
  stops: z.array(LinearGradientStopSchema).min(2),
});

export const AngularGradientFillSchema = z.object({
  type: z.literal('angular-gradient'),
  center: Vec2Schema,
  angle: z.number().finite(),
  stops: z.array(LinearGradientStopSchema).min(2),
});

export const PatternFillSchema = z.object({
  type: z.literal('pattern'),
  kind: z.enum(['dots', 'grid', 'hatch']),
  foreground: ColorSchema,
  background: ColorSchema,
  size: z.number().positive().finite(),
});

export const FillStyleSchema = z.discriminatedUnion('type', [
  SolidFillSchema,
  NoFillSchema,
  LinearGradientFillSchema,
  RadialGradientFillSchema,
  AngularGradientFillSchema,
  PatternFillSchema,
]);

export const StrokeStyleSchema = z.object({
  color: ColorSchema,
  width: z.number().positive(),
  align: z.enum(['center', 'inside', 'outside']).default('center'),
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

export const LockedAttributeSchema = z.enum(['position', 'size', 'rotation', 'style', 'content']);

export const RectangleObjectSchema = z.object({
  type: z.literal('rectangle'),
  id: z.string().min(1),
  name: z.string(),
  layerId: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  lockedAttributes: z.array(LockedAttributeSchema).optional(),
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
  lockedAttributes: z.array(LockedAttributeSchema).optional(),
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
  lockedAttributes: z.array(LockedAttributeSchema).optional(),
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
  lockedAttributes: z.array(LockedAttributeSchema).optional(),
  transform: Transform2DSchema,
  style: ObjectStyleSchema,
  nodes: z.array(PathNodeSchema).max(DOCUMENT_LIMITS.maxPathNodes),
  closed: z.boolean(),
  compoundChildren: z.array(z.array(PathNodeSchema)).optional(),
  fillRule: z.enum(['nonzero', 'evenodd']).optional(),
});

export const GroupObjectSchema = z.object({
  type: z.literal('group'),
  id: z.string().min(1),
  name: z.string(),
  layerId: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  lockedAttributes: z.array(LockedAttributeSchema).optional(),
  transform: Transform2DSchema,
  style: ObjectStyleSchema,
  childIds: z.array(z.string().min(1)),
});

export const TextRunSchema = z.object({
  start: z.number().int().nonnegative(),
  length: z.number().int().nonnegative(),
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().finite().optional(),
  fontWeight: z.union([z.number(), z.string()]).optional(),
  fontStyle: z.enum(['normal', 'italic', 'oblique']).optional(),
  baselineShift: z.number().finite().optional(),
  fill: FillStyleSchema.optional(),
  isPlaceholder: z.boolean().optional(),
});

export const TextObjectSchema = z.object({
  type: z.literal('text'),
  id: z.string().min(1),
  name: z.string(),
  layerId: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  lockedAttributes: z.array(LockedAttributeSchema).optional(),
  transform: Transform2DSchema,
  style: ObjectStyleSchema,
  text: z.string(),
  fontFamily: z.string(),
  fontSize: z.number().positive().finite(),
  fontWeight: z.union([z.number(), z.string()]),
  fontStyle: z.enum(['normal', 'italic', 'oblique']),
  letterSpacing: z.number().finite(),
  lineHeight: z.number().positive().finite(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']),
  kerning: z.boolean(),
  pathId: z.string().optional(),
  runs: z.array(TextRunSchema).optional(),
  variableAxes: z.record(z.number().finite()).optional(),
});

export const TextFrameObjectSchema = z.object({
  type: z.literal('text-frame'),
  id: z.string().min(1),
  name: z.string(),
  layerId: z.string().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  lockedAttributes: z.array(LockedAttributeSchema).optional(),
  transform: Transform2DSchema,
  style: ObjectStyleSchema,
  text: z.string(),
  width: z.number().positive().finite(),
  height: z.number().positive().finite(),
  fontFamily: z.string(),
  fontSize: z.number().positive().finite(),
  fontWeight: z.union([z.number(), z.string()]),
  fontStyle: z.enum(['normal', 'italic', 'oblique']),
  letterSpacing: z.number().finite(),
  lineHeight: z.number().positive().finite(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']),
  kerning: z.boolean(),
  columnCount: z.number().int().min(1).max(8),
  columnGutter: z.number().nonnegative().finite(),
  paragraphSpacing: z.number().nonnegative().finite(),
  indent: z.number().nonnegative().finite(),
  listType: z.enum(['none', 'bullet', 'numbered']).optional(),
  runs: z.array(TextRunSchema).optional(),
  variableAxes: z.record(z.number().finite()).optional(),
});

export const SceneObjectSchema = z.discriminatedUnion('type', [
  RectangleObjectSchema,
  EllipseObjectSchema,
  LineObjectSchema,
  PathObjectSchema,
  GroupObjectSchema,
  TextObjectSchema,
  TextFrameObjectSchema,
]);

export const PaletteColorSchema = z.object({ id: z.string().min(1), name: z.string(), color: ColorSchema });
export const PaletteSwatchSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string().min(1), name: z.string(), type: z.literal('solid'), color: ColorSchema }),
  z.object({ id: z.string().min(1), name: z.string(), type: z.literal('gradient'), fill: z.union([LinearGradientFillSchema, RadialGradientFillSchema, AngularGradientFillSchema]) }),
  z.object({ id: z.string().min(1), name: z.string(), type: z.literal('pattern'), fill: PatternFillSchema }),
]);
export const ColorPaletteSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  colors: z.array(PaletteColorSchema).max(DOCUMENT_LIMITS.maxPaletteEntries),
  swatches: z.array(PaletteSwatchSchema).max(DOCUMENT_LIMITS.maxPaletteEntries).optional(),
  scope: z.enum(['document', 'user', 'saved']),
}).superRefine((palette, context) => {
  const ids = new Set<string>();
  for (const entry of [...palette.colors, ...(palette.swatches ?? [])]) {
    if (ids.has(entry.id)) context.addIssue({ code: z.ZodIssueCode.custom, message: `palette entry ID '${entry.id}' must be unique` });
    ids.add(entry.id);
  }
});
const SavedObjectStyleSchema = z.object({ id: z.string().min(1), name: z.string(), style: ObjectStyleSchema });

export const LayerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  visible: z.boolean(),
  locked: z.boolean(),
  opacity: z.number().min(0).max(1).default(1),
  objectIds: z.array(z.string().min(1)),
  labelColor: z.string().optional(),
  isTemplate: z.boolean().optional(),
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
  orientation: z.enum(['portrait', 'landscape']).optional(),
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
  palettes: z.array(ColorPaletteSchema).max(DOCUMENT_LIMITS.maxPalettes).default([]),
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
  status: z.enum(['pending', 'saving', 'saved', 'error', 'recovery']).optional(),
});

export interface PersistedDocument {
  readonly app: 'vectoria';
  readonly schemaVersion: number;
  readonly document: DocumentModel;
  readonly revision: number;
  readonly savedAt: string;
  readonly status?: 'pending' | 'saving' | 'saved' | 'error' | 'recovery';
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

  assertDocumentLimits(rawRecord);

  if (schemaVersion === 1) {
    const parsed = DocumentV1Schema.parse(raw);
    const artboards = Object.fromEntries(Object.entries(parsed.artboards).map(([id, artboard]) => [id, {
      ...artboard,
      frame: artboard.frame ?? { x: artboard.x, y: artboard.y, width: artboard.width, height: artboard.height },
    }]));
    const objects = Object.fromEntries(Object.entries(parsed.objects).map(([id, object]) => [id, object.type === 'path'
      ? { ...object, nodes: object.nodes.map((node, index) => ({ ...node, id: node.id ?? `${object.id}-node-${index + 1}` })) }
      : object]));
    const normalizedObjects = Object.fromEntries(Object.entries(objects).map(([id, object]) => [id, { ...object, style: { ...object.style, blendMode: object.style.blendMode ?? 'normal', stroke: object.style.stroke ? { ...object.style.stroke, align: object.style.stroke.align ?? 'center' } : null } }]));
    return { ...parsed, objects: normalizedObjects, artboards, snap: { ...parsed.snap, sources: { ...DEFAULT_SNAP_SOURCES, ...parsed.snap.sources } }, palettes: parsed.palettes ?? [], objectStyles: parsed.objectStyles ?? [] } as unknown as DocumentModel;
  }

  throw new Error(`Unsupported schema version: ${String(schemaVersion)}`);
}

function assertDocumentLimits(raw: Record<string, unknown>): void {
  const count = (value: unknown): number => value && typeof value === 'object' ? Object.keys(value).length : 0;
  if (count(raw.objects) > DOCUMENT_LIMITS.maxObjects) throw new Error(`Document exceeds ${DOCUMENT_LIMITS.maxObjects} object limit`);
  if (count(raw.layers) > DOCUMENT_LIMITS.maxLayers) throw new Error(`Document exceeds ${DOCUMENT_LIMITS.maxLayers} layer limit`);
  if (count(raw.artboards) > DOCUMENT_LIMITS.maxArtboards) throw new Error(`Document exceeds ${DOCUMENT_LIMITS.maxArtboards} artboard limit`);
  if (Array.isArray(raw.guides) && raw.guides.length > DOCUMENT_LIMITS.maxGuides) throw new Error(`Document exceeds ${DOCUMENT_LIMITS.maxGuides} guide limit`);
  
  const objects = raw.objects && typeof raw.objects === 'object' ? Object.values(raw.objects) : [];
  let pathNodes = 0;
  
  // Track nesting depth
  const checkNesting = (objectId: string, depth: number, visited: Set<string> = new Set()) => {
    if (depth > 50) throw new Error('Document exceeds maximum group nesting depth of 50');
    if (visited.has(objectId)) throw new Error('Cycle detected in group hierarchy');
    visited.add(objectId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = (raw.objects as Record<string, any>)[objectId];
    if (obj && obj.type === 'group' && Array.isArray(obj.childIds)) {
      for (const childId of obj.childIds) {
        checkNesting(childId, depth + 1, new Set(visited));
      }
    }
  };

  for (const object of objects) {
    if (object && typeof object === 'object') {
      const rec = object as Record<string, unknown>;
      if (rec.type === 'path' && Array.isArray(rec.nodes)) {
        const nodesLength = rec.nodes.length;
        if (nodesLength > 100_000) throw new Error('Individual path exceeds maximum complexity of 100,000 nodes');
        pathNodes += nodesLength;
      }
      if (rec.type === 'group' && Array.isArray(rec.childIds)) {
        checkNesting(String(rec.id), 1);
      }
    }
  }
  
  if (pathNodes > DOCUMENT_LIMITS.maxPathNodes) throw new Error(`Document exceeds ${DOCUMENT_LIMITS.maxPathNodes} path node limit`);
}

/**
 * Serializes DocumentModel to string/JSON.
 */
export function serializeDocument(document: DocumentModel): string {
  return JSON.stringify(document);
}
