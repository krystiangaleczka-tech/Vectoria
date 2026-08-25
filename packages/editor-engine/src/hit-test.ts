import type { Vec2 } from '@vectoria/shared';
import { rectContainsPoint } from '@vectoria/shared';
import type { DocumentModel, SceneObject, ObjectId, RectangleObject, EllipseObject, LineObject, PathObject } from '@vectoria/core';
import { getTransformMatrix, getObjectBounds, normalizeCornerRadii } from '@vectoria/core';
import { mat3Inverse, mat3TransformPoint } from '@vectoria/shared';
import type { Rect } from '@vectoria/shared';

export interface HitTestOptions {
  /** Screen-space tolerance converted to world units using zoom. */
  readonly tolerancePx?: number;
  readonly zoom?: number;
  readonly visibleWorldRect?: Rect;
  readonly allowedObjectIds?: ReadonlySet<ObjectId>;
}

export interface HitTestResult {
  readonly objectId: ObjectId;
  readonly part: 'fill' | 'stroke' | 'bounds' | 'handle' | 'node';
  readonly distancePx: number;
}

/**
 * Hit-test a point in world space against all visible, unlocked objects.
 * Returns the topmost hit object ID, or null.
 * Iterates in reverse z-order (top to bottom).
 */
export function hitTest(
  doc: DocumentModel,
  worldPoint: Vec2,
  visibleWorldRect?: Rect,
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
      if (visibleWorldRect) {
        const bounds = getObjectBounds(obj, doc);
        if (bounds.x > visibleWorldRect.x + visibleWorldRect.width || bounds.x + bounds.width < visibleWorldRect.x || bounds.y > visibleWorldRect.y + visibleWorldRect.height || bounds.y + bounds.height < visibleWorldRect.y) continue;
      }

       if (hitTestDocumentObject(doc, obj, worldPoint, 4)) {
        return objectId;
      }
    }
  }

  return null;
}

/** Return all hit candidates in deterministic top-most-first order. */
export function hitTestCandidates(doc: DocumentModel, worldPoint: Vec2, options: HitTestOptions = {}): HitTestResult[] {
  const toleranceWorld = (options.tolerancePx ?? 6) / Math.max(options.zoom ?? 1, 0.000001);
  const results: HitTestResult[] = [];
  for (let li = doc.layerIds.length - 1; li >= 0; li -= 1) {
    const layer = doc.layers[doc.layerIds[li]!];
    if (!layer || !layer.visible || layer.locked) continue;
    const order = options.allowedObjectIds
      ? flattenObjects(doc, layer.objectIds).filter((object) => options.allowedObjectIds!.has(object.id)).map((object) => object.id)
      : layer.objectIds;
    for (let oi = order.length - 1; oi >= 0; oi -= 1) {
      const object = doc.objects[order[oi]!];
      if (!object || !object.visible || object.locked) continue;
       if (options.visibleWorldRect && !rectsOverlap(getObjectBounds(object, doc), options.visibleWorldRect)) continue;
       if (!hitTestDocumentObject(doc, object, worldPoint, toleranceWorld)) continue;
      results.push({
        objectId: object.id,
        part: object.style.fill.type === 'none' ? 'stroke' : 'fill',
        distancePx: 0,
      });
    }
  }
  return results;
}

/** Hit-test with the result contract used by selection tools. */
export function hitTestDetailed(doc: DocumentModel, worldPoint: Vec2, options: HitTestOptions = {}): HitTestResult[] {
  return hitTestCandidates(doc, worldPoint, options);
}

function flattenObjects(doc: DocumentModel, ids: readonly ObjectId[]): SceneObject[] {
  const result: SceneObject[] = [];
  for (const id of ids) {
    const object = doc.objects[id];
    if (!object) continue;
    result.push(object);
    if (object.type === 'group') result.push(...flattenObjects(doc, object.childIds));
  }
  return result;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

/**
 * Hit-test a single object.
 */
function hitTestObject(obj: SceneObject, worldPoint: Vec2, toleranceWorld: number): boolean {
  switch (obj.type) {
    case 'rectangle':
      return hitTestRectangle(obj, worldPoint, toleranceWorld);
    case 'ellipse':
      return hitTestEllipse(obj, worldPoint, toleranceWorld);
    case 'line':
      return hitTestLine(obj, worldPoint, toleranceWorld);
    case 'path':
      return hitTestPath(obj, worldPoint, toleranceWorld);
    case 'group':
      return false;
    default:
      return false;
  }
}

function hitTestDocumentObject(doc: DocumentModel, object: SceneObject, worldPoint: Vec2, toleranceWorld: number): boolean {
  if (object.type !== 'group') return hitTestObject(object, worldPoint, toleranceWorld);
  return object.childIds.some((childId) => {
    const child = doc.objects[childId];
    return child?.visible && !child.locked && hitTestDocumentObject(doc, child, worldPoint, toleranceWorld);
  });
}

/**
 * Hit-test a rectangle: transform the world point into local space
 * and check if it falls within the rectangle bounds.
 *
 * For "No Fill" objects, hit-test the stroke only (within strokeWidth/2 of edges).
 */
function hitTestRectangle(obj: RectangleObject, worldPoint: Vec2, toleranceWorld: number): boolean {
  const matrix = getTransformMatrix(obj.transform);
  const inv = mat3Inverse(matrix);
  if (!inv) return false;

  const localPoint = mat3TransformPoint(inv, worldPoint);

  const hasFill = obj.style.fill.type !== 'none';
  const strokeWidth = obj.style.stroke?.width ?? 0;
  const halfStroke = strokeWidth / 2;

  if (hasFill) {
    // Fill hit-test follows the same corner geometry as Canvas and SVG.
    const radii = normalizeCornerRadii(obj.cornerRadius, obj.width + strokeWidth, obj.height + strokeWidth);
    return pointInRoundedRect({ x: localPoint.x + halfStroke, y: localPoint.y + halfStroke }, obj.width + strokeWidth, obj.height + strokeWidth, radii);
  }

  // No fill: hit-test stroke only (within halfStroke of edges)
  const tolerance = Math.max(halfStroke, toleranceWorld);

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

function pointInRoundedRect(point: Vec2, width: number, height: number, radii: ReturnType<typeof normalizeCornerRadii>): boolean {
  if (!rectContainsPoint({ x: 0, y: 0, width, height }, point)) return false;
  const { topLeft, topRight, bottomRight, bottomLeft } = radii;
  if (point.x < topLeft && point.y < topLeft) return Math.hypot(point.x - topLeft, point.y - topLeft) <= topLeft;
  if (point.x > width - topRight && point.y < topRight) return Math.hypot(point.x - (width - topRight), point.y - topRight) <= topRight;
  if (point.x > width - bottomRight && point.y > height - bottomRight) return Math.hypot(point.x - (width - bottomRight), point.y - (height - bottomRight)) <= bottomRight;
  if (point.x < bottomLeft && point.y > height - bottomLeft) return Math.hypot(point.x - bottomLeft, point.y - (height - bottomLeft)) <= bottomLeft;
  return true;
}

/**
 * Hit-test an ellipse: transform world point into local space and check
 * against the ellipse equation ((x-cx)/rx)^2 + ((y-cy)/ry)^2 <= 1.
 *
 * For "No Fill" objects, hit-test the stroke ring only.
 */
function hitTestEllipse(obj: EllipseObject, worldPoint: Vec2, toleranceWorld: number): boolean {
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

  if (hasFill) {
    const expandedRx = rx + toleranceWorld;
    const expandedRy = ry + toleranceWorld;
    return ((local.x - cx) ** 2) / (expandedRx ** 2) + ((local.y - cy) ** 2) / (expandedRy ** 2) <= 1;
  }

  // No fill: hit-test stroke ring
  const halfStroke = Math.max(strokeWidth / 2, toleranceWorld);
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
function hitTestLine(obj: LineObject, worldPoint: Vec2, toleranceWorld: number): boolean {
  const inv = mat3Inverse(getTransformMatrix(obj.transform));
  if (!inv) return false;

  const local = mat3TransformPoint(inv, worldPoint);
  const strokeWidth = obj.style.stroke?.width ?? 1;
  const tolerance = Math.max(strokeWidth / 2, toleranceWorld);

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
 * Hit-test a path: for filled closed paths, point-in-polygon test using
 * flattened Bézier samples. For stroke-only or open paths, distance to
 * each flattened segment.
 *
 * Bézier segments are sampled at 16 points per segment for accurate
 * hit-testing that matches the rendered curve.
 */
function hitTestPath(obj: PathObject, worldPoint: Vec2, toleranceWorld: number): boolean {
  const inv = mat3Inverse(getTransformMatrix(obj.transform));
  if (!inv) return false;

  const local = mat3TransformPoint(inv, worldPoint);
  const hasFill = obj.style.fill.type !== 'none';

  // Flatten all Bézier segments into line segments for hit-testing
  const flatPoints = flattenPath(obj);

  if (hasFill && obj.closed && flatPoints.length >= 3) {
    return pointInPolygon(local, flatPoints);
  }

  const strokeWidth = obj.style.stroke?.width ?? 1;
  const tolerance = Math.max(strokeWidth / 2, toleranceWorld);

  for (let i = 0; i < flatPoints.length - (obj.closed ? 0 : 1); i++) {
    const a = flatPoints[i]!;
    const b = flatPoints[(i + 1) % flatPoints.length]!;
    if (distancePointToSegment(local, a, b) <= tolerance) return true;
  }
  return false;
}

/** Number of samples per Bézier segment for flattening. */
const BEZIER_SAMPLES = 16;

/**
 * Evaluate a cubic Bézier at parameter t.
 * B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
 */
function cubicBezier(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const u = 1 - t;
  const uu = u * u;
  const uuu = uu * u;
  const tt = t * t;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

/**
 * Flatten a path's Bézier segments into a polyline of sampled points.
 * Each segment with handles is sampled at BEZIER_SAMPLES intervals.
 * Segments without handles collapse to a single endpoint.
 */
function flattenPath(obj: PathObject): Vec2[] {
  const points: Vec2[] = [];
  const n = obj.nodes.length;
  if (n === 0) return points;

  points.push(obj.nodes[0]!.point);

  const segCount = obj.closed ? n : n - 1;
  for (let i = 0; i < segCount; i++) {
    const nodeA = obj.nodes[i]!;
    const nodeB = obj.nodes[(i + 1) % n]!;
    const p0 = nodeA.point;
    const p3 = nodeB.point;
    const p1 = nodeA.outHandle ?? nodeA.point;
    const p2 = nodeB.inHandle ?? nodeB.point;

    // Skip intermediate samples if both handles are at the endpoints (straight line)
    const isStraight =
      p1.x === p0.x && p1.y === p0.y &&
      p2.x === p3.x && p2.y === p3.y;

    if (isStraight) {
      points.push(p3);
    } else {
      // Sample the Bézier curve at BEZIER_SAMPLES intervals (skip t=0, already have it)
      for (let s = 1; s <= BEZIER_SAMPLES; s++) {
        const t = s / BEZIER_SAMPLES;
        points.push(cubicBezier(p0, p1, p2, p3, t));
      }
    }
  }
  return points;
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
