import { describe, expect, it } from 'vitest';
import { RenderMetrics, evaluatePerformanceBudget } from '../src/index.js';

describe('renderer performance diagnostics', () => {
  it('reports bounded average and p95 frame time', () => {
    const metrics = new RenderMetrics();
    for (let index = 0; index < 120; index += 1) metrics.recordFrame(index === 119 ? 20 : 5);
    const snapshot = metrics.snapshot();
    expect(snapshot.renderCount).toBe(120);
    expect(snapshot.p95FrameTimeMs).toBe(5);
    expect(evaluatePerformanceBudget(snapshot).pass).toBe(true);
  });

  it('fails budget when p95 exceeds 60 FPS frame budget', () => {
    const metrics = new RenderMetrics();
    for (let index = 0; index < 20; index += 1) metrics.recordFrame(18);
    expect(evaluatePerformanceBudget(metrics.snapshot()).pass).toBe(false);
  });
});
