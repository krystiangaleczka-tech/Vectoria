import type { Vec2 } from '@vectoria/shared';
import { rectContainsPoint } from '@vectoria/shared';
import type { DocumentModel, SceneObject, ObjectId, RectangleObject, EllipseObject, LineObject, PathObject, PolygonObject, StarObject, ArcObject, PieObject, RingObject, SpiralObject, CalloutObject, PolylineObject, TextObject, TextFrameObject } from '@vectoria/core';
import { getTransformMatrix, getObjectBounds, normalizeCornerRadii, getPolygonVertices, getStarVertices, approximateArc, getSpiralVertices, getCalloutVertices, computeArtisticTextLayout } from '@vectoria/core';
import { mat3Inverse, mat3TransformPoint } from '@vectoria/shared';
import type { Rect } from '@vectoria/shared';

export interface HitTestOptions {
  /** Screen-space tolerance converted to world units using zoom. */
  readonly tolerancePx?: number;
  readonly zoom?: number;
  readonly visibleWorldRect?: Rect;
  readonly allowedObjectIds?: ReadonlySet<ObjectId>;
  readonly includeLocked?: boolean;
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
  options: HitTestOptions = {}
): ObjectId | null {
  const { visibleWorldRect, includeLocked } = options;
  // Iterate layers top-to-bottom
  for (let li = doc.layerIds.length - 1; li >= 0; li--) {
    const layerId = doc.layerIds[li]!;
    const layer = doc.layers[layerId];
    if (!layer || !layer.visible || (!includeLocked && layer.locked)) continue;

    // Iterate objects top-to-bottom within layer
    for (let oi = layer.objectIds.length - 1; oi >= 0; oi--) {
      const objectId = layer.objectIds[oi]!;
      const obj = doc.objects[objectId];
      if (!obj || !obj.visible || (!includeLocked && obj.locked)) continue;
      if (visibleWorldRect) {
        const bounds = getObjectBounds(obj, doc);
        if (bounds.x > visibleWorldRect.x + visibleWorldRect.width || bounds.x + bounds.width < visibleWorldRect.x || bounds.y > visibleWorldRect.y + visibleWorldRect.height || bounds.y + bounds.height < visibleWorldRect.y) continue;
      }

       if (hitTestDocumentObject(doc, obj, worldPoint, 4, options)) {
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
    if (!layer || !layer.visible || (!options.includeLocked && layer.locked)) continue;
    const order = options.allowedObjectIds
      ? flattenObjects(doc, layer.objectIds).filter((object) => options.allowedObjectIds!.has(object.id)).map((object) => object.id)
      : layer.objectIds;
    for (let oi = order.length - 1; oi >= 0; oi -= 1) {
      const object = doc.objects[order[oi]!];
      if (!object || !object.visible || (!options.includeLocked && object.locked)) continue;
       if (options.visibleWorldRect && !rectsOverlap(getObjectBounds(object, doc), options.visibleWorldRect)) continue;
       if (!hitTestDocumentObject(doc, object, worldPoint, toleranceWorld, options)) continue;
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
    case 'polygon':
    case 'star':
    case 'callout':
      return hitTestVertexShape(obj as PolygonObject | StarObject | CalloutObject, worldPoint, toleranceWorld);
    case 'arc':
      return hitTestArc(obj as ArcObject, worldPoint, toleranceWorld);
    case 'pie':
      return hitTestPie(obj as PieObject, worldPoint, toleranceWorld);
    case 'ring':
      return hitTestRing(obj as RingObject, worldPoint, toleranceWorld);
    case 'spiral':
    case 'polyline':
      return hitTestOpenChain(obj as SpiralObject | PolylineObject, worldPoint, toleranceWorld);
    case 'text':
      return hitTestText(obj as TextObject, worldPoint, toleranceWorld);
    case 'text-frame':
      return hitTestTextFrame(obj as TextFrameObject, worldPoint, toleranceWorld);
    case 'group':
      return false;
    default:
      return false;
  }
}

function hitTestText(obj: TextObject, worldPoint: Vec2, toleranceWorld: number): boolean {
  const matrix = getTransformMatrix(obj.transform);
  const inv = mat3Inverse(matrix);
  if (!inv) return false;
  const local = mat3TransformPoint(inv, worldPoint);
  const layout = computeArtisticTextLayout(obj);
  const minX = layout.lines[0]?.x ?? 0;
  const maxX = minX + layout.width;
  const minY = 0;
  const maxY = layout.height;
  return (
    local.x >= minX - toleranceWorld &&
    local.x <= maxX + toleranceWorld &&
    local.y >= minY - toleranceWorld &&
    local.y <= maxY + toleranceWorld
  );
}

function hitTestTextFrame(obj: TextFrameObject, worldPoint: Vec2, toleranceWorld: number): boolean {
  const matrix = getTransformMatrix(obj.transform);
  const inv = mat3Inverse(matrix);
  if (!inv) return false;
  const local = mat3TransformPoint(inv, worldPoint);
  return (
    local.x >= -toleranceWorld &&
    local.x <= obj.width + toleranceWorld &&
    local.y >= -toleranceWorld &&
    local.y <= obj.height + toleranceWorld
  );
}

/** Vertex-loop shapes: point-in-polygon when filled, segment distance otherwise. */
function hitTestVertexShape(
  obj: PolygonObject | StarObject | CalloutObject,
  worldPoint: Vec2,
  toleranceWorld: number,
): boolean {
  const inv = mat3Inverse(getTransformMatrix(obj.transform));
  if (!inv) return false;
  const local = mat3TransformPoint(inv, worldPoint);
  const vertices = obj.type === 'polygon'
    ? getPolygonVertices(obj.sides, obj.radius)
    : obj.type === 'star'
      ? getStarVertices(obj.points, obj.outerRadius, obj.innerRadius)
      : getCalloutVertices(obj.width, obj.height, obj.cornerRadius, obj.tailTip, obj.tailBaseWidth);
  if (vertices.length < 2) return false;

  if (obj.style.fill.type !== 'none') return pointInPolygon(local, vertices);

  const tolerance = Math.max((obj.style.stroke?.width ?? 1) / 2, toleranceWorld);
  return polygonEdgeDistance(local, vertices) <= tolerance;
}

/**
 * Arc: sampled outline. Closed arcs allow chord fill (point-in-polygon on the
 * flattened loop); open arcs are stroke-only.
 */
function hitTestArc(obj: ArcObject, worldPoint: Vec2, toleranceWorld: number): boolean {
  const inv = mat3Inverse(getTransformMatrix(obj.transform));
  if (!inv) return false;
  const local = mat3TransformPoint(inv, worldPoint);
  const samples = approximateArc(obj.radiusX, obj.radiusY, obj.startAngle, obj.endAngle, 48);

  if (obj.closed && obj.style.fill.type !== 'none' && samples.length >= 3) {
    return pointInPolygon(local, samples);
  }

  const tolerance = Math.max((obj.style.stroke?.width ?? 1) / 2, toleranceWorld);
  if (polygonEdgeDistance(local, samples) <= tolerance) return true;
  if (obj.closed && samples.length >= 2) {
    return distancePointToSegment(local, samples[samples.length - 1]!, samples[0]!) <= tolerance;
  }
  return false;
}

/** Pie: inside the ellipse and within the angular sweep between start/end. */
function hitTestPie(obj: PieObject, worldPoint: Vec2, toleranceWorld: number): boolean {
  const inv = mat3Inverse(getTransformMatrix(obj.transform));
  if (!inv) return false;
  const local = mat3TransformPoint(inv, worldPoint);

  if (obj.style.fill.type !== 'none') {
    const norm = ((local.x / obj.radiusX) ** 2 + (local.y / obj.radiusY) ** 2);
    return norm <= 1 + (toleranceWorld / Math.min(obj.radiusX, obj.radiusY)) && angleWithinSweep(Math.atan2(local.y / obj.radiusY, local.x / obj.radiusX), obj.startAngle, obj.endAngle);
  }

  // Stroke-only pie: sample sector boundary (arc + two radii).
  const samples = approximateArc(obj.radiusX, obj.radiusY, obj.startAngle, obj.endAngle, 48);
  const tolerance = Math.max((obj.style.stroke?.width ?? 1) / 2, toleranceWorld);
  if (polygonEdgeDistance(local, samples) <= tolerance) return true;
  return distancePointToSegment(local, { x: 0, y: 0 }, samples[0]!) <= tolerance
    || distancePointToSegment(local, { x: 0, y: 0 }, samples[samples.length - 1]!) <= tolerance;
}

/** Ring: annulus — inside outer circle and outside inner hole. */
function hitTestRing(obj: RingObject, worldPoint: Vec2, toleranceWorld: number): boolean {
  const inv = mat3Inverse(getTransformMatrix(obj.transform));
  if (!inv) return false;
  const local = mat3TransformPoint(inv, worldPoint);
  const distance = Math.hypot(local.x, local.y);
  const halfStroke = Math.max((obj.style.stroke?.width ?? 0) / 2, obj.style.fill.type !== 'none' ? 0 : toleranceWorld);
  return distance <= obj.outerRadius + halfStroke && distance >= obj.innerRadius - halfStroke;
}

/** Open chains (spiral, polyline): distance to every sampled segment. */
function hitTestOpenChain(
  obj: SpiralObject | PolylineObject,
  worldPoint: Vec2,
  toleranceWorld: number,
): boolean {
  const inv = mat3Inverse(getTransformMatrix(obj.transform));
  if (!inv) return false;
  const local = mat3TransformPoint(inv, worldPoint);
  const points = obj.type === 'spiral'
    ? getSpiralVertices(obj.turns, obj.decay, obj.direction, 64)
    : [...obj.points];
  if (points.length < 2) return false;
  const tolerance = Math.max((obj.style.stroke?.width ?? 1) / 2, toleranceWorld);
  for (let i = 0; i < points.length - 1; i += 1) {
    if (distancePointToSegment(local, points[i]!, points[i + 1]!) <= tolerance) return true;
  }
  return false;
}

/** Distance from a point to the closest edge of a vertex loop. */
function polygonEdgeDistance(point: Vec2, vertices: readonly Vec2[]): number {
  let best = Infinity;
  for (let i = 0; i < vertices.length; i += 1) {
    best = Math.min(best, distancePointToSegment(point, vertices[i]!, vertices[(i + 1) % vertices.length]!));
  }
  return best;
}

/** Whether `angle` lies within the sweep from `start` to `end` (CCW positive). */
function angleWithinSweep(angle: number, start: number, end: number): boolean {
  const twoPi = Math.PI * 2;
  const normalized = (((angle - start) % twoPi) + twoPi) % twoPi;
  const sweep = end - start;
  if (sweep >= 0) return normalized <= sweep;
  return normalized >= twoPi + sweep;
}

export function hitTestDocumentObject(
  doc: DocumentModel,
  object: SceneObject,
  worldPoint: Vec2,
  toleranceWorld: number,
  options?: HitTestOptions
): boolean {
  if (object.type !== 'group') return hitTestObject(object, worldPoint, toleranceWorld);
  return object.childIds.some((childId) => {
    const child = doc.objects[childId];
    return child?.visible && (options?.includeLocked || !child.locked) && hitTestDocumentObject(doc, child, worldPoint, toleranceWorld, options);
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
  const childLoops = obj.compoundChildren ?? [];
  // Evenodd parity must count every loop of a compound path together.
  const allLoops: Vec2[][] = childLoops.length > 0
    ? [flatPoints, ...childLoops.map((nodes) => nodes.map((node) => node.point))]
    : [flatPoints];

  if (hasFill && obj.closed && flatPoints.length >= 3) {
    return childLoops.length > 0 ? pointInPolygonEvenOdd(local, allLoops) : pointInPolygon(local, flatPoints);
  }

  const strokeWidth = obj.style.stroke?.width ?? 1;
  const tolerance = Math.max(strokeWidth / 2, toleranceWorld);

  for (const loop of allLoops) {
    for (let i = 0; i < loop.length - (obj.closed && loop === flatPoints ? 0 : 1); i++) {
      const a = loop[i]!;
      const b = loop[(i + 1) % loop.length]!;
      if (distancePointToSegment(local, a, b) <= tolerance) return true;
    }
  }
  return false;
}

/** Evenodd parity across multiple closed loops (compound paths with holes). */
function pointInPolygonEvenOdd(point: Vec2, loops: readonly Vec2[][]): boolean {
  let inside = false;
  for (const loop of loops) {
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      const yi = loop[i]!.y;
      const yj = loop[j]!.y;
      const xi = loop[i]!.x;
      const xj = loop[j]!.x;
      const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
  }
  return inside;
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
