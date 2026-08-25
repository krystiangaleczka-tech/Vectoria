import type { DocumentModel, SelectionState } from '@vectoria/core';
import type { Rect, Vec2 } from '@vectoria/shared';
import { hitTestDetailed, type HitTestResult } from '../hit-test.js';
import { SelectionService, emptySelection } from '../selection-service.js';

export interface SelectToolContext {
  document: DocumentModel;
  selection: SelectionState;
  screenPoint: Vec2;
  worldPoint: Vec2;
  zoom: number;
  additive?: boolean;
  visibleWorldRect?: Rect;
  allowedObjectIds?: ReadonlySet<string>;
}

/** Select tool policy: top-most hit first, additive Shift selection, no React state. */
export class SelectTool {
  readonly id = 'select' as const;
  readonly cursor = 'default';
  private readonly selection = new SelectionService();

  private lastCycleKey: string | null = null;
  private cycleIndex = 0;

  /** Resolve one pointer pick and return next selection state. */
  pick(context: SelectToolContext): { selection: SelectionState; hit: HitTestResult | null } {
    const candidates = hitTestDetailed(context.document, context.worldPoint, {
      tolerancePx: 6,
      zoom: context.zoom,
      visibleWorldRect: context.visibleWorldRect,
      allowedObjectIds: context.allowedObjectIds,
    });
    const key = `${Math.round(context.screenPoint.x)}:${Math.round(context.screenPoint.y)}`;
    if (key !== this.lastCycleKey) this.cycleIndex = 0;
    this.lastCycleKey = key;
    const hit = candidates[this.cycleIndex % Math.max(1, candidates.length)] ?? null;
    return {
      hit,
      selection: this.selection.selectObject(context.selection, hit?.objectId ?? null, context.additive ?? false),
    };
  }

  /** Pick next overlapping object when the same screen location is queried repeatedly. */
  cycle(context: SelectToolContext): { selection: SelectionState; hit: HitTestResult | null } {
    this.cycleIndex += 1;
    return this.pick(context);
  }

  /** Apply documented touching/fully-contained marquee policy. */
  marquee(context: Omit<SelectToolContext, 'screenPoint' | 'worldPoint'> & { area: Rect; fullyContained?: boolean }): SelectionState {
    // Skeleton MVP uses touching bounds; 0.1 can expose fullyContained as UI policy.
    return this.selection.marquee(context.document, context.area, context.additive ?? false, context.fullyContained ?? false, context.visibleWorldRect, context.selection);
  }

  clear(): SelectionState {
    return emptySelection();
  }

  lasso(context: Omit<SelectToolContext, 'screenPoint' | 'worldPoint'> & { polygon: readonly Vec2[] }): SelectionState {
    return this.selection.lasso(context.document, context.polygon, context.additive ?? false, context.selection);
  }
}
