import { describe, expect, it } from 'vitest';
import { RenderMetrics, evaluatePerformanceBudget } from '../src/index.js';

describe('renderer performance diagnostics', () => {
  it('reports bounded average, p50 and p95 frame time', () => {
    const metrics = new RenderMetrics();
    for (let index = 0; index < 120; index += 1) metrics.recordFrame(index === 119 ? 20 : 5);
    const snapshot = metrics.snapshot();
    expect(snapshot.renderCount).toBe(120);
    expect(snapshot.p50FrameTimeMs).toBe(5);
    expect(snapshot.p95FrameTimeMs).toBe(5);
    expect(evaluatePerformanceBudget(snapshot).pass).toBe(true);
  });

  it('fails budget when p95 exceeds 60 FPS frame budget', () => {
    const metrics = new RenderMetrics();
    for (let index = 0; index < 20; index += 1) metrics.recordFrame(18);
    expect(evaluatePerformanceBudget(metrics.snapshot()).pass).toBe(false);
  });

  it('records completed input-to-render latency, including coalesced input, without clock drift on snapshot', () => {
    const metrics = new RenderMetrics();
    metrics.markInput(100);
    metrics.markInput(115);
    metrics.recordFrame(5, 140);
    const first = metrics.snapshot();
    expect(first.inputToRenderMs).toBe(40);
    expect(first.p50InputToRenderMs).toBe(40);
    expect(first.p95InputToRenderMs).toBe(40);
    expect(first.inputSampleCount).toBe(1);
    expect(evaluatePerformanceBudget(first).inputWithinBudget).toBe(true);

    metrics.markInput(160);
    // Pending input should not be misreported as an ever-increasing latency.
    expect(metrics.snapshot().inputToRenderMs).toBe(40);
    metrics.recordFrame(6, 230);
    const second = metrics.snapshot();
    expect(second.inputToRenderMs).toBe(70);
    expect(second.p50InputToRenderMs).toBe(40);
    expect(second.p95InputToRenderMs).toBe(70);
    expect(evaluatePerformanceBudget(second).inputWithinBudget).toBe(false);
    expect(evaluatePerformanceBudget(second).pass).toBe(false);

    metrics.recordFrame(5, 270);
    expect(metrics.snapshot().inputSampleCount).toBe(2);
  });

  it('keeps at most 120 observations and ignores invalid durations', () => {
    const metrics = new RenderMetrics();
    for (let index = 0; index < 125; index += 1) {
      metrics.markInput(index * 100);
      metrics.recordFrame(5, index * 100 + 10);
    }
    metrics.recordFrame(NaN);
    const snapshot = metrics.snapshot();
    expect(snapshot.inputSampleCount).toBe(120);
    expect(snapshot.p50InputToRenderMs).toBe(10);
    expect(snapshot.renderCount).toBe(125);
  });
});
