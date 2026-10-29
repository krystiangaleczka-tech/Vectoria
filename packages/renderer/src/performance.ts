import type { RenderMetricsSnapshot } from './metrics.js';

export const FRAME_BUDGET_MS = 16.67;
export const INPUT_TO_RENDER_BUDGET_MS = 50;

export interface PerformanceBudgetResult {
  readonly frameWithinBudget: boolean;
  readonly inputWithinBudget: boolean;
  readonly pass: boolean;
}

/** Evaluate p95 frame and observed input-to-render latency against responsiveness budgets. */
export function evaluatePerformanceBudget(metrics: RenderMetricsSnapshot): PerformanceBudgetResult {
  const inputP95 = metrics.p95InputToRenderMs;
  const inputWithinBudget = inputP95 === null || inputP95 < INPUT_TO_RENDER_BUDGET_MS;
  const frameWithinBudget = metrics.p95FrameTimeMs <= FRAME_BUDGET_MS;
  return { frameWithinBudget, inputWithinBudget, pass: frameWithinBudget && inputWithinBudget };
}
