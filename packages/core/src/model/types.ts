import type { Vec2 } from '@vectoria/shared';

// ─── ID Types ─────────────────────────────────────────────────────────────────

export type DocumentId = string;
export type ArtboardId = string;
export type LayerId = string;
export type ObjectId = string;

// ─── Units ────────────────────────────────────────────────────────────────────

export type DocumentUnit = 'px' | 'mm' | 'cm' | 'pt' | 'in';

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

export type FillStyle = SolidFill | NoFill | LinearGradientFill;

export interface StrokeStyle {
  readonly color: string;
  readonly width: number;
  readonly lineCap: 'butt' | 'round' | 'square';
  readonly lineJoin: 'miter' | 'round' | 'bevel';
  readonly miterLimit: number;
  readonly dashArray: readonly number[];
  readonly opacity: number;
}

export interface ObjectStyle {
  readonly fill: FillStyle;
  readonly stroke: StrokeStyle | null;

  /** Single canonical opacity for the object: 0–1. */
  readonly opacity: number;
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
  readonly cornerRadius: number;
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
  readonly point: Vec2;
  readonly inHandle: Vec2 | null;
  readonly outHandle: Vec2 | null;
  readonly kind: 'corner' | 'smooth';
}

export interface PathObject extends SceneObjectBase {
  readonly type: 'path';
  readonly nodes: readonly PathNode[];
  readonly closed: boolean;
}

export type SceneObject = RectangleObject | EllipseObject | LineObject | PathObject;

// ─── Layer ────────────────────────────────────────────────────────────────────

export interface Layer {
  readonly id: LayerId;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;

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
  readonly background: string | null;
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

  readonly createdAt: string;
  readonly updatedAt: string;
}
