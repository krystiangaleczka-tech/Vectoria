import type { Vec2 } from '@vectoria/shared';
import type { CornerRadii } from './types.js';

export type BasicShapeTool =
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'star'
  | 'arc'
  | 'pie'
  | 'ring'
  | 'spiral'
  | 'callout';

export interface ShapeModifiers {
  readonly shift: boolean;
  readonly alt: boolean;
  readonly meta: boolean;
}

export interface ShapeDraft {
  readonly tool: BasicShapeTool;
  readonly startWorld: Vec2;
  readonly currentWorld: Vec2;
  readonly modifiers: ShapeModifiers;
}

export type ShapeGeometry =
  | {
      readonly type:
        | 'rectangle'
        | 'ellipse'
        | 'polygon'
        | 'star'
        | 'arc'
        | 'pie'
        | 'ring'
        | 'spiral'
        | 'callout';
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }
  | { readonly type: 'line'; readonly start: Vec2; readonly end: Vec2 };

/** Convert legacy or partial radius data into finite, geometry-safe radii. */
export function normalizeCornerRadii(cornerRadius: number | Partial<CornerRadii>, width: number, height: number): CornerRadii {
  const limit = Math.max(0, Math.min(width, height) / 2);
  const value = typeof cornerRadius === 'number'
    ? { topLeft: cornerRadius, topRight: cornerRadius, bottomRight: cornerRadius, bottomLeft: cornerRadius }
    : cornerRadius;
  return {
    topLeft: clampRadius(value.topLeft, limit),
    topRight: clampRadius(value.topRight, limit),
    bottomRight: clampRadius(value.bottomRight, limit),
    bottomLeft: clampRadius(value.bottomLeft, limit),
  };
}

function clampRadius(value: number | undefined, limit: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value!, 0), limit) : 0;
}

/**
 * Normalize a basic-shape drag into positive dimensions or line endpoints.
 * Keeps Shift constraints in world space while preserving the drag quadrant.
 */
export function normalizeShapeDrag(
  tool: BasicShapeTool,
  startWorld: Vec2,
  currentWorld: Vec2,
  modifiers: Pick<ShapeModifiers, 'shift'> = { shift: false },
): ShapeGeometry | null {
  if (!isFinitePoint(startWorld) || !isFinitePoint(currentWorld)) return null;

  if (tool === 'line') {
    const end = modifiers.shift ? constrainLine(startWorld, currentWorld) : currentWorld;
    return { type: 'line', start: startWorld, end };
  }

  let end = currentWorld;
  if (modifiers.shift) {
    const dx = currentWorld.x - startWorld.x;
    const dy = currentWorld.y - startWorld.y;
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    end = {
      x: startWorld.x + (dx < 0 ? -size : size),
      y: startWorld.y + (dy < 0 ? -size : size),
    };
  }

  return {
    type: tool,
    x: Math.min(startWorld.x, end.x),
    y: Math.min(startWorld.y, end.y),
    width: Math.abs(end.x - startWorld.x),
    height: Math.abs(end.y - startWorld.y),
  };
}

/** Return whether normalized geometry is large enough to commit as an object. */
export function isValidShapeGeometry(geometry: ShapeGeometry, minimumSize = 2): boolean {
  if (geometry.type === 'line') {
    return distance(geometry.start, geometry.end) >= minimumSize;
  }
  return geometry.width >= minimumSize && geometry.height >= minimumSize;
}

function constrainLine(start: Vec2, end: Vec2): Vec2 {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return end;
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return { x: start.x + Math.cos(angle) * length, y: start.y + Math.sin(angle) * length };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function isFinitePoint(point: Vec2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}
