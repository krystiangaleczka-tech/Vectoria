import type { ObjectId, Transform2D } from '@vectoria/core';
import type { Rect, Vec2 } from '@vectoria/shared';

export type TransformOperation = 'move' | 'scale' | 'rotate' | 'skew';

export interface TransformSession {
  readonly objectIds: readonly ObjectId[];
  readonly initialTransforms: Readonly<Record<string, Transform2D>>;
  readonly initialBounds: Rect;
  readonly pivotWorld: Vec2;
  readonly operation: TransformOperation;
}

/** Immutable drag snapshot. It keeps pointermove transient and commit-ready. */
export class DragSession {
  readonly transform: TransformSession;
  readonly startWorld: Vec2;
  currentWorld: Vec2;

  constructor(transform: TransformSession, startWorld: Vec2) {
    this.transform = transform;
    this.startWorld = startWorld;
    this.currentWorld = startWorld;
  }

  /** Update transient pointer position without mutating document state. */
  update(currentWorld: Vec2): void {
    this.currentWorld = currentWorld;
  }

  /** Current world-space displacement from pointerdown. */
  get delta(): Vec2 {
    return {
      x: this.currentWorld.x - this.startWorld.x,
      y: this.currentWorld.y - this.startWorld.y,
    };
  }
}
