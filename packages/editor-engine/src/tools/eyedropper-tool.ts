import type { ObjectId } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';

export type StyleSampleTarget = 'fill' | 'stroke' | 'style';
export type EyedropperState = 'idle' | 'sampling';
export type EyedropperResult =
  | { readonly type: 'preview'; readonly point: Vec2; readonly target: StyleSampleTarget }
  | { readonly type: 'commit'; readonly sourceObjectId: ObjectId; readonly target: StyleSampleTarget }
  | { readonly type: 'cancel' };

export interface StyleToolPointerEvent {
  readonly screenPoint: Vec2;
  readonly worldPoint: Vec2;
}

/** Owns eyedropper gesture state so sampling never mutates the document during pointer movement. */
export class EyedropperTool {
  readonly id = 'eyedropper' as const;
  readonly cursor = 'copy';
  private state: EyedropperState = 'idle';
  private target: StyleSampleTarget = 'style';
  private point: Vec2 | null = null;

  get currentState(): EyedropperState { return this.state; }
  get previewPoint(): Vec2 | null { return this.point; }
  get sampleTarget(): StyleSampleTarget { return this.target; }
  set sampleTarget(target: StyleSampleTarget) { this.target = target; }

  pointerDown(event: StyleToolPointerEvent): EyedropperResult {
    this.state = 'sampling';
    this.point = event.worldPoint;
    return { type: 'preview', point: event.worldPoint, target: this.target };
  }

  pointerMove(event: StyleToolPointerEvent): EyedropperResult | null {
    if (this.state !== 'sampling') return null;
    this.point = event.worldPoint;
    return { type: 'preview', point: event.worldPoint, target: this.target };
  }

  pointerUp(sourceObjectId: ObjectId | null): EyedropperResult {
    const result = sourceObjectId ? { type: 'commit' as const, sourceObjectId, target: this.target } : { type: 'cancel' as const };
    this.cancel();
    return result;
  }

  keyDown(key: string): EyedropperResult | null { return key === 'Escape' ? this.cancel() : null; }

  cancel(): EyedropperResult {
    this.state = 'idle';
    this.point = null;
    return { type: 'cancel' };
  }
}
