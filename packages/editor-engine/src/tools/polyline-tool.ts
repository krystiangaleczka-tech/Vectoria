import type { Vec2 } from '@vectoria/shared';
import type { ShapeToolState, ShapeToolPointerEvent } from './shape-tool.js';

export type PolylineToolResult =
  | { readonly type: 'draft'; readonly points: readonly Vec2[] }
  | { readonly type: 'commit'; readonly points: readonly Vec2[] }
  | { readonly type: 'cancel' };

/**
 * Polyline tool creates an open path of straight segments.
 * Commits on Escape, Enter, or clicking the last point.
 */
export class PolylineTool {
  readonly id = 'polyline' as const;
  readonly cursor = 'crosshair';
  private state: ShapeToolState = 'idle';
  private points: Vec2[] = [];
  private pendingPoint: Vec2 | null = null;

  get currentState(): ShapeToolState {
    return this.state;
  }

  get preview(): { points: readonly Vec2[] } {
    return { points: this.pendingPoint ? [...this.points, this.pendingPoint] : this.points };
  }

  pointerDown(event: ShapeToolPointerEvent): PolylineToolResult | null {
    const point = this.constrain(event.worldPoint, event.shiftKey, this.points.at(-1));
    if (this.state === 'drawing' && this.points.length > 0) {
      if (this.distance(point, this.points.at(-1)!) < 4) {
        return this.commit(); // Double click / click on last point to commit
      }
    }
    if (this.state === 'idle') {
      this.state = 'drawing';
      this.points = [point];
    } else {
      this.points.push(point);
    }
    this.pendingPoint = point;
    return { type: 'draft', points: this.preview.points };
  }

  pointerMove(event: ShapeToolPointerEvent): PolylineToolResult | null {
    if (this.state !== 'drawing') return null;
    this.pendingPoint = this.constrain(event.worldPoint, event.shiftKey, this.points.at(-1));
    return { type: 'draft', points: this.preview.points };
  }

  pointerUp(_event: ShapeToolPointerEvent): PolylineToolResult | null {
    // We add points on pointerDown. pointerUp is just a no-op for polyline state machine.
    return null;
  }

  keyDown(key: string): PolylineToolResult | null {
    if (key === 'Enter') return this.points.length >= 2 ? this.commit() : this.cancel();
    if (key === 'Escape') return this.points.length >= 2 ? this.commit() : this.cancel();
    if ((key === 'Backspace' || key === 'Delete') && this.points.length > 0) {
      this.points = this.points.slice(0, -1);
      if (this.points.length === 0) return this.cancel();
      return { type: 'draft', points: this.preview.points };
    }
    return null;
  }

  cancel(): PolylineToolResult {
    this.state = 'idle';
    this.points = [];
    this.pendingPoint = null;
    return { type: 'cancel' };
  }

  private commit(): PolylineToolResult {
    const result: PolylineToolResult = { type: 'commit', points: this.points };
    this.state = 'idle';
    this.points = [];
    this.pendingPoint = null;
    return result;
  }

  private distance(a: Vec2, b: Vec2): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private constrain(point: Vec2, shiftKey = false, origin?: Vec2): Vec2 {
    if (!shiftKey || !origin) return point;
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) return origin;
    const angle = Math.atan2(dy, dx);
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    return { x: origin.x + Math.cos(snapped) * distance, y: origin.y + Math.sin(snapped) * distance };
  }
}
