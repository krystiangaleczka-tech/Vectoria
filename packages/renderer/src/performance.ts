import type { RenderMetricsSnapshot } from './metrics.js';

export const FRAME_BUDGET_MS = 16.67;
export const INPUT_TO_RENDER_BUDGET_MS = 50;

export interface PerformanceBudgetResult {
  readonly frameWithinBudget: boolean;
  readonly inputWithinBudget: boolean;
  readonly pass: boolean;
}

/** Evaluate renderer diagnostics against product responsiveness budgets. */
export function evaluatePerformanceBudget(metrics: RenderMetricsSnapshot): PerformanceBudgetResult {
  const inputWithinBudget = metrics.inputToRenderMs === null || metrics.inputToRenderMs < INPUT_TO_RENDER_BUDGET_MS;
  const frameWithinBudget = metrics.p95FrameTimeMs <= FRAME_BUDGET_MS;
  return { frameWithinBudget, inputWithinBudget, pass: frameWithinBudget && inputWithinBudget };
}
