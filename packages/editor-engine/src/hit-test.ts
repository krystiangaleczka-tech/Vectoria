import type { Vec2 } from '@vectoria/shared';
import { rectContainsPoint } from '@vectoria/shared';
import type { DocumentModel, SceneObject, ObjectId, RectangleObject, EllipseObject, LineObject, PathObject } from '@vectoria/core';
import { getTransformMatrix } from '@vectoria/core';
import { mat3Inverse, mat3TransformPoint } from '@vectoria/shared';

/**
 * Hit-test a point in world space against all visible, unlocked objects.
 * Returns the topmost hit object ID, or null.
 * Iterates in reverse z-order (top to bottom).
 */
export function hitTest(
  doc: DocumentModel,
  worldPoint: Vec2,
): ObjectId | null {
  // Iterate layers top-to-bottom
  for (let li = doc.layerIds.length - 1; li >= 0; li--) {
    const layerId = doc.layerIds[li]!;
    const layer = doc.layers[layerId];
    if (!layer || !layer.visible || layer.locked) continue;

    // Iterate objects top-to-bottom within layer
    for (let oi = layer.objectIds.length - 1; oi >= 0; oi--) {
      const objectId = layer.objectIds[oi]!;
      const obj = doc.objects[objectId];
      if (!obj || !obj.visible || obj.locked) continue;

      if (hitTestObject(obj, worldPoint)) {
        return objectId;
      }
    }
  }

  return null;
}

/**
 * Hit-test a single object.
 */
function hitTestObject(obj: SceneObject, worldPoint: Vec2): boolean {
  switch (obj.type) {
    case 'rectangle':
      return hitTestRectangle(obj, worldPoint);
    case 'ellipse':
      return hitTestEllipse(obj, worldPoint);
    case 'line':
      return hitTestLine(obj, worldPoint);
    case 'path':
      return hitTestPath(obj, worldPoint);
    default:
      return false;
  }
}

/**
 * Hit-test a rectangle: transform the world point into local space
 * and check if it falls within the rectangle bounds.
 *
 * For "No Fill" objects, hit-test the stroke only (within strokeWidth/2 of edges).
 */
function hitTestRectangle(obj: RectangleObject, worldPoint: Vec2): boolean {
  const matrix = getTransformMatrix(obj.transform);
  const inv = mat3Inverse(matrix);
  if (!inv) return false;

  const localPoint = mat3TransformPoint(inv, worldPoint);

  const hasFill = obj.style.fill.type !== 'none';
  const strokeWidth = obj.style.stroke?.width ?? 0;
  const halfStroke = strokeWidth / 2;

  if (hasFill) {
    // Fill hit-test: point inside rectangle + stroke expansion
    return rectContainsPoint(
      {
        x: -halfStroke,
        y: -halfStroke,
        width: obj.width + strokeWidth,
        height: obj.height + strokeWidth,
      },
      localPoint,
    );
  }

  // No fill: hit-test stroke only (within halfStroke of edges)
  const tolerance = Math.max(halfStroke, 3); // minimum 3px tolerance

  const insideOuter = (
    localPoint.x >= -tolerance &&
    localPoint.x <= obj.width + tolerance &&
    localPoint.y >= -tolerance &&
    localPoint.y <= obj.height + tolerance
  );

  const insideInner = (
    localPoint.x >= tolerance &&
    localPoint.x <= obj.width - tolerance &&
    localPoint.y >= tolerance &&
    localPoint.y <= obj.height - tolerance
  );

  return insideOuter && !insideInner;
}

/**
 * Hit-test an ellipse: transform world point into local space and check
 * against the ellipse equation ((x-cx)/rx)^2 + ((y-cy)/ry)^2 <= 1.
 *
 * For "No Fill" objects, hit-test the stroke ring only.
 */
function hitTestEllipse(obj: EllipseObject, worldPoint: Vec2): boolean {
  const inv = mat3Inverse(getTransformMatrix(obj.transform));
  if (!inv) return false;

  const local = mat3TransformPoint(inv, worldPoint);
  const rx = obj.width / 2;
  const ry = obj.height / 2;
  const cx = rx;
  const cy = ry;

  if (rx <= 0 || ry <= 0) return false;

  const hasFill = obj.style.fill.type !== 'none';
  const strokeWidth = obj.style.stroke?.width ?? 0;

  const normalized =
    ((local.x - cx) ** 2) / (rx ** 2) + ((local.y - cy) ** 2) / (ry ** 2);

  if (hasFill) return normalized <= 1;

  // No fill: hit-test stroke ring
  const halfStroke = strokeWidth / 2;
  const outerRx = rx + halfStroke;
  const outerRy = ry + halfStroke;
  const innerRx = Math.max(rx - halfStroke, 0);
  const innerRy = Math.max(ry - halfStroke, 0);
  const outer = ((local.x - cx) ** 2) / (outerRx ** 2) + ((local.y - cy) ** 2) / (outerRy ** 2);
  const inner = innerRx > 0 && innerRy > 0
    ? ((local.x - cx) ** 2) / (innerRx ** 2) + ((local.y - cy) ** 2) / (innerRy ** 2)
    : Infinity;
  return outer <= 1 && inner >= 1;
}

/**
 * Hit-test a line: distance from point to line segment (0,0)→endPoint
 * must be within max(strokeWidth/2, 4px) tolerance.
 */
function hitTestLine(obj: LineObject, worldPoint: Vec2): boolean {
  const inv = mat3Inverse(getTransformMatrix(obj.transform));
  if (!inv) return false;

  const local = mat3TransformPoint(inv, worldPoint);
  const strokeWidth = obj.style.stroke?.width ?? 1;
  const tolerance = Math.max(strokeWidth / 2, 4); // min 4px tolerance for easy clicking

  const distance = distancePointToSegment(local, { x: 0, y: 0 }, obj.endPoint);
  return distance <= tolerance;
}

/**
 * Compute the shortest distance from point p to segment a→b.
 */
function distancePointToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: p.x - a.x, y: p.y - a.y };
  const lengthSq = ab.x ** 2 + ab.y ** 2;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / lengthSq));
  const closest = { x: a.x + ab.x * t, y: a.y + ab.y * t };
  return Math.hypot(p.x - closest.x, p.y - closest.y);
}

/**
 * Hit-test a path: for filled closed paths, point-in-polygon test.
 * For stroke-only or open paths, distance to each segment.
 *
 * Note: uses linear approximation between nodes (ignores Bézier handles).
 * Full Bézier hit-test requires curve sampling and is a future enhancement.
 */
function hitTestPath(obj: PathObject, worldPoint: Vec2): boolean {
  const inv = mat3Inverse(getTransformMatrix(obj.transform));
  if (!inv) return false;

  const local = mat3TransformPoint(inv, worldPoint);
  const hasFill = obj.style.fill.type !== 'none';

  if (hasFill && obj.closed && obj.nodes.length >= 3) {
    return pointInPolygon(local, obj.nodes.map((n) => n.point));
  }

  const strokeWidth = obj.style.stroke?.width ?? 1;
  const tolerance = Math.max(strokeWidth / 2, 4);

  for (let i = 0; i < obj.nodes.length - (obj.closed ? 0 : 1); i++) {
    const a = obj.nodes[i]!.point;
    const b = obj.nodes[(i + 1) % obj.nodes.length]!.point;
    if (distancePointToSegment(local, a, b) <= tolerance) return true;
  }
  return false;
}

/**
 * Ray-casting point-in-polygon test.
 */
function pointInPolygon(point: Vec2, polygon: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.x;
    const yi = polygon[i]!.y;
    const xj = polygon[j]!.x;
    const yj = polygon[j]!.y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
