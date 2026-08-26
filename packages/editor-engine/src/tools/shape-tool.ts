import type { Vec2 } from '@vectoria/shared';
import { type BasicShapeTool, normalizeShapeDrag, type ShapeGeometry, isValidShapeGeometry } from '@vectoria/core';

export type ShapeToolState = 'idle' | 'drawing';

export interface ShapeToolPointerEvent {
  readonly screenPoint: Vec2;
  readonly worldPoint: Vec2;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
}

export type ShapeToolResult =
  | { readonly type: 'draft'; readonly geometry: ShapeGeometry }
  | { readonly type: 'commit'; readonly geometry: ShapeGeometry }
  | { readonly type: 'cancel' };

/**
 * Base class for all drag-to-create shape tools.
 * Owns the drag gesture and normalizes output through core's shape drag logic.
 */
export class ShapeTool {
  readonly cursor = 'crosshair';
  private state: ShapeToolState = 'idle';
  private startPoint: Vec2 | null = null;
  private currentPoint: Vec2 | null = null;
  private currentModifiers: { shift: boolean; alt: boolean } = { shift: false, alt: false };

  constructor(readonly id: BasicShapeTool) {}

  get currentState(): ShapeToolState {
    return this.state;
  }

  get preview(): ShapeGeometry | null {
    if (!this.startPoint || !this.currentPoint) return null;
    return normalizeShapeDrag(this.id, this.startPoint, this.currentPoint, this.currentModifiers);
  }

  pointerDown(event: ShapeToolPointerEvent): ShapeToolResult | null {
    this.state = 'drawing';
    this.startPoint = event.worldPoint;
    this.currentPoint = event.worldPoint;
    this.currentModifiers = { shift: Boolean(event.shiftKey), alt: Boolean(event.altKey) };
    const geometry = this.preview;
    return geometry ? { type: 'draft', geometry } : null;
  }

  pointerMove(event: ShapeToolPointerEvent): ShapeToolResult | null {
    if (this.state !== 'drawing' || !this.startPoint) return null;
    this.currentPoint = event.worldPoint;
    this.currentModifiers = { shift: Boolean(event.shiftKey), alt: Boolean(event.altKey) };
    const geometry = this.preview;
    return geometry ? { type: 'draft', geometry } : null;
  }

  pointerUp(event: ShapeToolPointerEvent): ShapeToolResult | null {
    if (this.state !== 'drawing' || !this.startPoint) return null;
    this.currentPoint = event.worldPoint;
    this.currentModifiers = { shift: Boolean(event.shiftKey), alt: Boolean(event.altKey) };
    const geometry = this.preview;
    this.state = 'idle';
    this.startPoint = null;
    this.currentPoint = null;
    if (geometry && isValidShapeGeometry(geometry)) {
      return { type: 'commit', geometry };
    }
    return { type: 'cancel' };
  }

  keyDown(key: string): ShapeToolResult | null {
    if (key === 'Escape' && this.state === 'drawing') {
      return this.cancel();
    }
    return null;
  }

  cancel(): ShapeToolResult {
    this.state = 'idle';
    this.startPoint = null;
    this.currentPoint = null;
    return { type: 'cancel' };
  }
}
