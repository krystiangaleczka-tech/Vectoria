/** Isolated browser-benchmark utilities. Never infer performance from missing samples. */
export interface TimingDistribution {
  readonly sampleCount: number;
  readonly minMs: number;
  readonly meanMs: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly maxMs: number;
}

export function summarizeTimingSamples(values: readonly number[]): TimingDistribution | null {
  if (values.length === 0) return null;
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Benchmark samples must be finite non-negative durations');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (fraction: number) => sorted[Math.ceil(sorted.length * fraction) - 1]!;
  return {
    sampleCount: sorted.length,
    minMs: sorted[0]!,
    meanMs: sorted.reduce((sum, duration) => sum + duration, 0) / sorted.length,
    p50Ms: rank(0.5),
    p95Ms: rank(0.95),
    maxMs: sorted[sorted.length - 1]!,
  };
}

export interface EvidenceGate {
  readonly status: 'observed' | 'insufficient';
  readonly reason: string | null;
  readonly frameP95WithinBudget: boolean | null;
  readonly inputP95WithinBudget: boolean | null;
}

/** Gate the *presence and validity* of evidence; do not fail heterogeneous CI hardware on a latency number. */
export function assessEvidence(
  frameSamples: number,
  inputSamples: number,
  frameP95: number | null,
  inputP95: number | null,
  minSamples = 20,
): EvidenceGate {
  if (
    frameSamples < minSamples ||
    inputSamples < minSamples ||
    frameP95 === null ||
    inputP95 === null ||
    !Number.isFinite(frameP95) ||
    !Number.isFinite(inputP95) ||
    frameP95 < 0 ||
    inputP95 < 0
  ) {
    return {
      status: 'insufficient',
      reason: 'Missing, invalid, or under-sampled browser observations',
      frameP95WithinBudget: null,
      inputP95WithinBudget: null,
    };
  }
  return {
    status: 'observed',
    reason: null,
    frameP95WithinBudget: frameP95 <= 16.67,
    inputP95WithinBudget: inputP95 < 50,
  };
}
