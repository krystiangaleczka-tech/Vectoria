import { getTransformMatrix, getInverseTransformMatrix, MIN_SCALE, type Transform2D } from '@vectoria/core';
import { mat3TransformPoint, type Rect, type Vec2 } from '@vectoria/shared';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const FRACTIONS: Record<ResizeHandle, Vec2> = {
  nw: { x: 0, y: 0 }, n: { x: 0.5, y: 0 }, ne: { x: 1, y: 0 },
  e: { x: 1, y: 0.5 }, se: { x: 1, y: 1 }, s: { x: 0.5, y: 1 },
  sw: { x: 0, y: 1 }, w: { x: 0, y: 0.5 },
};

/** Returns local selection handles so drawing and hit testing use the same geometry. */
export function localResizeHandles(bounds: Rect): { id: ResizeHandle; point: Vec2 }[] {
  return (Object.keys(FRACTIONS) as ResizeHandle[]).map((id) => ({
    id, point: { x: bounds.x + FRACTIONS[id].x * bounds.width, y: bounds.y + FRACTIONS[id].y * bounds.height },
  }));
}

/** Keeps a local anchor fixed in world space when the linear transform changes. */
export function transformAroundAnchor(initial: Transform2D, next: Transform2D, anchor: Vec2): Transform2D {
  const before = mat3TransformPoint(getTransformMatrix(initial), anchor);
  const after = mat3TransformPoint(getTransformMatrix(next), anchor);
  return { ...next, position: { x: next.position.x + before.x - after.x, y: next.position.y + before.y - after.y } };
}

/** Resizes in object coordinates while keeping the opposite handle fixed, including pivot and skew. */
export function resizeObjectTransform(
  initial: Transform2D, bounds: Rect, handle: ResizeHandle,
  start: Vec2, current: Vec2, proportional = false,
): Transform2D {
  const inverse = getInverseTransformMatrix(initial);
  if (!inverse || bounds.width < 0 || bounds.height < 0 || (bounds.width === 0 && bounds.height === 0)
    || ![start.x, start.y, current.x, current.y].every(Number.isFinite)) return initial;
  const from = mat3TransformPoint(inverse, start);
  const to = mat3TransformPoint(inverse, current);
  const fraction = FRACTIONS[handle];
  let ratioX = fraction.x === 0.5 || bounds.width === 0 ? 1 : 1 + (to.x - from.x) * (fraction.x === 0 ? -1 : 1) / bounds.width;
  let ratioY = fraction.y === 0.5 || bounds.height === 0 ? 1 : 1 + (to.y - from.y) * (fraction.y === 0 ? -1 : 1) / bounds.height;
  if (proportional) {
    const ratio = fraction.x === 0.5 ? ratioY : fraction.y === 0.5 ? ratioX
      : Math.abs(ratioX - 1) >= Math.abs(ratioY - 1) ? ratioX : ratioY;
    ratioX = ratio;
    ratioY = ratio;
  }
  ratioX = Math.max(MIN_SCALE / Math.abs(initial.scale.x), ratioX);
  ratioY = Math.max(MIN_SCALE / Math.abs(initial.scale.y), ratioY);
  if (ratioX === 1 && ratioY === 1) return initial;
  const anchor = { x: bounds.x + (1 - fraction.x) * bounds.width, y: bounds.y + (1 - fraction.y) * bounds.height };
  return transformAroundAnchor(initial, { ...initial, scale: { x: initial.scale.x * ratioX, y: initial.scale.y * ratioY } }, anchor);
}

/** Rotates about the visible object center without moving it in world coordinates. */
export function rotateObjectTransform(initial: Transform2D, center: Vec2, start: Vec2, current: Vec2, snap = false): Transform2D {
  if (![start.x, start.y, current.x, current.y].every(Number.isFinite)) return initial;
  const pivot = mat3TransformPoint(getTransformMatrix(initial), center);
  const delta = Math.atan2(current.y - pivot.y, current.x - pivot.x) - Math.atan2(start.y - pivot.y, start.x - pivot.x);
  let rotation = initial.rotation + Math.atan2(Math.sin(delta), Math.cos(delta));
  if (snap) rotation = Math.round(rotation / (Math.PI / 12)) * Math.PI / 12;
  return transformAroundAnchor(initial, { ...initial, rotation }, center);
}

/** Places extra rotation targets beyond each corner in screen pixels, independent of zoom. */
export function cornerRotationHandles(handles: readonly { id: string; point: Vec2 }[], center: Vec2): Vec2[] {
  return handles.filter((handle) => ['nw', 'ne', 'se', 'sw'].includes(handle.id)).map(({ point }) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: point.x + dx / length * 24, y: point.y + dy / length * 24 };
  });
}
