import { mat3TransformPoint } from '@vectoria/shared';
import { expandObject } from './operations.js';
import { getTransformMatrix } from '../model/transform.js';
import { createPathNode, isValidPathGeometry } from '../model/path.js';
import type { BooleanOperation, BooleanPreview, DocumentModel, ObjectId, PathObject, SceneObject } from '../model/types.js';

interface Polygon { points: readonly { x: number; y: number }[]; source: ObjectId; }
interface Edge { start: Point; end: Point; }
type Point = { x: number; y: number };

const EPSILON = 1e-7;

/** Normalizes supported scene objects into immutable world-space polygons. */
export function normalizeBooleanInput(doc: DocumentModel, ids: readonly ObjectId[]): Polygon[] {
  return ids.flatMap((id) => {
    const source = doc.objects[id];
    const path = source ? normalizeObjectPath(source) : null;
    if (!path || path.type !== 'path' || !path.closed || !isValidPathGeometry(path.nodes, true)) return [];
    const points = samplePath(path);
    return points.length >= 3 ? [{ points, source: id }] : [];
  });
}

export function normalizeObjectPath(source: SceneObject): PathObject | null {
  const path = expandObject(source);
  if (!path || path.type !== 'path' || !path.closed || !isValidPathGeometry(path.nodes, true)) return null;
  const matrix = getTransformMatrix(path.transform);
  return { ...path, transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } }, nodes: path.nodes.map((node) => ({ ...node, point: mat3TransformPoint(matrix, node.point), inHandle: node.inHandle ? mat3TransformPoint(matrix, node.inHandle) : null, outHandle: node.outHandle ? mat3TransformPoint(matrix, node.outHandle) : null })) };
}

/** Computes a boolean preview without mutating source objects. */
export function previewBoolean(doc: DocumentModel, operation: BooleanOperation, ids: readonly ObjectId[]): BooleanPreview {
  const polygons = normalizeBooleanInput(doc, ids);
  const warnings: string[] = [];
  if (ids.length < 2) warnings.push('Boolean operations require at least two closed objects.');
  if (polygons.length !== ids.length) warnings.push('Open, invalid or unsupported geometry was skipped.');
  if (polygons.length < 2) return { operation, inputIds: ids, result: [], warnings };
  const source = doc.objects[ids[0]!];
  if (!source) return { operation, inputIds: ids, result: [], warnings: ['Selection contains missing objects.'] };
  const paths = booleanPolygons(operation, polygons, source);
  if (paths.length === 0) warnings.push('Boolean result is empty.');
  return { operation, inputIds: ids, result: paths, warnings };
}

function booleanPolygons(operation: BooleanOperation, polygons: readonly Polygon[], source: SceneObject): PathObject[] {
  const xValues = uniqueCoordinates(polygons.flatMap((polygon) => polygon.points.map((point) => point.x)));
  const yValues = uniqueCoordinates(polygons.flatMap((polygon) => polygon.points.map((point) => point.y)));
  if (operation === 'divide') {
    return polygons.flatMap((polygon, polygonIndex) => {
      const cells = cellsForPolygon(polygon, xValues, yValues);
      return traceLoops(xValues, yValues, cells).map((points, index) => makeResultPath(source, points, `${source.id}-divide-${polygonIndex + 1}-${index + 1}`));
    });
  }
  const filled = new Set<string>();
  for (let x = 0; x < xValues.length - 1; x += 1) for (let y = 0; y < yValues.length - 1; y += 1) {
    const point = { x: (xValues[x]! + xValues[x + 1]!) / 2, y: (yValues[y]! + yValues[y + 1]!) / 2 };
    const memberships = polygons.map((polygon) => pointInPolygon(point, polygon.points));
    const value = operation === 'unite' ? memberships.some(Boolean)
      : operation === 'subtract' ? Boolean(memberships[0]) && !memberships.slice(1).some(Boolean)
        : operation === 'intersect' || operation === 'crop' ? memberships.every(Boolean)
          : operation === 'exclude' ? memberships.filter(Boolean).length % 2 === 1
            : false;
    if (value) filled.add(`${x}:${y}`);
  }
  const loops = traceLoops(xValues, yValues, filled);
  // Holes fall out of the grid trace as separate inner loops; emitting them as
  // standalone filled paths would paint the hole shut. Glue every loop into one
  // evenodd compound so containment semantics survive rendering and export.
  if (loops.length === 0) return [];
  if (loops.length === 1) return [makeResultPath(source, loops[0]!, source.id)];
  const [outer, ...inner] = sortLoopsByAreaDesc(loops);
  if (!outer) return [];
  const compound = makeResultPath(source, outer, source.id);
  return [{
    ...compound,
    name: `${source.name} Boolean`,
    fillRule: 'evenodd',
    compoundChildren: inner.map((points) => points.map((point) => createPathNode(point))),
  }];
}

/** Outer loop first (largest signed extent), holes after — stable evenodd order. */
function sortLoopsByAreaDesc(loops: readonly Point[][]): Point[][] {
  const area = (loop: readonly Point[]): number => loop.reduce((sum, point, index) => {
    const next = loop[(index + 1) % loop.length]!;
    return sum + point.x * next.y - next.x * point.y;
  }, 0);
  return [...loops].sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
}

function cellsForPolygon(polygon: Polygon, xs: readonly number[], ys: readonly number[]): Set<string> {
  const cells = new Set<string>();
  for (let x = 0; x < xs.length - 1; x += 1) for (let y = 0; y < ys.length - 1; y += 1) {
    if (pointInPolygon({ x: (xs[x]! + xs[x + 1]!) / 2, y: (ys[y]! + ys[y + 1]!) / 2 }, polygon.points)) cells.add(`${x}:${y}`);
  }
  return cells;
}

function traceLoops(xs: readonly number[], ys: readonly number[], filled: ReadonlySet<string>): Point[][] {
  const edges: Edge[] = [];
  const has = (x: number, y: number) => filled.has(`${x}:${y}`);
  for (let x = 0; x < xs.length - 1; x += 1) for (let y = 0; y < ys.length - 1; y += 1) if (has(x, y)) {
    if (!has(x - 1, y)) edges.push({ start: { x: xs[x]!, y: ys[y + 1]! }, end: { x: xs[x]!, y: ys[y]! } });
    if (!has(x, y - 1)) edges.push({ start: { x: xs[x]!, y: ys[y]! }, end: { x: xs[x + 1]!, y: ys[y]! } });
    if (!has(x + 1, y)) edges.push({ start: { x: xs[x + 1]!, y: ys[y]! }, end: { x: xs[x + 1]!, y: ys[y + 1]! } });
    if (!has(x, y + 1)) edges.push({ start: { x: xs[x + 1]!, y: ys[y + 1]! }, end: { x: xs[x]!, y: ys[y + 1]! } });
  }
  const loops: Point[][] = [];
  while (edges.length) {
    const first = edges.pop()!;
    const loop = [first.start, first.end];
    let cursor = first.end;
    while (!samePoint(cursor, loop[0]!)) {
      const index = edges.findIndex((edge) => samePoint(edge.start, cursor));
      if (index < 0) break;
      const edge = edges.splice(index, 1)[0]!;
      cursor = edge.end;
      loop.push(cursor);
    }
    loop.pop();
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

function makeResultPath(source: SceneObject, points: readonly Point[], id: string): PathObject {
  return {
    id, name: `${source.name} Boolean`, layerId: source.layerId, type: 'path', visible: source.visible, locked: source.locked,
    transform: { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } }, style: source.style,
    closed: true, nodes: points.map((point, index) => createPathNode(point, { id: `${id}-node-${index + 1}` })),
  };
}

function samplePath(path: PathObject): Point[] {
  const points: Point[] = [];
  for (let index = 0; index < path.nodes.length; index += 1) {
    const node = path.nodes[index]!;
    points.push(node.point);
  }
  return points;
}

function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index]!, b = polygon[previous]!;
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function uniqueCoordinates(values: readonly number[]): number[] {
  return [...new Set(values.filter(Number.isFinite).sort((a, b) => a - b))];
}

function samePoint(a: Point, b: Point): boolean { return Math.abs(a.x - b.x) <= EPSILON && Math.abs(a.y - b.y) <= EPSILON; }
