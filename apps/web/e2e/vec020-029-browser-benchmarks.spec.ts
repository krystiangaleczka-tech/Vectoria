import { expect, test } from '@playwright/test';
import type { BrowserBenchmarkResult, ScenarioId } from '../benchmarks/runner.js';

test.describe('VEC020–VEC029: real Chromium renderer benchmark harness', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  const fixtures: readonly { id: ScenarioId; objects: number; nodes: number }[] = [
    { id: 'B1', objects: 100, nodes: 0 },
    { id: 'B2', objects: 10_000, nodes: 0 },
    { id: 'B3', objects: 1_000, nodes: 100_000 },
    { id: 'B4', objects: 0, nodes: 0 },
    { id: 'B5', objects: 0, nodes: 0 },
    { id: 'B6', objects: 500, nodes: 0 },
  ];

  for (const { id, objects, nodes } of fixtures) {
    test(`${id}: collect completed frames and preserve scenario invariants`, async ({ page }, testInfo) => {
      await page.goto('/benchmarks/');
      await expect(page.getByTestId('benchmark-ready')).toHaveText('Ready');
      const result = await page.evaluate(async (scenario) => {
        if (!window.vectoriaBenchmark) throw new Error('Benchmark API is missing');
        return window.vectoriaBenchmark.run(scenario);
      }, id) as BrowserBenchmarkResult;
      expect(result.id).toBe(id);
      expect(result.objectCount).toBe(objects);
      expect(result.nodeCount).toBe(nodes);
      expect(result.metrics.renderCount).toBe(20);
      expect(result.metrics.inputSampleCount).toBe(20);
      expect(result.frameDurations.sampleCount).toBe(20);
      expect(result.frameDurations.p50Ms).toBeLessThanOrEqual(result.frameDurations.p95Ms);
      expect(result.frameDurations.p95Ms).toBeLessThanOrEqual(result.frameDurations.maxMs);
      expect(result.metrics.p95InputToRenderMs).not.toBeNull();
      expect(result.evidence.status).toBe('observed');
      expect(result.canvas.dimensionsStable).toBe(true);
      expect(result.canvas.width).toBe(Math.floor(result.canvas.cssWidth * result.canvas.dpr));
      expect(result.canvas.height).toBe(Math.floor(result.canvas.cssHeight * result.canvas.dpr));
      // Attach raw machine-specific evidence; do not silently assert 60 FPS on an arbitrary CI runner.
      await testInfo.attach(`vectoria-${id}-browser-metrics.json`, {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      });
      if (id === 'B1' || id === 'B2' || id === 'B4') {
        expect(result.assertions.panChanged).toBe(true);
        expect(result.assertions.zoomChanged).toBe(true);
      }
      if (id === 'B5') {
        expect(result.canvas.maxCanvasPixels).toBe(result.canvas.width * result.canvas.height);
      }
      if (id === 'B6') {
        expect(result.assertions.historyEntries).toBe(1);
        expect(result.assertions.movedObjects).toBe(500);
        expect(result.assertions.undoRedoVerified).toBe(true);
      }
    });
  }

  test('VEC027: percentile calculation uses nearest rank without mutating the input', async ({ page }) => {
    await page.goto('/benchmarks/');
    const answer = await page.evaluate(() => {
      const input = Array.from({ length: 20 }, (_, n) => 20 - n);
      const value = window.vectoriaBenchmark!.summarizeTimingSamples(input);
      return { value, first: input[0] };
    });
    expect(answer.value).toMatchObject({ sampleCount: 20, minMs: 1, p50Ms: 10, p95Ms: 19, maxMs: 20 });
    expect(answer.first).toBe(20);
  });

  test('VEC028: benchmark environment metadata is browser-sourced', async ({ page }) => {
    await page.goto('/benchmarks/');
    const result = await page.evaluate(() => window.vectoriaBenchmark!.run('B4'));
    expect(result.environment.userAgent).toContain('Chrome');
    expect(result.canvas.cssWidth).toBeGreaterThan(0);
    expect(result.canvas.dpr).toBeGreaterThan(0);
    expect(result.canvas.maxCanvasPixels).toBeGreaterThan(0);
  });

  test('VEC029: missing input observations are insufficient, never a green performance claim', async ({ page }) => {
    await page.goto('/benchmarks/');
    const result = await page.evaluate(() => {
      const gate = window.vectoriaBenchmark!.assessEvidence;
      return {
        empty: gate(0, 0, null, null),
        onlyFrames: gate(20, 0, 5, null),
        invalid: gate(20, 20, Number.NaN, 9),
        observed: gate(20, 20, 18, 60),
      };
    });
    expect(result.empty.status).toBe('insufficient');
    expect(result.onlyFrames.status).toBe('insufficient');
    expect(result.invalid.status).toBe('insufficient');
    expect(result.observed).toMatchObject({
      status: 'observed',
      frameP95WithinBudget: false,
      inputP95WithinBudget: false,
    });
  });

  test('VEC020: unknown benchmark IDs are rejected instead of running silent defaults', async ({ page }) => {
    await page.goto('/benchmarks/');
    const ids = await page.evaluate(() => window.vectoriaBenchmark!.scenarios);
    expect(ids).toEqual(['B1', 'B2', 'B3', 'B4', 'B5', 'B6']);
    await expect(page.evaluate(() => window.vectoriaBenchmark!.run('X' as ScenarioId))).rejects.toThrow('Unknown benchmark');
  });
});
