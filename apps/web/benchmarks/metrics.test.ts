import { describe, expect, it } from 'vitest';
import { assessEvidence, summarizeTimingSamples } from './metrics.js';

describe('VEC027–VEC029 browser benchmark evidence gates', () => {
  it('calculates nearest-rank p50/p95 on a copy of observations', () => {
    const samples = Array.from({ length: 20 }, (_, index) => 20 - index);
    expect(summarizeTimingSamples(samples)).toEqual({
      sampleCount: 20,
      minMs: 1,
      meanMs: 10.5,
      p50Ms: 10,
      p95Ms: 19,
      maxMs: 20,
    });
    expect(samples[0]).toBe(20);
  });

  it('rejects invalid data instead of turning it into a seemingly valid metric', () => {
    expect(summarizeTimingSamples([])).toBeNull();
    expect(() => summarizeTimingSamples([3, NaN])).toThrow('finite non-negative');
    expect(() => summarizeTimingSamples([4, Infinity])).toThrow('finite non-negative');
    expect(() => summarizeTimingSamples([-1])).toThrow('finite non-negative');
  });

  it('requires complete observations and labels samples below 20 as insufficient', () => {
    expect(assessEvidence(0, 0, null, null).status).toBe('insufficient');
    expect(assessEvidence(20, 0, 10, null).status).toBe('insufficient');
    expect(assessEvidence(19, 20, 10, 10).status).toBe('insufficient');
    expect(assessEvidence(20, 20, NaN, 10).status).toBe('insufficient');
    expect(assessEvidence(20, 20, 10, Infinity).status).toBe('insufficient');
  });

  it('reports observed budget outcomes without asserting a universal green result', () => {
    expect(assessEvidence(20, 20, 18, 60)).toMatchObject({
      status: 'observed',
      frameP95WithinBudget: false,
      inputP95WithinBudget: false,
    });
    expect(assessEvidence(20, 20, 16, 49)).toMatchObject({
      status: 'observed',
      frameP95WithinBudget: true,
      inputP95WithinBudget: true,
    });
  });
});
