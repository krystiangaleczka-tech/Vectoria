import type { PathNode } from '@vectoria/core';
import { createPathNode } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';

export type PenToolState = 'idle' | 'creating-path';

export interface PenToolPointerEvent {
  readonly screenPoint: Vec2;
  readonly worldPoint: Vec2;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
}

export type PenToolResult =
  | { readonly type: 'draft'; readonly nodes: readonly PathNode[] }
  | { readonly type: 'commit'; readonly nodes: readonly PathNode[]; readonly closed: boolean }
  | { readonly type: 'cancel' };

export interface PenToolPreview {
  readonly nodes: readonly PathNode[];
  readonly cursorPoint: Vec2 | null;
  readonly pendingPoint: Vec2 | null;
  readonly pendingHandle: Vec2 | null;
}

/**
 * Owns Pen Tool transitions and transient draft geometry outside React.
 * The editor consumes results only when a path becomes a document command.
 */
export class PenTool {
  readonly id = 'pen' as const;
  readonly cursor = 'crosshair';
  private state: PenToolState = 'idle';
  private nodes: PathNode[] = [];
  private cursorPoint: Vec2 | null = null;
  private pendingPoint: Vec2 | null = null;
  private pendingHandle: Vec2 | null = null;
  private pendingAlt = false;

  get currentState(): PenToolState {
    return this.state;
  }

  get preview(): PenToolPreview {
    return { nodes: this.nodes, cursorPoint: this.cursorPoint, pendingPoint: this.pendingPoint, pendingHandle: this.pendingHandle };
  }

  /** Start a node gesture or close draft when pointer targets its first node. */
  pointerDown(event: PenToolPointerEvent, closeToleranceWorld: number): PenToolResult | null {
    const anchor = this.nodes.at(-1)?.point;
    this.cursorPoint = this.constrain(event.worldPoint, event.shiftKey, anchor);
    if (this.state === 'creating-path' && this.nodes.length >= 3 && this.distance(event.worldPoint, this.nodes[0]!.point) <= closeToleranceWorld) {
      return this.commit(true);
    }
    this.state = 'creating-path';
    this.pendingPoint = this.constrain(event.worldPoint, event.shiftKey, anchor);
    this.pendingHandle = null;
    this.pendingAlt = Boolean(event.altKey);
    return null;
  }

  /** Keep rubber band and current drag handle in transient tool state. */
  pointerMove(event: PenToolPointerEvent): PenToolResult | null {
    const anchor = this.pendingPoint ?? this.nodes.at(-1)?.point;
    this.cursorPoint = this.constrain(event.worldPoint, event.shiftKey, anchor);
    if (!this.pendingPoint) return null;
    const point = this.constrain(event.worldPoint, event.shiftKey, this.pendingPoint);
    if (this.distance(point, this.pendingPoint) > 3) this.pendingHandle = point;
    return { type: 'draft', nodes: this.nodes };
  }

  /** Convert click or drag into one corner or smooth node. */
  pointerUp(event: PenToolPointerEvent): PenToolResult | null {
    if (!this.pendingPoint) return null;
    const point = this.pendingPoint;
    const handle = this.pendingHandle ? this.constrain(event.worldPoint, event.shiftKey, point) : null;
    const dragged = this.pendingHandle !== null;
    this.nodes = [...this.nodes, createPathNode(point, {
      kind: dragged && !event.altKey && !this.pendingAlt ? 'smooth' : dragged ? 'cusp' : 'corner',
      outHandle: dragged ? handle : null,
    })];
    this.pendingPoint = null;
    this.pendingHandle = null;
    this.pendingAlt = false;
    this.cursorPoint = event.worldPoint;
    return { type: 'draft', nodes: this.nodes };
  }

  keyDown(key: string): PenToolResult | null {
    if (key === 'Enter') return this.nodes.length >= 2 ? this.commit(false) : this.cancel();
    if (key === 'Escape') return this.cancel();
    if ((key === 'Backspace' || key === 'Delete') && this.pendingPoint === null && this.nodes.length > 0) {
      this.nodes = this.nodes.slice(0, -1);
      if (this.nodes.length === 0) return this.cancel();
      return { type: 'draft', nodes: this.nodes };
    }
    return null;
  }

  cancel(): PenToolResult {
    this.state = 'idle';
    this.nodes = [];
    this.pendingPoint = null;
    this.pendingHandle = null;
    this.pendingAlt = false;
    this.cursorPoint = null;
    return { type: 'cancel' };
  }

  private commit(closed: boolean): PenToolResult {
    const result: PenToolResult = { type: 'commit', nodes: this.nodes, closed };
    this.state = 'idle';
    this.nodes = [];
    this.pendingPoint = null;
    this.pendingHandle = null;
    this.cursorPoint = null;
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
