// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { summarizeImportTimings } from '../src/providers/import-timings.js';
import { FORMAT_CORPUS, runFormatCorpusFixture } from './fixtures/format-corpus.js';

describe('VEC018: measurable import latency distribution', () => {
  it('uses sorted nearest-rank p50/p95, not a misleading average-only timing', () => {
    const data = Array.from({ length: 20 }, (_, index) => 20 - index);
    const output = summarizeImportTimings(data)!;
    expect(output.sampleCount).toBe(20);
    expect(output.minMs).toBe(1);
    expect(output.p50Ms).toBe(10);
    expect(output.p95Ms).toBe(19);
    expect(output.maxMs).toBe(20);
    expect(output.meanMs).toBe(10.5);
    expect(data[0]).toBe(20); // input order is not mutated
  });

  it('treats no samples as unknown, and rejects invalid observations', () => {
    expect(summarizeImportTimings([])).toBeNull();
    expect(summarizeImportTimings([0])?.p95Ms).toBe(0);
    for (const bad of [-1, NaN, Infinity]) {
      expect(() => summarizeImportTimings([1, bad])).toThrow('finite non-negative');
    }
  });

  it.each([
    'pdf-basic-vector-text',
    'ai-pdf-compatible',
    'cdr-embedded-svg',
    'eps-basic-vector',
  ])('%s can be repeatedly imported while capturing an observed p50/p95', async (id) => {
    const fixture = FORMAT_CORPUS.find((candidate) => candidate.id === id)!;
    // Warm-up does not enter the distribution.
    const warmup = await runFormatCorpusFixture(fixture);
    expect(warmup.status).toBe(fixture.expected.status);

    const durations: number[] = [];
    for (let sample = 0; sample < 3; sample += 1) {
      const start = performance.now();
      const result = await runFormatCorpusFixture(fixture);
      durations.push(performance.now() - start);
      expect(result.status).toBe(fixture.expected.status);
      expect(result.objectCount).toBeGreaterThan(0);
    }
    const timing = summarizeImportTimings(durations)!;
    expect(timing.sampleCount).toBe(3);
    expect(timing.p95Ms).toBeGreaterThanOrEqual(timing.p50Ms);
    expect(timing.maxMs).toBeGreaterThanOrEqual(timing.p95Ms);
    expect(Number.isFinite(timing.meanMs)).toBe(true);
    // No CI hard threshold: timings are environment-dependent.
  });
});
