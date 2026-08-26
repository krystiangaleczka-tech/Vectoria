import { generateId, type Vec2 } from '@vectoria/shared';
import type { PathNode } from './types.js';

export interface CubicSegment {
  readonly start: Vec2;
  readonly control1: Vec2;
  readonly control2: Vec2;
  readonly end: Vec2;
}

const finite = (point: Vec2): boolean => Number.isFinite(point.x) && Number.isFinite(point.y);
const finiteOrNull = (point: Vec2 | null): boolean => point === null || finite(point);

export function createPathNode(point: Vec2, options: Partial<Omit<PathNode, 'point' | 'id'>> & { id?: string } = {}): PathNode {
  return { id: options.id ?? generateId(), point, inHandle: options.inHandle ?? null, outHandle: options.outHandle ?? null, kind: options.kind ?? 'corner' };
}

export function isValidPathGeometry(nodes: readonly PathNode[], closed: boolean): boolean {
  if (nodes.length < (closed ? 3 : 2)) return false;
  if (nodes.some((node) => node.id !== undefined && node.id.trim() === '')) return false;
  const ids = nodes.map((node) => node.id).filter((id): id is string => Boolean(id));
  if (new Set(ids).size !== ids.length) return false;
  return nodes.every((node) => (
    finite(node.point)
    && finiteOrNull(node.inHandle)
    && finiteOrNull(node.outHandle)
    && ['corner', 'cusp', 'smooth', 'symmetric', 'auto'].includes(node.kind)
  ));
}

export function getCubicSegment(nodes: readonly PathNode[], index: number, closed = false): CubicSegment | null {
  const nextIndex = index + 1 < nodes.length ? index + 1 : closed && nodes.length > 1 ? 0 : -1;
  const start = nodes[index];
  const end = nextIndex >= 0 ? nodes[nextIndex] : undefined;
  if (!start || !end) return null;
  return { start: start.point, control1: start.outHandle ?? start.point, control2: end.inHandle ?? end.point, end: end.point };
}

export function evaluateCubic(segment: CubicSegment, t: number): Vec2 {
  const u = 1 - t;
  return {
    x: u ** 3 * segment.start.x + 3 * u ** 2 * t * segment.control1.x + 3 * u * t ** 2 * segment.control2.x + t ** 3 * segment.end.x,
    y: u ** 3 * segment.start.y + 3 * u ** 2 * t * segment.control1.y + 3 * u * t ** 2 * segment.control2.y + t ** 3 * segment.end.y,
  };
}

const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export interface SplitCubic {
  readonly left: CubicSegment;
  readonly right: CubicSegment;
}

export function splitCubic(segment: CubicSegment, t = 0.5): SplitCubic {
  const q0 = lerp(segment.start, segment.control1, t);
  const q1 = lerp(segment.control1, segment.control2, t);
  const q2 = lerp(segment.control2, segment.end, t);
  const r0 = lerp(q0, q1, t);
  const r1 = lerp(q1, q2, t);
  const middle = lerp(r0, r1, t);
  return {
    left: { start: segment.start, control1: q0, control2: r0, end: middle },
    right: { start: middle, control1: r1, control2: q2, end: segment.end },
  };
}

export function reversePathNodes(nodes: readonly PathNode[]): PathNode[] {
  return [...nodes].reverse().map((node) => ({
    ...node,
    inHandle: node.outHandle,
    outHandle: node.inHandle,
  }));
}

export function applyNodeKind(node: PathNode, kind: PathNode['kind']): PathNode {
  if (kind === 'corner' || kind === 'cusp' || kind === 'auto') return { ...node, kind };
  const handle = node.outHandle ?? node.inHandle;
  if (!handle) return { ...node, kind };

  const vector = { x: handle.x - node.point.x, y: handle.y - node.point.y };
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) return { ...node, kind };

  const oppositeDirection = { x: node.point.x - vector.x, y: node.point.y - vector.y };
  if (kind === 'symmetric') {
    return node.outHandle
      ? { ...node, kind, inHandle: oppositeDirection, outHandle: handle }
      : { ...node, kind, inHandle: handle, outHandle: oppositeDirection };
  }

  // Smooth handles share a tangent but retain independent handle lengths.
  const incomingLength = node.inHandle
    ? Math.hypot(node.inHandle.x - node.point.x, node.inHandle.y - node.point.y)
    : length;
  const outgoingLength = node.outHandle
    ? Math.hypot(node.outHandle.x - node.point.x, node.outHandle.y - node.point.y)
    : length;
  const incoming = {
    x: node.point.x - (vector.x / length) * incomingLength,
    y: node.point.y - (vector.y / length) * incomingLength,
  };
  const outgoing = {
    x: node.point.x + (vector.x / length) * outgoingLength,
    y: node.point.y + (vector.y / length) * outgoingLength,
  };
  return node.outHandle
    ? { ...node, kind, inHandle: incoming, outHandle: node.outHandle }
    : { ...node, kind, inHandle: node.inHandle, outHandle: outgoing };
}

/**
 * Recompute handles for an 'auto' node from the tangent of its neighbouring
 * nodes: direction averaged across both segments, length adaptive to the
 * shorter adjacent segment. Keeps endpoints and degenerate geometry intact.
 */
export function applyAutoSmooth(node: PathNode, previous: PathNode | null, next: PathNode | null): PathNode {
  if (!previous && !next) return { ...node, kind: 'auto' };
  // Direction follows the path: averaged across both neighbours when present,
  // otherwise the single existing segment.
  const from = previous?.point ?? node.point;
  const to = next?.point ?? node.point;
  const tangent = { x: to.x - from.x, y: to.y - from.y };
  const tangentLength = Math.hypot(tangent.x, tangent.y);
  if (tangentLength === 0) return { ...node, kind: 'auto' };

  const unit = { x: tangent.x / tangentLength, y: tangent.y / tangentLength };
  const segmentIn = previous ? distance(previous.point, node.point) : Infinity;
  const segmentOut = next ? distance(node.point, next.point) : Infinity;
  const reference = Math.min(segmentIn, segmentOut);
  if (!Number.isFinite(reference) || reference === 0) return { ...node, kind: 'auto' };
  const handleLength = reference * 0.3;

  return {
    ...node,
    kind: 'auto',
    inHandle: { x: node.point.x - unit.x * handleLength, y: node.point.y - unit.y * handleLength },
    outHandle: { x: node.point.x + unit.x * handleLength, y: node.point.y + unit.y * handleLength },
  };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Move one handle while preserving node semantics for smooth/symmetric nodes. */
export function updatePathNodeHandle(node: PathNode, side: 'in' | 'out', handle: Vec2 | null): PathNode {  if (handle !== null && !finite(handle)) return node;
  const next: PathNode = side === 'in' ? { ...node, inHandle: handle } : { ...node, outHandle: handle };
  if ((node.kind !== 'smooth' && node.kind !== 'symmetric') || handle === null) return next;

  const vector = { x: handle.x - node.point.x, y: handle.y - node.point.y };
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) return next;

  if (node.kind === 'symmetric') {
    return side === 'in'
      ? { ...next, outHandle: { x: node.point.x - vector.x, y: node.point.y - vector.y } }
      : { ...next, inHandle: { x: node.point.x - vector.x, y: node.point.y - vector.y } };
  }

  const opposite = side === 'in' ? node.outHandle : node.inHandle;
  const oppositeLength = opposite
    ? Math.hypot(opposite.x - node.point.x, opposite.y - node.point.y)
    : length;
  const mirrored = {
    x: node.point.x - (vector.x / length) * oppositeLength,
    y: node.point.y - (vector.y / length) * oppositeLength,
  };
  return side === 'in' ? { ...next, outHandle: mirrored } : { ...next, inHandle: mirrored };
}
