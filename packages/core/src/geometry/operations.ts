import type { Vec2 } from '@vectoria/shared';
import { createPathNode, getCubicSegment, isValidPathGeometry } from '../model/path.js';
import { normalizeCornerRadii } from '../model/shapes.js';
import type {
  CornerRadii,
  DocumentModel,
  ObjectId,
  PathNode,
  PathObject,
  SceneObject,
  StrokeStyle,
} from '../model/types.js';

export interface GeometryPreview {
  readonly operation: string;
  readonly originals: readonly ObjectId[];
  readonly proposed: readonly SceneObject[];
  readonly warnings: readonly string[];
}

export type CleanupFindingKind = 'empty-group' | 'orphan-point' | 'duplicate' | 'unused-style';
export type CleanupSeverity = 'info' | 'warning';

export interface CleanupFinding {
  readonly id: string;
  readonly kind: CleanupFindingKind;
  readonly targetIds: readonly string[];
  readonly severity: CleanupSeverity;
  readonly reason?: string;
  readonly proposedFix?: string;
}

export interface CleanupPlan {
  readonly findings: readonly CleanupFinding[];
  readonly selectedFindingIds: readonly string[];
}

export type CornerMode = 'rounded' | 'chamfer' | 'inverted';

export interface CornerOptions {
  readonly mode: CornerMode;
  readonly radius: number;
}

export interface OffsetOptions {
  readonly distance: number;
  readonly direction: 'inside' | 'outside';
}

const EPSILON = 1e-7;

export function createGeometryPreview(
  doc: DocumentModel,
  operation: string,
  objectIds: readonly ObjectId[],
  proposed: readonly SceneObject[],
  warnings: readonly string[] = [],
): GeometryPreview {
  void doc;
  return {
    operation,
    originals: objectIds,
    proposed,
    warnings,
  };
}

export function expandObject(object: SceneObject): SceneObject | null {
  if (object.type === 'path') return object;
  const nodes = object.type === 'rectangle'
    ? rectangleNodes(object.width, object.height, object.cornerRadius)
    : object.type === 'ellipse'
      ? ellipseNodes(object.width, object.height)
      : [createPathNode({ x: 0, y: 0 }), createPathNode(object.endPoint)];
  const path: PathObject = {
    ...object,
    type: 'path',
    nodes,
    closed: object.type !== 'line',
    style: object.type === 'line' ? { ...object.style, fill: { type: 'none' } } : object.style,
  };
  return isValidPathGeometry(path.nodes, path.closed) ? path : null;
}

export function applyCorners(path: PathObject, options: CornerOptions): { path: PathObject | null; warning?: string } {
  if (!Number.isFinite(options.radius) || options.radius < 0) {
    return { path: null, warning: 'Corner radius must be finite and non-negative.' };
  }
  if (!path.closed || path.nodes.length < 3) {
    return { path: null, warning: 'Corner operations require a closed path with at least three nodes.' };
  }
  if (options.radius <= EPSILON) return { path, warning: undefined };

  const nodes: PathNode[] = [];
  let clamped = false;
  for (let index = 0; index < path.nodes.length; index += 1) {
    const previous = path.nodes[(index - 1 + path.nodes.length) % path.nodes.length]!;
    const current = path.nodes[index]!;
    const next = path.nodes[(index + 1) % path.nodes.length]!;
    const incomingLength = distance(previous.point, current.point);
    const outgoingLength = distance(current.point, next.point);
    const radius = Math.min(options.radius, incomingLength / 2, outgoingLength / 2);
    clamped = clamped || radius < options.radius;
    if (radius <= EPSILON) {
      nodes.push({ ...current });
      continue;
    }

    const entry = moveTowards(current.point, previous.point, radius);
    const exit = moveTowards(current.point, next.point, radius);
    if (options.mode === 'chamfer') {
      nodes.push(createPathNode(entry, { id: current.id, kind: 'corner', inHandle: null, outHandle: null }));
      nodes.push(createPathNode(exit, { kind: 'corner', inHandle: null, outHandle: null }));
      continue;
    }

    if (options.mode === 'inverted') {
      const center = { x: (entry.x + exit.x) / 2, y: (entry.y + exit.y) / 2 };
      const inverted = moveAwayFrom(current.point, center, radius);
      nodes.push(createPathNode(entry, { id: current.id, kind: 'corner' }));
      nodes.push(createPathNode(inverted, { kind: 'corner' }));
      nodes.push(createPathNode(exit, { kind: 'corner' }));
      continue;
    }

    const tangent = distance(entry, exit) * 0.5522847498;
    nodes.push(createPathNode(entry, {
      id: current.id,
      kind: 'smooth',
      outHandle: moveTowards(entry, exit, tangent),
    }));
    nodes.push(createPathNode(exit, {
      kind: 'smooth',
      inHandle: moveTowards(exit, entry, tangent),
    }));
  }

  if (!isValidPathGeometry(nodes, true)) return { path: null, warning: 'Corner result is invalid and was rejected.' };
  return {
    path: { ...path, nodes },
    warning: clamped ? 'Radius was clamped to adjacent segment lengths.' : undefined,
  };
}

export function offsetPath(path: PathObject, options: OffsetOptions): { path: PathObject | null; warning?: string } {
  if (!Number.isFinite(options.distance) || options.distance < 0) {
    return { path: null, warning: 'Offset distance must be finite and non-negative.' };
  }
  if (!path.closed || path.nodes.length < 3) {
    return { path: null, warning: 'Offset requires a closed path with at least three nodes.' };
  }
  if (options.distance <= EPSILON) return { path, warning: undefined };

  const points = path.nodes.map((node) => node.point);
  if (options.direction === 'inside' && options.distance >= Math.min(...points.map((point, index) => distance(point, points[(index + 1) % points.length]!))) / 2) {
    return { path: null, warning: 'Offset creates a self-intersection or empty result.' };
  }
  const area = signedArea(points);
  if (Math.abs(area) <= EPSILON) return { path: null, warning: 'Offset requires non-collinear geometry.' };
  const outwardSign = area > 0 ? -1 : 1;
  const directionSign = options.direction === 'outside' ? outwardSign : -outwardSign;
  const result: PathNode[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length]!;
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    const first = offsetLine(previous, current, options.distance * directionSign);
    const second = offsetLine(current, next, options.distance * directionSign);
    const intersection = lineIntersection(first.start, first.end, second.start, second.end);
    if (!intersection || !Number.isFinite(intersection.x) || !Number.isFinite(intersection.y)) {
      return { path: null, warning: 'Offset creates a self-intersection or empty result.' };
    }
    result.push(createPathNode(intersection, { id: path.nodes[index]?.id, kind: path.nodes[index]?.kind ?? 'corner' }));
  }

  const resultArea = signedArea(result.map((node) => node.point));
  if (new Set(result.map((node) => `${node.point.x.toFixed(6)}:${node.point.y.toFixed(6)}`)).size < 3 || area * resultArea <= EPSILON || !isValidPathGeometry(result, true)) {
    return { path: null, warning: 'Offset creates a self-intersection or empty result.' };
  }
  return { path: { ...path, nodes: result } };
}

export function outlineStroke(path: PathObject, stroke: StrokeStyle): { path: PathObject | null; warning?: string } {
  if (!Number.isFinite(stroke.width) || stroke.width <= 0) return { path: null, warning: 'Stroke width must be positive and finite.' };
  const points = samplePath(path);
  if (points.length < 2) return { path: null, warning: 'Cannot outline an empty path.' };
  const radius = stroke.width / 2;
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const previous = points[Math.max(0, index - 1)]!;
    const next = points[Math.min(points.length - 1, index + 1)]!;
    const length = Math.hypot(next.x - previous.x, next.y - previous.y) || 1;
    const normal = { x: -(next.y - previous.y) / length * radius, y: (next.x - previous.x) / length * radius };
    left.push({ x: points[index]!.x + normal.x, y: points[index]!.y + normal.y });
    right.push({ x: points[index]!.x - normal.x, y: points[index]!.y - normal.y });
  }
  const outline = [...left, ...right.reverse()];
  const nodes = outline.map((point, index) => createPathNode(point, { id: index < path.nodes.length ? path.nodes[index]?.id : undefined }));
  if (!isValidPathGeometry(nodes, true)) return { path: null, warning: 'Stroke outline result is invalid and was rejected.' };
  return {
    path: {
      ...path,
      nodes,
      closed: true,
      style: {
        ...path.style,
        fill: path.style.fill.type === 'none' ? { type: 'solid', color: stroke.color } : path.style.fill,
        stroke: null,
      },
    },
  };
}

export function scanCleanup(doc: DocumentModel): CleanupPlan {
  const findings: CleanupFinding[] = [];
  for (const object of Object.values(doc.objects)) {
    if (object.type === 'path' && object.nodes.length < (object.closed ? 3 : 2)) {
      findings.push({ id: `orphan-point:${object.id}`, kind: 'orphan-point', targetIds: [object.id], severity: 'warning', reason: 'Path has too few nodes.', proposedFix: 'Remove invalid path.' });
    }
  }

  const objects = Object.values(doc.objects);
  for (let first = 0; first < objects.length; first += 1) {
    for (let second = first + 1; second < objects.length; second += 1) {
      if (sameGeometry(objects[first]!, objects[second]!)) {
        findings.push({ id: `duplicate:${objects[first]!.id}:${objects[second]!.id}`, kind: 'duplicate', targetIds: [objects[second]!.id], severity: 'warning', reason: 'Geometry, style and transform match within tolerance.', proposedFix: 'Remove later duplicate.' });
      }
    }
  }

  return { findings, selectedFindingIds: findings.map((finding) => finding.id) };
}

export function normalizeShapeRadii(object: Extract<SceneObject, { type: 'rectangle' }>): CornerRadii {
  return normalizeCornerRadii(object.cornerRadius, object.width, object.height);
}

function rectangleNodes(width: number, height: number, cornerRadius: number | CornerRadii): PathNode[] {
  const radii = normalizeCornerRadii(cornerRadius, width, height);
  const k = 0.5522847498;
  const corners = [
    { point: { x: 0, y: 0 }, radius: radii.topLeft, next: { x: 1, y: 0 }, previous: { x: 0, y: 1 } },
    { point: { x: width, y: 0 }, radius: radii.topRight, next: { x: 0, y: 1 }, previous: { x: -1, y: 0 } },
    { point: { x: width, y: height }, radius: radii.bottomRight, next: { x: -1, y: 0 }, previous: { x: 0, y: -1 } },
    { point: { x: 0, y: height }, radius: radii.bottomLeft, next: { x: 0, y: -1 }, previous: { x: 1, y: 0 } },
  ];
  const nodes: PathNode[] = [];
  for (const corner of corners) {
    const entry = { x: corner.point.x + corner.previous.x * corner.radius, y: corner.point.y + corner.previous.y * corner.radius };
    const exit = { x: corner.point.x + corner.next.x * corner.radius, y: corner.point.y + corner.next.y * corner.radius };
    nodes.push(createPathNode(entry, { kind: corner.radius > EPSILON ? 'smooth' : 'corner', outHandle: corner.radius > EPSILON ? { x: entry.x + (exit.x - entry.x) * k, y: entry.y + (exit.y - entry.y) * k } : null }));
    if (corner.radius > EPSILON) nodes.push(createPathNode(exit, { kind: 'smooth', inHandle: { x: exit.x - (exit.x - entry.x) * k, y: exit.y - (exit.y - entry.y) * k } }));
  }
  return nodes;
}

function ellipseNodes(width: number, height: number): PathNode[] {
  const rx = width / 2;
  const ry = height / 2;
  const k = 0.5522847498;
  return [
    createPathNode({ x: rx, y: 0 }, { kind: 'smooth', inHandle: { x: rx - k * rx, y: 0 }, outHandle: { x: rx + k * rx, y: 0 } }),
    createPathNode({ x: width, y: ry }, { kind: 'smooth', inHandle: { x: width, y: ry - k * ry }, outHandle: { x: width, y: ry + k * ry } }),
    createPathNode({ x: rx, y: height }, { kind: 'smooth', inHandle: { x: rx + k * rx, y: height }, outHandle: { x: rx - k * rx, y: height } }),
    createPathNode({ x: 0, y: ry }, { kind: 'smooth', inHandle: { x: 0, y: ry + k * ry }, outHandle: { x: 0, y: ry - k * ry } }),
  ];
}

function samplePath(path: PathObject): Vec2[] {
  const points: Vec2[] = [];
  const segments = path.closed ? path.nodes.length : path.nodes.length - 1;
  for (let index = 0; index < segments; index += 1) {
    const segment = getCubicSegment(path.nodes, index, path.closed);
    if (!segment) continue;
    for (let step = index === 0 ? 0 : 1; step <= 8; step += 1) {
      const t = step / 8;
      const u = 1 - t;
      points.push({
        x: u ** 3 * segment.start.x + 3 * u ** 2 * t * segment.control1.x + 3 * u * t ** 2 * segment.control2.x + t ** 3 * segment.end.x,
        y: u ** 3 * segment.start.y + 3 * u ** 2 * t * segment.control1.y + 3 * u * t ** 2 * segment.control2.y + t ** 3 * segment.end.y,
      });
    }
  }
  return points;
}

function sameGeometry(first: SceneObject, second: SceneObject): boolean {
  if (first.type !== second.type || JSON.stringify(first.style) !== JSON.stringify(second.style)) return false;
  if (first.transform.rotation !== second.transform.rotation || !samePoint(first.transform.position, second.transform.position) || !samePoint(first.transform.scale, second.transform.scale)) return false;
  if (first.type === 'rectangle' && second.type === 'rectangle') return first.width === second.width && first.height === second.height && JSON.stringify(normalizeCornerRadii(first.cornerRadius, first.width, first.height)) === JSON.stringify(normalizeCornerRadii(second.cornerRadius, second.width, second.height));
  if (first.type === 'ellipse' && second.type === 'ellipse') return first.width === second.width && first.height === second.height;
  if (first.type === 'line' && second.type === 'line') return samePoint(first.endPoint, second.endPoint);
  if (first.type === 'path' && second.type === 'path') return first.closed === second.closed && first.nodes.length === second.nodes.length && first.nodes.every((node, index) => samePoint(node.point, second.nodes[index]!.point));
  return false;
}

function samePoint(first: Vec2, second: Vec2): boolean {
  return Math.abs(first.x - second.x) <= EPSILON && Math.abs(first.y - second.y) <= EPSILON;
}

function distance(first: Vec2, second: Vec2): number { return Math.hypot(second.x - first.x, second.y - first.y); }
function moveTowards(from: Vec2, to: Vec2, amount: number): Vec2 { const length = distance(from, to) || 1; return { x: from.x + (to.x - from.x) / length * amount, y: from.y + (to.y - from.y) / length * amount }; }
function moveAwayFrom(from: Vec2, to: Vec2, amount: number): Vec2 { const length = distance(from, to) || 1; return { x: from.x + (from.x - to.x) / length * amount, y: from.y + (from.y - to.y) / length * amount }; }
function signedArea(points: readonly Vec2[]): number { return points.reduce((sum, point, index) => { const next = points[(index + 1) % points.length]!; return sum + point.x * next.y - next.x * point.y; }, 0) / 2; }
function offsetLine(start: Vec2, end: Vec2, distanceValue: number): { start: Vec2; end: Vec2 } { const length = distance(start, end) || 1; const normal = { x: -(end.y - start.y) / length * distanceValue, y: (end.x - start.x) / length * distanceValue }; return { start: { x: start.x + normal.x, y: start.y + normal.y }, end: { x: end.x + normal.x, y: end.y + normal.y } }; }
function lineIntersection(firstStart: Vec2, firstEnd: Vec2, secondStart: Vec2, secondEnd: Vec2): Vec2 | null { const denominator = (firstStart.x - firstEnd.x) * (secondStart.y - secondEnd.y) - (firstStart.y - firstEnd.y) * (secondStart.x - secondEnd.x); if (Math.abs(denominator) <= EPSILON) return null; const firstFactor = firstStart.x * firstEnd.y - firstStart.y * firstEnd.x; const secondFactor = secondStart.x * secondEnd.y - secondStart.y * secondEnd.x; return { x: (firstFactor * (secondStart.x - secondEnd.x) - (firstStart.x - firstEnd.x) * secondFactor) / denominator, y: (firstFactor * (secondStart.y - secondEnd.y) - (firstStart.y - firstEnd.y) * secondFactor) / denominator }; }
