import type {
  BasicShapeTool,
  ObjectId,
  ObjectStyle,
  PathNode,
  Transform2D,
} from '@vectoria/core';
import type { Rect, Vec2 } from '@vectoria/shared';
import type { ObjectSnapResult } from '../object-snap.js';
import type { SnapResult } from '../snapping.js';
import type { DragSession } from './drag-session.js';
import type { LassoSession } from './lasso-session.js';

export type CanvasDragKind =
  | 'pan'
  | 'create-shape'
  | 'move-object'
  | 'move-node'
  | 'move-handle'
  | 'resize-object'
  | 'rotate-object'
  | 'gradient-handle'
  | 'style-sample'
  | 'marquee'
  | 'lasso'
  | 'node-lasso'
  | 'text-create'
  | 'text-select';

/**
 * Shared transient drag metadata used by the canvas router.
 *
 * This data is intentionally outside React state and DocumentModel. Pointer
 * updates may mutate it at input frequency; durable changes still happen only
 * through commands at commit boundaries.
 */
export interface CanvasDragState {
  type: CanvasDragKind;
  shape?: BasicShapeTool;
  startScreen: Vec2;
  startWorld: Vec2;
  currentWorld: Vec2;
  pointerId: number;
  initialObjectTransform?: { position: Vec2 };
  objectIds?: readonly ObjectId[];
  initialTransforms?: Readonly<Record<string, Transform2D>>;
  initialSize?: { width: number; height: number };
  initialBounds?: Rect;
  handleId?: string;
  pivotWorld?: Vec2;
  initialTransform?: Transform2D;
  nodeIndex?: number;
  handleSide?: 'in' | 'out';
  initialNodes?: readonly PathNode[];
  lassoPoints?: Vec2[];
  gradientHandle?: 'start' | 'end' | 'center' | 'radius' | 'angle';
  initialStyle?: ObjectStyle;
  styleTool?: 'eyedropper' | 'bucket';
  textAnchor?: number;
}

export interface InteractionState {
  drag: CanvasDragState | null;
  dragSession: DragSession | null;
  lasso: LassoSession | null;
  snap: SnapResult | null;
  objectSnap: ObjectSnapResult | null;
  freehandCursor: Vec2 | null;
}

/**
 * Mutable owner for high-frequency canvas interaction state.
 *
 * Tool-specific state machines remain the owners of their own drafts. This
 * store only consolidates shared canvas-level transient state so React does not
 * need a separate ref for every interaction concern.
 */
export class InteractionStateStore implements InteractionState {
  drag: CanvasDragState | null = null;
  dragSession: DragSession | null = null;
  lasso: LassoSession | null = null;
  snap: SnapResult | null = null;
  objectSnap: ObjectSnapResult | null = null;
  freehandCursor: Vec2 | null = null;

  clear(): void {
    this.drag = null;
    this.dragSession = null;
    this.lasso = null;
    this.snap = null;
    this.objectSnap = null;
    this.freehandCursor = null;
  }
}
