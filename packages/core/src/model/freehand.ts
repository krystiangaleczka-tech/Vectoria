import { generateId, type Vec2 } from '@vectoria/shared';
import type { PathNode, PathObject, WidthPoint } from './types.js';
import { createPathNode, evaluateCubic, getCubicSegment, isValidPathGeometry } from './path.js';

export interface FreehandSample {
  readonly point: Vec2;
  readonly pressure?: number;
  readonly time: number;
}

export interface FreehandDraft {
  readonly samples: readonly FreehandSample[];
  readonly smoothing: number;
  readonly width: number;
}

export interface PathPreview {
  readonly originalId: string;
  readonly proposed: PathObject;
  readonly operation: string;
}

export const MAX_FREEHAND_NODES = 2000;

const finitePoint = (point: Vec2): boolean => Number.isFinite(point.x) && Number.isFinite(point.y);
const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Remove invalid and duplicate samples before geometry algorithms consume input. */
export function normalizeFreehandSamples(samples: readonly FreehandSample[], minDistance = 0.5): FreehandSample[] {
  const result: FreehandSample[] = [];
  for (const sample of samples) {
    if (!finitePoint(sample.point) || !Number.isFinite(sample.time)) continue;
    const pressure = sample.pressure === undefined ? undefined : clamp(sample.pressure, 0, 1);
    const normalized = pressure === undefined ? sample : { ...sample, pressure };
    const previous = result.at(-1);
    if (previous && distance(previous.point, normalized.point) < Math.max(0, minDistance)) continue;
    result.push(normalized);
  }
  return result;
}

/** Smooth a polyline while preserving endpoints, so open paths remain editable. */
export function smoothPolyline(points: readonly Vec2[], amount: number): Vec2[] {
  if (points.length < 3) return [...points];
  const strength = clamp(amount, 0, 100) / 100;
  if (strength === 0) return [...points];
  const passes = strength > 66 ? 2 : 1;
  let current = [...points];
  for (let pass = 0; pass < passes; pass += 1) {
    current = current.map((point, index, all) => {
      if (index === 0 || index === all.length - 1) return point;
      const previous = all[index - 1]!;
      const next = all[index + 1]!;
      const average = { x: (previous.x + point.x + next.x) / 3, y: (previous.y + point.y + next.y) / 3 };
      return { x: point.x + (average.x - point.x) * strength, y: point.y + (average.y - point.y) * strength };
    });
  }
  return current;
}

/** Reduce polyline nodes with Ramer-Douglas-Peucker and preserve endpoints. */
export function simplifyPolyline(points: readonly Vec2[], tolerance: number): Vec2[] {
  if (points.length <= 2) return [...points];
  const squaredTolerance = Math.max(0, tolerance) ** 2;
  const keep = new Set([0, points.length - 1]);
  const simplify = (start: number, end: number): void => {
    let furthest = -1;
    let maxDistance = squaredTolerance;
    for (let index = start + 1; index < end; index += 1) {
      const candidate = points[index];
      if (!candidate) continue;
      const deviation = squaredSegmentDistance(candidate, points[start]!, points[end]!);
      if (deviation > maxDistance) {
        maxDistance = deviation;
        furthest = index;
      }
    }
    if (furthest >= 0) {
      keep.add(furthest);
      simplify(start, furthest);
      simplify(furthest, end);
    }
  };
  simplify(0, points.length - 1);
  return [...keep].sort((a, b) => a - b).map((index) => points[index]!);
}

/** Convert freehand samples into bounded path nodes with optional cubic handles. */
export function freehandSamplesToPathNodes(samples: readonly FreehandSample[], smoothing = 0, maxNodes = MAX_FREEHAND_NODES): PathNode[] {
  const normalized = normalizeFreehandSamples(samples);
  if (normalized.length < 2) return [];
  const raw = normalized.map((sample) => sample.point);
  const smoothed = smoothPolyline(raw, smoothing);
  const tolerance = Math.max(0.05, (100 - clamp(smoothing, 0, 100)) * 0.015);
  let points = simplifyPolyline(smoothed, tolerance);
  if (points.length > maxNodes) points = evenlySample(points, maxNodes);
  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)]!;
    const next = points[Math.min(points.length - 1, index + 1)]!;
    const tangent = { x: next.x - previous.x, y: next.y - previous.y };
    const tangentLength = Math.hypot(tangent.x, tangent.y);
    if (index === 0 || index === points.length - 1 || tangentLength === 0 || smoothing === 0) return createPathNode(point, { kind: 'corner' });
    const handleLength = Math.min(distance(previous, point), distance(point, next)) * 0.28;
    const unit = { x: tangent.x / tangentLength, y: tangent.y / tangentLength };
    return createPathNode(point, {
      kind: 'smooth',
      inHandle: { x: point.x - unit.x * handleLength, y: point.y - unit.y * handleLength },
      outHandle: { x: point.x + unit.x * handleLength, y: point.y + unit.y * handleLength },
    });
  });
}

/** Map stylus pressure to safe stroke width; mouse input uses pressure one. */
export function pressureToWidth(baseWidth: number, pressure = 1): number {
  const base = Number.isFinite(baseWidth) ? Math.max(0.1, baseWidth) : 1;
  const normalized = clamp(Number.isFinite(pressure) ? pressure : 1, 0, 1);
  return base * (0.35 + 0.65 * normalized ** 0.7);
}

/** Normalize width profile values and ensure endpoints describe complete stroke. */
export function normalizeWidthProfile(points: readonly WidthPoint[] | undefined, fallbackWidth: number): WidthPoint[] {
  const fallback = Math.max(0.1, Number.isFinite(fallbackWidth) ? fallbackWidth : 1);
  const normalized = (points ?? []).filter((point) => Number.isFinite(point.t) && Number.isFinite(point.width)).map((point) => ({ t: clamp(point.t, 0, 1), width: Math.max(0.1, point.width) })).sort((a, b) => a.t - b.t);
  const deduped: WidthPoint[] = [];
  for (const point of normalized) {
    if (deduped.at(-1)?.t === point.t) deduped[deduped.length - 1] = point;
    else deduped.push(point);
  }
  if (deduped[0]?.t !== 0) deduped.unshift({ t: 0, width: fallback });
  if (deduped.at(-1)?.t !== 1) deduped.push({ t: 1, width: fallback });
  return deduped;
}

export function widthProfileFromSamples(samples: readonly FreehandSample[], baseWidth: number): WidthPoint[] {
  const normalized = normalizeFreehandSamples(samples, 0);
  if (normalized.length === 0) return normalizeWidthProfile(undefined, baseWidth);
  const lengths = normalized.map((sample, index) => index === 0 ? 0 : distance(sample.point, normalized[index - 1]!.point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let travelled = 0;
  return normalized.map((sample, index) => {
    if (index > 0) travelled += lengths[index]!;
    return { t: total === 0 ? index / Math.max(1, normalized.length - 1) : travelled / total, width: pressureToWidth(baseWidth, sample.pressure ?? 1) };
  });
}

export function widthAtT(points: readonly WidthPoint[], t: number): number {
  const profile = normalizeWidthProfile(points, points[0]?.width ?? 1);
  const value = clamp(t, 0, 1);
  const rightIndex = profile.findIndex((point) => point.t >= value);
  if (rightIndex <= 0) return profile[0]!.width;
  if (rightIndex < 0) return profile.at(-1)!.width;
  const left = profile[rightIndex - 1]!;
  const right = profile[rightIndex]!;
  const ratio = right.t === left.t ? 0 : (value - left.t) / (right.t - left.t);
  return left.width + (right.width - left.width) * ratio;
}

/** Flatten path geometry into a bounded polyline for hit-testing and cut operations. */
export function flattenPath(path: Pick<PathObject, 'nodes' | 'closed'>, stepsPerSegment = 12): Vec2[] {
  const points: Vec2[] = [];
  const segments = path.closed ? path.nodes.length : path.nodes.length - 1;
  for (let index = 0; index < segments; index += 1) {
    const segment = getCubicSegment(path.nodes, index, path.closed);
    if (!segment) continue;
    const steps = Math.max(2, Math.min(64, Math.floor(stepsPerSegment)));
    for (let step = index === 0 ? 0 : 1; step <= steps; step += 1) points.push(evaluateCubic(segment, step / steps));
  }
  return points;
}

export function nearestPointOnPolyline(point: Vec2, polyline: readonly Vec2[]): { point: Vec2; distance: number; index: number; t: number } | null {
  let best: { point: Vec2; distance: number; index: number; t: number } | null = null;
  for (let index = 0; index < polyline.length - 1; index += 1) {
    const start = polyline[index]!;
    const end = polyline[index + 1]!;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0 ? 0 : clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
    const candidate = { x: start.x + dx * t, y: start.y + dy * t };
    const candidateDistance = distance(point, candidate);
    if (!best || candidateDistance < best.distance) best = { point: candidate, distance: candidateDistance, index, t };
  }
  return best;
}

/** Create two open path fragments at nearest interior point, used by Scissors. */
export function splitPathAtPoint(path: PathObject, point: Vec2, tolerance: number): PathObject[] {
  const flattened = flattenPath(path);
  const nearest = nearestPointOnPolyline(point, flattened);
  if (!nearest || nearest.distance > tolerance || nearest.index <= 0 || nearest.index >= flattened.length - 2) return [];
  const firstPoints = [...flattened.slice(0, nearest.index + 1), nearest.point];
  const secondPoints = [nearest.point, ...flattened.slice(nearest.index + 1)];
  return makeFragments(path, firstPoints, secondPoints);
}

/** Split path with a cutter polyline; returns empty when cutter misses or touches once. */
export function splitPathByPolyline(path: PathObject, cutter: readonly Vec2[], tolerance = 0): PathObject[] {
  if (cutter.length < 2) return [];
  const flattened = flattenPath(path);
  const intersections: Vec2[] = [];
  for (let i = 0; i < cutter.length - 1; i += 1) {
    for (let j = 0; j < flattened.length - 1; j += 1) {
      const intersection = lineIntersection(cutter[i]!, cutter[i + 1]!, flattened[j]!, flattened[j + 1]!);
      if (intersection && (!intersections.at(-1) || distance(intersections.at(-1)!, intersection) > Math.max(0.01, tolerance))) intersections.push(intersection);
    }
  }
  if (intersections.length < 2) return [];
  const first = nearestPointOnPolyline(intersections[0]!, flattened);
  const last = nearestPointOnPolyline(intersections.at(-1)!, flattened);
  if (!first || !last || first.index === last.index && Math.abs(first.t - last.t) < 0.01) return [];
  const startIndex = Math.min(first.index, last.index);
  const endIndex = Math.max(first.index, last.index);
  const startPoint = first.index <= last.index ? first.point : last.point;
  const endPoint = first.index <= last.index ? last.point : first.point;
  const left = [startPoint, ...flattened.slice(startIndex + 1, endIndex + 1), endPoint];
  const right = [endPoint, ...flattened.slice(endIndex + 1), ...flattened.slice(0, startIndex + 1), startPoint];
  return makeFragments(path, left, right);
}

/** Remove portions of a path inside eraser radius and return surviving fragments. */
export function erasePath(path: PathObject, eraser: readonly Vec2[], radius: number): PathObject[] {
  if (eraser.length < 1 || !Number.isFinite(radius) || radius <= 0) return [];
  const points = flattenPath(path);
  const fragments: Vec2[][] = [];
  let current: Vec2[] = [];
  for (const point of points) {
    const inside = eraser.some((eraserPoint, index) => {
      if (distance(point, eraserPoint) <= radius) return true;
      const next = eraser[index + 1];
      return next ? nearestPointOnPolyline(point, [eraserPoint, next])!.distance <= radius : false;
    });
    if (inside) {
      if (current.length >= 2) fragments.push(current);
      current = [];
    } else current.push(point);
  }
  if (current.length >= 2) fragments.push(current);
  return fragments.map((fragment) => makeFragment(path, fragment));
}

function makeFragments(path: PathObject, first: readonly Vec2[], second: readonly Vec2[]): PathObject[] {
  return [first, second].filter((points) => points.length >= 2).map((points) => makeFragment(path, points));
}

function makeFragment(path: PathObject, points: readonly Vec2[]): PathObject {
  const nodes = points.map((point) => createPathNode(point, { kind: 'corner' }));
  return { ...path, id: generateId(), name: `${path.name} fragment`, nodes, closed: false, widthProfile: undefined };
}

function evenlySample(points: readonly Vec2[], count: number): Vec2[] {
  if (count >= points.length) return [...points];
  return Array.from({ length: count }, (_, index) => points[Math.round(index * (points.length - 1) / (count - 1))]!);
}

function squaredSegmentDistance(point: Vec2, start: Vec2, end: Vec2): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return (point.x - start.x) ** 2 + (point.y - start.y) ** 2;
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy), 0, 1);
  return (point.x - (start.x + t * dx)) ** 2 + (point.y - (start.y + t * dy)) ** 2;
}

function lineIntersection(a: Vec2, b: Vec2, c: Vec2, d: Vec2): Vec2 | null {
  const denominator = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(denominator) < 1e-9) return null;
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / denominator;
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / denominator;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) } : null;
}

export function isValidFreehandPath(path: PathObject): boolean {
  return isValidPathGeometry(path.nodes, path.closed) && path.nodes.every((node) => finitePoint(node.point));
}
