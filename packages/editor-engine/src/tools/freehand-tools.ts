import type { PathObject, WidthPoint } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';
import {
  erasePath,
  normalizeFreehandSamples,
  normalizeWidthProfile,
  splitPathAtPoint,
  splitPathByPolyline,
  widthAtT,
  type FreehandSample,
} from '@vectoria/core';

export interface FreehandPointerEvent {
  readonly screenPoint: Vec2;
  readonly worldPoint: Vec2;
  readonly pressure?: number;
  readonly time?: number;
}

export type FreehandToolState = 'idle' | 'drawing';
export type FreehandResult =
  | { readonly type: 'draft'; readonly samples: readonly FreehandSample[] }
  | { readonly type: 'commit'; readonly samples: readonly FreehandSample[] }
  | { readonly type: 'cancel' };

class SampleTool {
  protected samples: FreehandSample[] = [];
  private state: FreehandToolState = 'idle';
  readonly minDistancePx: number;

  constructor(minDistancePx = 2) {
    this.minDistancePx = minDistancePx;
  }

  get currentState(): FreehandToolState {
    return this.state;
  }

  get preview(): readonly FreehandSample[] {
    return this.samples;
  }

  pointerDown(event: FreehandPointerEvent): FreehandResult | null {
    this.state = 'drawing';
    this.samples = [{ point: event.worldPoint, ...(event.pressure === undefined ? {} : { pressure: clampPressure(event.pressure) }), time: event.time ?? now() }];
    return { type: 'draft', samples: this.samples };
  }

  pointerMove(event: FreehandPointerEvent, minDistanceWorld: number): FreehandResult | null {
    if (this.state !== 'drawing') return null;
    const sample: FreehandSample = { point: event.worldPoint, ...(event.pressure === undefined ? {} : { pressure: clampPressure(event.pressure) }), time: event.time ?? now() };
    const previous = this.samples.at(-1);
    if (previous && Math.hypot(previous.point.x - sample.point.x, previous.point.y - sample.point.y) < Math.max(0, minDistanceWorld)) return null;
    this.samples = [...this.samples, sample];
    return { type: 'draft', samples: this.samples };
  }

  pointerUp(event: FreehandPointerEvent): FreehandResult {
    if (this.state !== 'drawing') return { type: 'cancel' };
    this.pointerMove(event, 0);
    const samples = normalizeFreehandSamples(this.samples, 0);
    this.reset();
    return samples.length >= 2 ? { type: 'commit', samples } : { type: 'cancel' };
  }

  keyDown(key: string): FreehandResult | null {
    if (key === 'Escape') {
      this.reset();
      return { type: 'cancel' };
    }
    if (key === 'Enter' && this.state === 'drawing') {
      const samples = normalizeFreehandSamples(this.samples, 0);
      this.reset();
      return samples.length >= 2 ? { type: 'commit', samples } : { type: 'cancel' };
    }
    return null;
  }

  cancel(): FreehandResult {
    this.reset();
    return { type: 'cancel' };
  }

  private reset(): void {
    this.state = 'idle';
    this.samples = [];
  }
}

export class PencilTool extends SampleTool {
  readonly id = 'pencil' as const;
}

export class BrushTool extends SampleTool {
  readonly id = 'brush' as const;
}

export interface PathOperationPreview {
  readonly pathId: string;
  readonly nodes: PathObject['nodes'];
}

export class SmoothTool {
  readonly id = 'smooth' as const;

  previewPath(path: PathObject, amount: number): PathOperationPreview {
    const points = path.nodes.map((node) => node.point);
    const next = points.map((point, index) => {
      if (index === 0 || index === points.length - 1) return point;
      const previous = points[index - 1]!;
      const following = points[index + 1]!;
      const strength = clamp(amount, 0, 100) / 100;
      return { x: point.x + ((previous.x + following.x) / 2 - point.x) * strength, y: point.y + ((previous.y + following.y) / 2 - point.y) * strength };
    });
    return { pathId: path.id, nodes: path.nodes.map((node, index) => ({ ...node, point: next[index]! })) };
  }
}

export interface CutPreview {
  readonly points: readonly Vec2[];
  readonly radius?: number;
}

class PolylineTool {
  protected points: Vec2[] = [];
  get preview(): CutPreview { return { points: this.points }; }
  pointerDown(point: Vec2): CutPreview { this.points = [point]; return this.preview; }
  pointerMove(point: Vec2): CutPreview { if (this.points.length > 0) this.points = [...this.points, point]; return this.preview; }
  cancel(): void { this.points = []; }
  takePoints(): Vec2[] { const result = this.points; this.points = []; return result; }
}

export class EraserTool extends PolylineTool {
  readonly id = 'eraser' as const;
  radiusPx = 12;
  get preview(): CutPreview { return { points: this.points, radius: this.radiusPx }; }
  erase(path: PathObject, radiusWorld: number): PathObject[] { return erasePath(path, this.points, radiusWorld); }
}

export class KnifeTool extends PolylineTool {
  readonly id = 'knife' as const;
  cut(path: PathObject): PathObject[] { return splitPathByPolyline(path, this.points); }
}

export class ScissorsTool {
  readonly id = 'scissors' as const;
  split(path: PathObject, point: Vec2, toleranceWorld: number): PathObject[] { return splitPathAtPoint(path, point, toleranceWorld); }
}

export class WidthTool {
  readonly id = 'width' as const;
  private point: Vec2 | null = null;
  private t = 0;
  private width = 1;
  private profile: WidthPoint[] = [];

  get preview(): readonly WidthPoint[] { return this.profile; }

  pointerDown(path: PathObject, point: Vec2, t: number): readonly WidthPoint[] {
    this.point = point;
    this.t = clamp(t, 0, 1);
    this.width = widthAtT(normalizeWidthProfile(path.widthProfile, path.style.stroke?.width ?? 1), this.t);
    const profile = normalizeWidthProfile(path.widthProfile, this.width);
    this.profile = profile.some((point) => point.t === this.t) ? profile : [...profile, { t: this.t, width: this.width }].sort((a, b) => a.t - b.t);
    return this.profile;
  }

  pointerMove(deltaScreenPx: number, zoom: number): readonly WidthPoint[] {
    if (!this.point) return this.profile;
    const nextWidth = Math.max(0.1, this.width + deltaScreenPx / Math.max(0.01, zoom));
    this.profile = normalizeWidthProfile(this.profile.map((point) => point.t === this.t ? { ...point, width: nextWidth } : point), nextWidth);
    return this.profile;
  }

  pointerUp(): readonly WidthPoint[] {
    const result = this.profile;
    this.point = null;
    this.profile = [];
    return result;
  }

  cancel(): void { this.point = null; this.profile = []; }
}

function clampPressure(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function now(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}
