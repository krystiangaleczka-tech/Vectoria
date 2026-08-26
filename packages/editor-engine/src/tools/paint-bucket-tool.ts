import type { ObjectId } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';
import type { StyleSampleTarget, StyleToolPointerEvent } from './eyedropper-tool.js';

export type PaintBucketState = 'idle' | 'sampling';
export type PaintBucketResult =
  | { readonly type: 'preview'; readonly point: Vec2; readonly tolerance: number }
  | { readonly type: 'commit'; readonly sourceObjectId: ObjectId; readonly target: Extract<StyleSampleTarget, 'fill' | 'stroke'>; readonly tolerance: number }
  | { readonly type: 'cancel' };

/** Owns vector Paint Bucket gestures; tolerance is consumed by the host's color matcher. */
export class PaintBucketTool {
  readonly id = 'bucket' as const;
  readonly cursor = 'cell';
  private state: PaintBucketState = 'idle';
  private point: Vec2 | null = null;
  private target: Extract<StyleSampleTarget, 'fill' | 'stroke'> = 'fill';
  private _tolerance = 0;

  get currentState(): PaintBucketState { return this.state; }
  get previewPoint(): Vec2 | null { return this.point; }
  get sampleTarget(): Extract<StyleSampleTarget, 'fill' | 'stroke'> { return this.target; }
  set sampleTarget(target: Extract<StyleSampleTarget, 'fill' | 'stroke'>) { this.target = target; }
  get tolerance(): number { return this._tolerance; }
  set tolerance(value: number) { this._tolerance = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0; }

  pointerDown(event: StyleToolPointerEvent): PaintBucketResult {
    this.state = 'sampling';
    this.point = event.worldPoint;
    return { type: 'preview', point: event.worldPoint, tolerance: this._tolerance };
  }

  pointerMove(event: StyleToolPointerEvent): PaintBucketResult | null {
    if (this.state !== 'sampling') return null;
    this.point = event.worldPoint;
    return { type: 'preview', point: event.worldPoint, tolerance: this._tolerance };
  }

  pointerUp(sourceObjectId: ObjectId | null): PaintBucketResult {
    const result = sourceObjectId ? { type: 'commit' as const, sourceObjectId, target: this.target, tolerance: this._tolerance } : { type: 'cancel' as const };
    this.cancel();
    return result;
  }

  keyDown(key: string): PaintBucketResult | null { return key === 'Escape' ? this.cancel() : null; }

  cancel(): PaintBucketResult {
    this.state = 'idle';
    this.point = null;
    return { type: 'cancel' };
  }
}
