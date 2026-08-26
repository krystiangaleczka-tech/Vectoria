import type { Vec2, Unit } from '@vectoria/shared';

// ─── ID Types ─────────────────────────────────────────────────────────────────

export type DocumentId = string;
export type ArtboardId = string;
export type LayerId = string;
export type ObjectId = string;

// ─── Units ────────────────────────────────────────────────────────────────────

export type DocumentUnit = Unit;

export type ArtboardBackground =
  | { readonly type: 'transparent' }
  | { readonly type: 'color'; readonly color: string };

// ─── Schema Version ───────────────────────────────────────────────────────────

export const CURRENT_SCHEMA_VERSION = 1 as const;

// ─── Transform ────────────────────────────────────────────────────────────────

export interface Transform2D {
  /** Position of pivot in world space. */
  readonly position: Vec2;

  /** Rotation in radians. */
  readonly rotation: number;

  /**
   * Scale factors. Negative = flip.
   * abs(scale.x) >= 1e-6, abs(scale.y) >= 1e-6
   */
  readonly scale: Vec2;

  /** Horizontal and vertical skew angles in radians. */
  readonly skew?: Vec2;

  /** Pivot point in local object space. */
  readonly pivot: Vec2;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

export interface SolidFill {
  readonly type: 'solid';
  readonly color: string;
}

export interface NoFill {
  readonly type: 'none';
}

export interface LinearGradientStop {
  readonly id?: string;
  readonly offset: number;
  readonly color: string;
  readonly opacity: number;
}

export interface LinearGradientFill {
  readonly type: 'linear-gradient';
  readonly start: Vec2;
  readonly end: Vec2;
  readonly stops: readonly LinearGradientStop[];
}

export interface RadialGradientFill {
  readonly type: 'radial-gradient';
  readonly center: Vec2;
  readonly radius: number;
  readonly stops: readonly LinearGradientStop[];
}

export interface AngularGradientFill {
  readonly type: 'angular-gradient';
  readonly center: Vec2;
  readonly angle: number;
  readonly stops: readonly LinearGradientStop[];
}

export interface PatternFill {
  readonly type: 'pattern';
  readonly kind: 'dots' | 'grid' | 'hatch';
  readonly foreground: string;
  readonly background: string;
  readonly size: number;
}

export type FillStyle = SolidFill | NoFill | LinearGradientFill | RadialGradientFill | AngularGradientFill | PatternFill;

export interface ArrowheadStyle {
  readonly type: 'arrow' | 'triangle' | 'circle' | 'square';
  readonly size: number;
}

export interface StrokeStyle {
  readonly color: string;
  readonly width: number;
  /** Defaults to centered stroke for legacy schema-v1 values. */
  readonly align?: 'center' | 'inside' | 'outside';
  readonly lineCap: 'butt' | 'round' | 'square';
  readonly lineJoin: 'miter' | 'round' | 'bevel';
  readonly miterLimit: number;
  readonly dashArray: readonly number[];
  readonly opacity: number;
  readonly markerStart?: ArrowheadStyle;
  readonly markerEnd?: ArrowheadStyle;
}

export interface ObjectStyle {
  readonly fill: FillStyle;
  readonly stroke: StrokeStyle | null;

  /** Single canonical opacity for the object: 0–1. */
  readonly opacity: number;
  readonly blendMode?: BlendMode;
}

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';

export interface PaletteColor {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export type PaletteSwatch =
  | { readonly id: string; readonly name: string; readonly type: 'solid'; readonly color: string }
  | { readonly id: string; readonly name: string; readonly type: 'gradient'; readonly fill: LinearGradientFill | RadialGradientFill | AngularGradientFill }
  | { readonly id: string; readonly name: string; readonly type: 'pattern'; readonly fill: PatternFill };

export interface ColorPalette {
  readonly id: string;
  readonly name: string;
  readonly colors: readonly PaletteColor[];
  readonly swatches?: readonly PaletteSwatch[];
  readonly scope: 'document' | 'user' | 'saved';
}

export interface SavedObjectStyle {
  readonly id: string;
  readonly name: string;
  readonly style: ObjectStyle;
}

export interface CornerRadii {
  readonly topLeft: number;
  readonly topRight: number;
  readonly bottomRight: number;
  readonly bottomLeft: number;
}

// ─── Scene Objects ────────────────────────────────────────────────────────────

export interface SceneObjectBase {
  readonly id: ObjectId;
  readonly name: string;
  readonly layerId: LayerId;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly transform: Transform2D;
  readonly style: ObjectStyle;
}

export interface RectangleObject extends SceneObjectBase {
  readonly type: 'rectangle';
  readonly width: number;
  readonly height: number;
  /** Number is accepted for schema-v1 documents; new objects use four radii. */
  readonly cornerRadius: number | CornerRadii;
}

export interface EllipseObject extends SceneObjectBase {
  readonly type: 'ellipse';
  readonly width: number;
  readonly height: number;
}

export interface LineObject extends SceneObjectBase {
  readonly type: 'line';
  readonly endPoint: Vec2;
}

export interface PathNode {
  /** Stable node identity used by node editing and persisted selection. */
  readonly id?: string;
  readonly point: Vec2;
  readonly inHandle: Vec2 | null;
  readonly outHandle: Vec2 | null;
  readonly kind: 'corner' | 'cusp' | 'smooth' | 'symmetric' | 'auto';
}

export interface PathObject extends SceneObjectBase {
  readonly type: 'path';
  readonly nodes: readonly PathNode[];
  readonly closed: boolean;
  /** Optional normalized width profile for pressure-sensitive brush strokes. */
  readonly widthProfile?: readonly WidthPoint[];
  readonly compoundChildren?: readonly (readonly PathNode[])[];
  readonly fillRule?: 'nonzero' | 'evenodd';
}

export interface GroupObject extends SceneObjectBase {
  readonly type: 'group';
  readonly childIds: readonly ObjectId[];
}

export interface WidthPoint {
  readonly t: number;
  readonly width: number;
}

export interface PolygonObject extends SceneObjectBase {
  readonly type: 'polygon';
  readonly sides: number;
  readonly radius: number;
}

export interface StarObject extends SceneObjectBase {
  readonly type: 'star';
  readonly points: number;
  readonly outerRadius: number;
  readonly innerRadius: number;
}

export interface ArcObject extends SceneObjectBase {
  readonly type: 'arc';
  readonly radiusX: number;
  readonly radiusY: number;
  readonly startAngle: number;
  readonly endAngle: number;
  readonly closed: boolean;
}

export interface PieObject extends SceneObjectBase {
  readonly type: 'pie';
  readonly radiusX: number;
  readonly radiusY: number;
  readonly startAngle: number;
  readonly endAngle: number;
}

export interface RingObject extends SceneObjectBase {
  readonly type: 'ring';
  readonly outerRadius: number;
  readonly innerRadius: number;
}

export interface SpiralObject extends SceneObjectBase {
  readonly type: 'spiral';
  readonly turns: number;
  readonly decay: number;
  readonly direction: 'cw' | 'ccw';
}

export interface CalloutObject extends SceneObjectBase {
  readonly type: 'callout';
  readonly width: number;
  readonly height: number;
  readonly cornerRadius: number;
  readonly tailTip: Vec2;
  readonly tailBaseWidth: number;
}

export interface PolylineObject extends SceneObjectBase {
  readonly type: 'polyline';
  readonly points: readonly Vec2[];
}

export type SceneObject =
  | RectangleObject
  | EllipseObject
  | LineObject
  | PathObject
  | GroupObject
  | PolygonObject
  | StarObject
  | ArcObject
  | PieObject
  | RingObject
  | SpiralObject
  | CalloutObject
  | PolylineObject;

// Selection stays multi-object capable even while the MVP UI exposes one
// active editing context at a time.
export interface SelectionState {
  objectIds: ObjectId[];
  nodeIds: string[];
  readonly mode: 'object' | 'node';
}

// ─── Layer ────────────────────────────────────────────────────────────────────

export interface Layer {
  readonly id: LayerId;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly opacity: number;

  /** Index 0 = bottom-most within this layer. */
  readonly objectIds: readonly ObjectId[];
}

// ─── Artboard ─────────────────────────────────────────────────────────────────

export interface Artboard {
  readonly id: ArtboardId;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly background: ArtboardBackground;
  readonly visible: boolean;
  readonly orientation?: 'portrait' | 'landscape';
  /** Preferred world-space frame. x/y remain as legacy aliases during schema v1. */
  readonly frame?: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

export interface Guide {
  readonly id: string;
  readonly axis: 'horizontal' | 'vertical';
  readonly position: number;
  readonly visible: boolean;
  readonly locked: boolean;
}

export interface GridSettings {
  readonly visible: boolean;
  readonly size: number;
  readonly subdivisions: number;
}

export type SnapSource = 'grid' | 'guide' | 'node' | 'edge' | 'center' | 'intersection' | 'pixel';

export interface SnapSettings {
  readonly enabled: boolean;
  readonly tolerancePx: number;
  readonly sources: Readonly<Record<SnapSource, boolean>>;
}

// ─── Document Model ───────────────────────────────────────────────────────────

export interface DocumentModel {
  readonly schemaVersion: number;
  readonly id: DocumentId;
  readonly name: string;
  readonly unit: DocumentUnit;

  readonly artboards: Readonly<Record<ArtboardId, Artboard>>;
  readonly artboardIds: readonly ArtboardId[];
  readonly activeArtboardId: ArtboardId;

  readonly layers: Readonly<Record<LayerId, Layer>>;
  readonly layerIds: readonly LayerId[];
  readonly activeLayerId: LayerId;

  readonly objects: Readonly<Record<ObjectId, SceneObject>>;
  readonly guides: readonly Guide[];
  readonly grid: GridSettings;
  readonly snap: SnapSettings;
  readonly palettes?: readonly ColorPalette[];
  readonly objectStyles?: readonly SavedObjectStyle[];

  readonly createdAt: string;
  readonly updatedAt: string;
  readonly maskGroups?: Readonly<Record<string, MaskGroup>>;
}

export interface MaskGroup {
  readonly id: string;
  readonly mode: 'clip' | 'opacity';
  readonly maskId: ObjectId;
  readonly contentIds: readonly ObjectId[];
  readonly opacityMode?: 'alpha' | 'luminance';
}

export interface BooleanPreview {
  readonly operation: BooleanOperation;
  readonly inputIds: readonly ObjectId[];
  readonly result: readonly PathObject[];
  readonly warnings: readonly string[];
}

export type BooleanOperation = 'unite' | 'subtract' | 'intersect' | 'exclude' | 'divide' | 'crop';
