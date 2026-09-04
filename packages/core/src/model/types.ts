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

/** Pattern placement independent of the host object's transform. */
export interface PatternTransform {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scale: number;
  /** Rotation in radians. */
  readonly rotation: number;
}

export interface PatternFill {
  readonly type: 'pattern';
  readonly kind: 'dots' | 'grid' | 'hatch';
  readonly foreground: string;
  readonly background: string;
  readonly size: number;
  readonly transform?: PatternTransform;
}

/**
 * Raster texture fill reusing the document image source contract. Rendered as a
 * repeating pattern with its own transform, independent of the object's.
 */
export interface TextureFill {
  readonly type: 'texture';
  readonly source: ImageSource;
  readonly transform?: PatternTransform;
}

/**
 * Bilinear color mesh gradient. `colors` is a 3×3 row-major grid of corner
 * colors; the renderer interpolates across the object's bounding box.
 */
export interface MeshGradientFill {
  readonly type: 'mesh-gradient';
  readonly colors: readonly (readonly string[])[]; // 3 rows × 3 columns
}

export type FillStyle = SolidFill | NoFill | LinearGradientFill | RadialGradientFill | AngularGradientFill | PatternFill | TextureFill | MeshGradientFill;

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

export type EffectId = string;

export interface DropShadowEffect {
  readonly type: 'dropShadow';
  readonly id: EffectId;
  readonly visible: boolean;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly blur: number;
  readonly color: string;
  readonly opacity: number;
}

export interface BlurEffect {
  readonly type: 'blur';
  readonly id: EffectId;
  readonly visible: boolean;
  readonly radius: number;
}

export interface RoundedCornersEffect {
  readonly type: 'roundedCorners';
  readonly id: EffectId;
  readonly visible: boolean;
  readonly radius: number;
}

export interface InnerShadowEffect {
  readonly type: 'innerShadow';
  readonly id: EffectId;
  readonly visible: boolean;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly blur: number;
  readonly color: string;
  readonly opacity: number;
}

export interface GlowEffect {
  readonly type: 'glow';
  readonly id: EffectId;
  readonly visible: boolean;
  readonly blur: number;
  readonly color: string;
  readonly opacity: number;
}

export type DistortVariant = 'zigzag' | 'roughen' | 'pucker-bloat';

export interface DistortEffect {
  readonly type: 'distort';
  readonly id: EffectId;
  readonly visible: boolean;
  readonly variant: DistortVariant;
  readonly amplitude: number;
  readonly frequency: number;
}

/** Destination quad corners (TL, TR, BR, BL) in object-local space. */
export type CornerQuad = readonly [Vec2, Vec2, Vec2, Vec2];

export interface EnvelopeEffect {
  readonly type: 'envelope';
  readonly id: EffectId;
  readonly visible: boolean;
  readonly corners: CornerQuad;
}

export interface PerspectiveEffect {
  readonly type: 'perspective';
  readonly id: EffectId;
  readonly visible: boolean;
  readonly corners: CornerQuad;
}

export interface ExtrudeEffect {
  readonly type: 'extrude';
  readonly id: EffectId;
  readonly visible: boolean;
  readonly depth: number;
  /** Extrusion direction in radians. */
  readonly angle: number;
  readonly steps: number;
}

export interface RadialRepeatEffect {
  readonly type: 'radialRepeat';
  readonly id: EffectId;
  readonly visible: boolean;
  readonly count: number;
  readonly radius: number;
  readonly startAngle: number;
}

export interface MirrorRepeatEffect {
  readonly type: 'mirrorRepeat';
  readonly id: EffectId;
  readonly visible: boolean;
  readonly axis: 'x' | 'y';
  readonly offset: number;
}

export interface GridRepeatEffect {
  readonly type: 'gridRepeat';
  readonly id: EffectId;
  readonly visible: boolean;
  readonly rows: number;
  readonly columns: number;
  readonly spacingX: number;
  readonly spacingY: number;
}

export type SVGFilterEffect = {
  readonly type: 'svgFilter';
  readonly id: EffectId;
  readonly visible: boolean;
  readonly filterType: 'colorMatrix' | 'turbulence';
  readonly params: Readonly<Record<string, number | string>>;
};

export type LiveEffect =
  | DropShadowEffect
  | BlurEffect
  | RoundedCornersEffect
  | InnerShadowEffect
  | GlowEffect
  | DistortEffect
  | EnvelopeEffect
  | PerspectiveEffect
  | ExtrudeEffect
  | RadialRepeatEffect
  | MirrorRepeatEffect
  | GridRepeatEffect
  | SVGFilterEffect;

export type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay'
  | 'darken' | 'lighten' | 'color-dodge' | 'color-burn'
  | 'hard-light' | 'soft-light' | 'difference' | 'exclusion'
  | 'hue' | 'saturation' | 'color' | 'luminosity';

export const BLEND_MODES: readonly BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay',
  'darken', 'lighten', 'color-dodge', 'color-burn',
  'hard-light', 'soft-light', 'difference', 'exclusion',
  'hue', 'saturation', 'color', 'luminosity',
];

export interface ObjectStyle {
  readonly fill: FillStyle;
  readonly stroke: StrokeStyle | null;

  /** Single canonical opacity for the object: 0–1. */
  readonly opacity: number;
  readonly blendMode?: BlendMode;
  
  /** Stack of non-destructive live effects applied in order. */
  readonly effects?: readonly LiveEffect[];
}

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

export type LockedAttribute = 'position' | 'size' | 'rotation' | 'style' | 'content';

export interface SceneObjectBase {
  readonly id: ObjectId;
  readonly name: string;
  readonly layerId: LayerId;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly transform: Transform2D;
  readonly style: ObjectStyle;
  readonly lockedAttributes?: readonly LockedAttribute[];
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
  /** Optional brush rendering profile (EPIC-13 FX-016/017/018). */
  readonly brush?: BrushProfile;
}

/**
 * Brush rendering profile for paths. Caligraphic strokes generate a real filled
 * outline (exports cleanly); stamp/pattern brushes render via arc-length stamping.
 */
export type BrushProfile =
  | { readonly kind: 'caligraphic'; /** Nib angle in radians. */ readonly angle: number; readonly thin: number; readonly thick: number }
  | { readonly kind: 'stamp'; readonly stamp: 'watercolor' | 'chalk' | 'marker'; readonly size: number; readonly spacing: number; readonly jitter: number }
  | { readonly kind: 'pattern'; readonly motif: 'dots' | 'dashes' | 'ornament'; readonly size: number; readonly spacing: number };

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

export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 'normal' | 'bold' | 'lighter' | 'bolder';
export type FontStyle = 'normal' | 'italic' | 'oblique';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type ListType = 'none' | 'bullet' | 'numbered';

export interface TextRun {
  readonly start: number; // Unicode code point offset
  readonly length: number;
  readonly fontFamily?: string;
  readonly fontSize?: number;
  readonly fontWeight?: FontWeight;
  readonly fontStyle?: FontStyle;
  readonly baselineShift?: number;
  readonly fill?: FillStyle;
  readonly isPlaceholder?: boolean;
}

export interface TextObject extends SceneObjectBase {
  readonly type: 'text';
  readonly text: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: FontWeight;
  readonly fontStyle: FontStyle;
  readonly letterSpacing: number;
  readonly lineHeight: number;
  readonly textAlign: TextAlign;
  readonly kerning: boolean;
  readonly pathId?: ObjectId;
  readonly runs?: readonly TextRun[];
  readonly variableAxes?: Readonly<Record<string, number>>;
}

export interface TextFrameObject extends SceneObjectBase {
  readonly type: 'text-frame';
  readonly text: string;
  readonly width: number;
  readonly height: number;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: FontWeight;
  readonly fontStyle: FontStyle;
  readonly letterSpacing: number;
  readonly lineHeight: number;
  readonly textAlign: TextAlign;
  readonly kerning: boolean;
  readonly columnCount: number;
  readonly columnGutter: number;
  readonly paragraphSpacing: number;
  readonly indent: number;
  readonly listType?: ListType;
  readonly runs?: readonly TextRun[];
  readonly variableAxes?: Readonly<Record<string, number>>;
}

export type ImageSource =
  | { readonly type: 'embed'; readonly data: string; readonly mimeType: string }
  | { readonly type: 'link'; readonly url: string; readonly mimeType?: string };

export interface ImageFilters {
  readonly brightness?: number; // -100 to 100, 0 is default
  readonly contrast?: number;   // -100 to 100, 0 is default
  readonly saturation?: number; // 0 to 200, 100 is default
  readonly grayscale?: boolean;
}

export interface ImageCrop {
  readonly offset: Vec2;
  readonly scale: Vec2;
  readonly frame: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  /** Legacy x coordinate for backward compatibility. */
  readonly x?: number;
  /** Legacy y coordinate for backward compatibility. */
  readonly y?: number;
  /** Legacy width for backward compatibility. */
  readonly width?: number;
  /** Legacy height for backward compatibility. */
  readonly height?: number;
}

export interface ImageObject extends SceneObjectBase {
  readonly type: 'image';
  readonly source: ImageSource;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readonly width: number;
  readonly height: number;
  readonly crop?: ImageCrop;
  readonly filters?: ImageFilters;
  readonly isMissing?: boolean;
}

export type SymbolId = string;

export interface SymbolDefinition {
  readonly id: SymbolId;
  readonly name: string;
  readonly objectIds: readonly ObjectId[];
  readonly objects: Readonly<Record<ObjectId, SceneObject>>;
  readonly bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly isBrandAsset?: boolean;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface SymbolInstanceObject extends SceneObjectBase {
  readonly type: 'symbol-instance';
  readonly symbolId: SymbolId;
  readonly width: number;
  readonly height: number;
}

export interface BrandKitLogo {
  readonly id: string;
  readonly name: string;
  readonly objectId?: ObjectId;
  readonly svgData?: string;
  readonly imageUrl?: string;
}

export interface BrandKit {
  readonly logos?: readonly BrandKitLogo[];
  readonly colorPaletteIds?: readonly string[];
  readonly fontFamilies?: readonly string[];
  readonly symbolIds?: readonly SymbolId[];
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
  | PolylineObject
  | TextObject
  | TextFrameObject
  | ImageObject
  | SymbolInstanceObject;

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
  readonly labelColor?: string;
  readonly isTemplate?: boolean;
  readonly parentId?: LayerId | null;
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

// ─── Document Annotations (EPIC-17 SAAS-012..014) ──────────────────────────

export interface CanvasAnnotation {
  readonly id: string;
  readonly projectId?: string;
  readonly worldPoint: Vec2;
  readonly body: string;
  readonly authorName: string;
  readonly resolved: boolean;
  readonly mentions: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
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
  readonly symbols?: Readonly<Record<SymbolId, SymbolDefinition>>;
  readonly symbolIds?: readonly SymbolId[];
  readonly brandKit?: BrandKit;
  readonly annotations?: readonly CanvasAnnotation[];

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
