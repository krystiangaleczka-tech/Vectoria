import type { PathNode, PathObject, SceneObject, Transform2D } from '../model/types.js';
import type { Vec2 } from '@vectoria/shared';
import { flattenPath } from '../model/freehand.js';
import { getTransformMatrix } from '../model/transform.js';

// ─── Sampling ─────────────────────────────────────────────────────────────────

export interface PathSample {
  readonly point: Vec2;
  readonly tangent: Vec2;
  readonly length: number;
}

/**
 * Flatten a node list into samples with unit tangents and cumulative
 * arc-length. Shared by distort effects and stamp brushes so spacing matches
 * the text-on-path sampler.
 */
export function samplePath(nodes: readonly PathNode[], closed: boolean, stepsPerSegment = 16): PathSample[] {
  const polyline = flattenPath({ nodes, closed }, stepsPerSegment);
  if (polyline.length < 2) return [];
  const samples: PathSample[] = [];
  let total = 0;
  for (let i = 0; i < polyline.length; i += 1) {
    if (i > 0) total += Math.hypot(polyline[i]!.x - polyline[i - 1]!.x, polyline[i]!.y - polyline[i - 1]!.y);
    const prev = polyline[Math.max(0, i - 1)]!;
    const next = polyline[Math.min(polyline.length - 1, i + 1)]!;
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    samples.push({ point: polyline[i]!, tangent: { x: dx / len, y: dy / len }, length: total });
  }
  return samples;
}

export function pathLength(nodes: readonly PathNode[], closed: boolean): number {
  const samples = samplePath(nodes, closed);
  return samples.length > 0 ? samples[samples.length - 1]!.length : 0;
}

function resampleToNodes(nodes: readonly PathNode[], closed: boolean, targetCount: number): PathNode[] {
  const samples = samplePath(nodes, closed);
  if (samples.length < 2) return [];
  const total = samples[samples.length - 1]!.length;
  const step = total / Math.max(1, targetCount);
  const out: PathNode[] = [];
  let cursor = 0;
  for (let i = 0; i < samples.length && out.length < targetCount; i += 1) {
    if (samples[i]!.length >= cursor || i === samples.length - 1) {
      out.push({ point: samples[i]!.point, inHandle: null, outHandle: null, kind: 'corner' });
      cursor += step;
    }
  }
  return out;
}

/** Deterministic per-index pseudo-random in [-1, 1]; stable across renders. */
function jitterAt(index: number): number {
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function boundsCenter(nodes: readonly PathNode[], closed: boolean): Vec2 {
  const b = pathBounds(nodes, closed);
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

function pathBounds(nodes: readonly PathNode[], closed: boolean): { minX: number; minY: number; maxX: number; maxY: number } {
  const points = flattenPath({ nodes, closed }, 4);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  return { minX, minY, maxX, maxY };
}

// ─── Geometry effects (FX-004 / FX-019 / FX-020 / FX-022) ─────────────────────

/**
 * Round sharp corners by trimming each vertex and inserting a quadratic
 * approximation. Non-destructive: returns new nodes, input untouched.
 */
export function applyRoundedCorners(nodes: readonly PathNode[], closed: boolean, radius: number): PathNode[] {
  if (!(radius > 0) || nodes.length < (closed ? 3 : 2)) return [...nodes];
  const out: PathNode[] = [];
  const count = nodes.length;
  for (let i = 0; i < count; i += 1) {
    const node = nodes[i]!;
    const prevNode = nodes[(i - 1 + count) % count]!;
    const nextNode = nodes[(i + 1) % count]!;
    const hasAdjacentCurves = node.inHandle !== null || node.outHandle !== null || prevNode.outHandle !== null || nextNode.inHandle !== null;
    if (hasAdjacentCurves || (!closed && (i === 0 || i === count - 1))) {
      out.push(node);
      continue;
    }
    const toPrevLen = Math.hypot(node.point.x - prevNode.point.x, node.point.y - prevNode.point.y) || 1;
    const toNextLen = Math.hypot(nextNode.point.x - node.point.x, nextNode.point.y - node.point.y) || 1;
    const r = Math.min(radius, toPrevLen / 2, toNextLen / 2);
    const inDir = { x: (prevNode.point.x - node.point.x) / toPrevLen, y: (prevNode.point.y - node.point.y) / toPrevLen };
    const outDir = { x: (nextNode.point.x - node.point.x) / toNextLen, y: (nextNode.point.y - node.point.y) / toNextLen };
    out.push({ point: { x: node.point.x + inDir.x * r, y: node.point.y + inDir.y * r }, inHandle: null, outHandle: null, kind: 'corner' });
    out.push({ point: { x: node.point.x + outDir.x * r, y: node.point.y + outDir.y * r }, inHandle: { x: node.point.x, y: node.point.y }, outHandle: null, kind: 'smooth' });
  }
  if (!closed && out.length >= 2) out[out.length - 1] = nodes[count - 1]!;
  return out;
}

/** Zigzag: alternate perpendicular offset along the resampled path. */
export function applyZigzag(nodes: readonly PathNode[], closed: boolean, amplitude: number, frequency: number): PathNode[] {
  if (!(amplitude > 0)) return [...nodes];
  const total = pathLength(nodes, closed);
  const target = Math.max(4, Math.round(total / Math.max(1, frequency)));
  const resampled = resampleToNodes(nodes, closed, target);
  const samples = samplePath(nodes, closed);
  const stepLen = total / resampled.length;
  return resampled.map((node, index) => {
    const offset = (index % 2 === 0 ? 1 : -1) * amplitude;
    const sample = samples[Math.min(samples.length - 1, Math.round((index * stepLen / Math.max(total, 1e-9)) * (samples.length - 1)))] ?? null;
    const tangent = sample?.tangent ?? { x: 1, y: 0 };
    return { ...node, point: { x: node.point.x - tangent.y * offset, y: node.point.y + tangent.x * offset } };
  });
}

/** Roughen: deterministic jitter displacement along the resampled path. */
export function applyRoughen(nodes: readonly PathNode[], closed: boolean, amplitude: number, frequency: number): PathNode[] {
  if (!(amplitude > 0)) return [...nodes];
  const total = pathLength(nodes, closed);
  const target = Math.max(4, Math.round(total / Math.max(1, frequency)));
  const resampled = resampleToNodes(nodes, closed, target);
  return resampled.map((node, index) => ({
    ...node,
    point: { x: node.point.x + jitterAt(index * 2 + 1) * amplitude, y: node.point.y + jitterAt(index * 2 + 2) * amplitude },
  }));
}

/** Pucker & bloat: move vertices toward (positive) or away from the centroid. */
export function applyPuckerBloat(nodes: readonly PathNode[], closed: boolean, amount: number): PathNode[] {
  if (amount === 0 || nodes.length < 2) return [...nodes];
  const center = boundsCenter(nodes, closed);
  return nodes.map((node) => {
    const dx = node.point.x - center.x;
    const dy = node.point.y - center.y;
    const dist = Math.hypot(dx, dy) || 1;
    const scale = Math.max(0.05, (dist - amount) / dist);
    return {
      ...node,
      point: { x: center.x + dx * scale, y: center.y + dy * scale },
      inHandle: node.inHandle ? { x: center.x + (node.inHandle.x - center.x) * scale, y: center.y + (node.inHandle.y - center.y) * scale } : null,
      outHandle: node.outHandle ? { x: center.x + (node.outHandle.x - center.x) * scale, y: center.y + (node.outHandle.y - center.y) * scale } : null,
    };
  });
}

/** Map unit-square coordinates of a point inside `bounds` through bilinear quad interpolation. */
function bilinearMap(point: Vec2, bounds: { minX: number; minY: number; maxX: number; maxY: number }, corners: readonly [Vec2, Vec2, Vec2, Vec2]): Vec2 {
  const u = (point.x - bounds.minX) / Math.max(1e-9, bounds.maxX - bounds.minX);
  const v = (point.y - bounds.minY) / Math.max(1e-9, bounds.maxY - bounds.minY);
  const [tl, tr, br, bl] = corners;
  const top = { x: tl!.x + (tr!.x - tl!.x) * u, y: tl!.y + (tr!.y - tl!.y) * u };
  const bottom = { x: bl!.x + (br!.x - bl!.x) * u, y: bl!.y + (br!.y - bl!.y) * u };
  return { x: top.x + (bottom.x - top.x) * v, y: top.y + (bottom.y - top.y) * v };
}

/** Envelope distortion (FX-020): bilinear map of the path into the corner quad. */
export function applyEnvelope(nodes: readonly PathNode[], closed: boolean, corners: readonly [Vec2, Vec2, Vec2, Vec2]): PathNode[] {
  const bounds = pathBounds(nodes, closed);
  const map = (p: Vec2): Vec2 => bilinearMap(p, bounds, corners);
  return nodes.map((node) => ({
    ...node,
    point: map(node.point),
    inHandle: node.inHandle ? map(node.inHandle) : null,
    outHandle: node.outHandle ? map(node.outHandle) : null,
  }));
}

// ─── Perspective (FX-022) ─────────────────────────────────────────────────────

type Mat3 = readonly [number, number, number, number, number, number, number, number, number];

function applyMat3(m: Mat3, p: Vec2): Vec2 {
  const w = m[6]! * p.x + m[7]! * p.y + m[8]!;
  const scale = w === 0 ? 1e9 : 1 / w;
  return { x: (m[0]! * p.x + m[1]! * p.y + m[2]!) * scale, y: (m[3]! * p.x + m[4]! * p.y + m[5]!) * scale };
}

/**
 * Solve the homography mapping the unit square onto the four quad corners and
 * return it as a 3×3 matrix (row-major). Uses the standard 8×8 linear system.
 */
export function perspectiveMatrix(corners: readonly [Vec2, Vec2, Vec2, Vec2]): Mat3 {
  const [tl, tr, br, bl] = corners;
  const src: readonly Vec2[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  const dst = [tl!, tr!, br!, bl!];
  // Gaussian elimination on the 8×8 system built from x' = (a x + b y + c)/(g x + h y + 1).
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const { x, y } = src[i]!;
    const { x: X, y: Y } = dst[i]!;
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
  }
  const n = 8;
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) if (Math.abs(A[row]![col]!) > Math.abs(A[pivot]![col]!)) pivot = row;
    [A[col], A[pivot]] = [A[pivot]!, A[col]!];
    [b[col], b[pivot]] = [b[pivot]!, b[col]!];
    const diag = A[col]![col]! || 1e-12;
    for (let row = col + 1; row < n; row += 1) {
      const factor = A[row]![col]! / diag;
      if (factor === 0) continue;
      for (let k = col; k < n; k += 1) A[row]![k]! -= factor * A[col]![k]!;
      b[row]! -= factor * b[col]!;
    }
  }
  const h = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row -= 1) {
    let sum = b[row]!;
    for (let k = row + 1; k < n; k += 1) sum -= A[row]![k]! * h[k]!;
    h[row] = sum / (A[row]![row]! || 1e-12);
  }
  return [h[0]!, h[1]!, h[2]!, h[3]!, h[4]!, h[5]!, h[6]!, h[7]!, 1];
}

/** Perspective distortion (FX-022): projective map of the path into the quad. */
export function applyPerspective(nodes: readonly PathNode[], closed: boolean, corners: readonly [Vec2, Vec2, Vec2, Vec2]): PathNode[] {
  const bounds = pathBounds(nodes, closed);
  const m = perspectiveMatrix(corners);
  const map = (p: Vec2): Vec2 => {
    const u = (p.x - bounds.minX) / Math.max(1e-9, bounds.maxX - bounds.minX);
    const v = (p.y - bounds.minY) / Math.max(1e-9, bounds.maxY - bounds.minY);
    return applyMat3(m, { x: u, y: v });
  };
  return nodes.map((node) => ({
    ...node,
    point: map(node.point),
    inHandle: node.inHandle ? map(node.inHandle) : null,
    outHandle: node.outHandle ? map(node.outHandle) : null,
  }));
}

// ─── Repeats (FX-024 / FX-025 / FX-026) ───────────────────────────────────────

/** Instance transforms in object-local space. Index 0 is always the identity (original). */
export function radialRepeatTransforms(bounds: { minX: number; minY: number; maxX: number; maxY: number }, count: number, radius: number, startAngle: number): Transform2D[] {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const out: Transform2D[] = [identityTransform()];
  for (let i = 1; i < count; i += 1) {
    const angle = startAngle + (Math.PI * 2 * i) / count;
    out.push({
      position: { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius },
      rotation: angle,
      scale: { x: 1, y: 1 },
      pivot: { x: cx, y: cy },
    });
  }
  return out;
}

export function mirrorRepeatTransforms(bounds: { minX: number; minY: number; maxX: number; maxY: number }, axis: 'x' | 'y', offset: number): Transform2D[] {
  const base = identityTransform();
  if (axis === 'x') {
    const mirrorX = 2 * (bounds.maxX + offset);
    return [base, { position: { x: mirrorX, y: 0 }, rotation: 0, scale: { x: -1, y: 1 }, pivot: { x: 0, y: 0 } }];
  }
  const mirrorY = 2 * (bounds.maxY + offset);
  return [base, { position: { x: 0, y: mirrorY }, rotation: 0, scale: { x: 1, y: -1 }, pivot: { x: 0, y: 0 } }];
}

export function gridRepeatTransforms(rows: number, columns: number, spacingX: number, spacingY: number): Transform2D[] {
  const out: Transform2D[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      out.push({ position: { x: col * spacingX, y: row * spacingY }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } });
    }
  }
  return out;
}

function identityTransform(): Transform2D {
  return { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } };
}

/** Compose two transforms (outer ∘ inner) into a single Transform2D. */
export function composeTransform2D(outer: Transform2D, inner: Transform2D): Transform2D {
  const m = compose2x3(getTransformMatrix(outer), getTransformMatrix(inner));
  return {
    position: { x: m[6]!, y: m[7]! },
    rotation: Math.atan2(m[1]!, m[0]!),
    scale: { x: Math.hypot(m[0]!, m[1]!), y: Math.hypot(m[3]!, m[4]!) * (m[0]! * m[4]! - m[1]! * m[3]! < 0 ? -1 : 1) },
    pivot: { x: 0, y: 0 },
  };
}

function compose2x3(a: readonly number[], b: readonly number[]): number[] {
  return [
    a[0]! * b[0]! + a[3]! * b[1]!, a[1]! * b[0]! + a[4]! * b[1]!, 0,
    a[0]! * b[3]! + a[3]! * b[4]!, a[1]! * b[3]! + a[4]! * b[4]!, 0,
    a[0]! * b[6]! + a[3]! * b[7]! + a[6]!, a[1]! * b[6]! + a[4]! * b[7]! + a[7]!, 1,
  ];
}

// ─── Caligraphic brush outline (FX-016) ───────────────────────────────────────

/**
 * Generate a real filled outline for a caligraphic nib. Width at each sample
 * varies with the angle between the stroke direction and the nib angle, so
 * different drawing directions produce different stroke weights.
 */
export function buildCaligraphicOutline(nodes: readonly PathNode[], closed: boolean, angle: number, thin: number, thick: number): PathNode[] {
  const samples = samplePath(nodes, closed, 24);
  if (samples.length < 2) return [...nodes];
  const nibX = Math.cos(angle);
  const nibY = Math.sin(angle);
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (const sample of samples) {
    // Cross product of nib direction and tangent gives the projected nib width.
    const w = thin + (thick - thin) * Math.abs(sample.tangent.x * nibY - sample.tangent.y * nibX);
    const nx = -sample.tangent.y;
    const ny = sample.tangent.x;
    left.push({ x: sample.point.x + nx * w / 2, y: sample.point.y + ny * w / 2 });
    right.push({ x: sample.point.x - nx * w / 2, y: sample.point.y - ny * w / 2 });
  }
  const outline = [...left, ...right.reverse()];
  return outline.map((point) => ({ point, inHandle: null, outHandle: null, kind: 'corner' as const }));
}

// ─── Effective geometry pipeline ──────────────────────────────────────────────

const GEOMETRY_EFFECT_TYPES: readonly string[] = ['roundedCorners', 'distort', 'envelope', 'perspective'];

export function hasGeometryEffects(effects: readonly { type: string; visible: boolean }[] | undefined): boolean {
  return (effects ?? []).some((effect) => effect.visible && GEOMETRY_EFFECT_TYPES.includes(effect.type));
}

export function hasRepeatEffects(effects: readonly { type: string; visible: boolean }[] | undefined): boolean {
  return (effects ?? []).some((effect) => effect.visible && ['radialRepeat', 'mirrorRepeat', 'gridRepeat'].includes(effect.type));
}

export function hasRasterEffects(effects: readonly { type: string; visible: boolean }[] | undefined): boolean {
  return (effects ?? []).some((effect) => effect.visible && ['dropShadow', 'blur', 'innerShadow', 'glow', 'svgFilter', 'extrude'].includes(effect.type));
}

/**
 * Apply all visible geometry effects to a path's nodes, in effect order.
 * Returns the original object untouched when no geometry effect is active.
 */
export function applyGeometryEffects(obj: PathObject): PathObject {
  let nodes = obj.nodes;
  for (const effect of obj.style.effects ?? []) {
    if (!effect.visible) continue;
    switch (effect.type) {
      case 'roundedCorners': nodes = applyRoundedCorners(nodes, obj.closed, effect.radius); break;
      case 'distort':
        if (effect.variant === 'zigzag') nodes = applyZigzag(nodes, obj.closed, effect.amplitude, effect.frequency);
        else if (effect.variant === 'roughen') nodes = applyRoughen(nodes, obj.closed, effect.amplitude, effect.frequency);
        else nodes = applyPuckerBloat(nodes, obj.closed, effect.amplitude);
        break;
      case 'envelope': nodes = applyEnvelope(nodes, obj.closed, effect.corners); break;
      case 'perspective': nodes = applyPerspective(nodes, obj.closed, effect.corners); break;
      default: break;
    }
  }
  return nodes === obj.nodes ? obj : { ...obj, nodes };
}

/**
 * Convert any object to a path and apply its visible geometry effects. Used by
 * the renderer and SVG exporter so parametric shapes support the same effects.
 */
export function effectiveGeometry(obj: SceneObject, expandObject: (object: SceneObject) => SceneObject | null): PathObject | null {
  let asPath: PathObject | null;
  if (obj.type === 'path') asPath = obj;
  else {
    const expanded = expandObject(obj);
    asPath = expanded && expanded.type === 'path' ? expanded : null;
  }
  if (!asPath) return null;
  return hasGeometryEffects(obj.style.effects) ? applyGeometryEffects(asPath) : asPath;
}

/** Expand path bounds by the given margin (used for effect-aware culling). */
export function expandedBounds(bounds: { x: number; y: number; width: number; height: number }, margin: number): { x: number; y: number; width: number; height: number } {
  return { x: bounds.x - margin, y: bounds.y - margin, width: bounds.width + margin * 2, height: bounds.height + margin * 2 };
}
