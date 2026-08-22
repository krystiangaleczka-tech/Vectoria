import type { PathNode } from '@vectoria/core';
import { createPathNode } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';

export type PenToolState = 'idle' | 'creating-path';

export interface PenToolPointerEvent {
  readonly screenPoint: Vec2;
  readonly worldPoint: Vec2;
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

  get currentState(): PenToolState {
    return this.state;
  }

  get preview(): PenToolPreview {
    return { nodes: this.nodes, cursorPoint: this.cursorPoint, pendingPoint: this.pendingPoint, pendingHandle: this.pendingHandle };
  }

  /** Start a node gesture or close draft when pointer targets its first node. */
  pointerDown(event: PenToolPointerEvent, closeToleranceWorld: number): PenToolResult | null {
    this.cursorPoint = event.worldPoint;
    if (this.state === 'creating-path' && this.nodes.length >= 3 && this.distance(event.worldPoint, this.nodes[0]!.point) <= closeToleranceWorld) {
      return this.commit(true);
    }
    this.state = 'creating-path';
    this.pendingPoint = event.worldPoint;
    this.pendingHandle = null;
    return null;
  }

  /** Keep rubber band and current drag handle in transient tool state. */
  pointerMove(event: PenToolPointerEvent): PenToolResult | null {
    this.cursorPoint = event.worldPoint;
    if (!this.pendingPoint) return null;
    if (this.distance(event.worldPoint, this.pendingPoint) > 3) this.pendingHandle = event.worldPoint;
    return { type: 'draft', nodes: this.nodes };
  }

  /** Convert click or drag into one corner or smooth node. */
  pointerUp(event: PenToolPointerEvent): PenToolResult | null {
    if (!this.pendingPoint) return null;
    const point = this.pendingPoint;
    const dragged = this.pendingHandle !== null;
    this.nodes = [...this.nodes, createPathNode(point, {
      kind: dragged ? 'smooth' : 'corner',
      outHandle: dragged ? this.pendingHandle : null,
    })];
    this.pendingPoint = null;
    this.pendingHandle = null;
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
}
