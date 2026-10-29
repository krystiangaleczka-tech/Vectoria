/**
 * Distribution of observed import timings, using nearest-rank percentiles.
 * Callers should record warm-up separately and identify runtime/hardware.
 */
export interface ImportTimingDistribution {
  readonly sampleCount: number;
  readonly minMs: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly maxMs: number;
  readonly meanMs: number;
}

export function summarizeImportTimings(samples: readonly number[]): ImportTimingDistribution | null {
  if (samples.length === 0) return null;
  if (samples.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Import timings must be finite non-negative milliseconds');
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = (fraction: number) => sorted[Math.ceil(sorted.length * fraction) - 1]!;
  return {
    sampleCount: sorted.length,
    minMs: sorted[0]!,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    maxMs: sorted[sorted.length - 1]!,
    meanMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
  };
}
