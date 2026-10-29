export interface RenderMetricsSnapshot {
  readonly fps: number;
  readonly averageFrameTimeMs: number;
  readonly p50FrameTimeMs: number;
  readonly p95FrameTimeMs: number;
  /** Last completed input-to-render sample, not time elapsed since input. */
  readonly inputToRenderMs: number | null;
  readonly p50InputToRenderMs: number | null;
  readonly p95InputToRenderMs: number | null;
  readonly inputSampleCount: number;
  readonly renderCount: number;
}

/** Collects bounded frame and input timing samples for developer diagnostics. */
export class RenderMetrics {
  private readonly frameTimes: number[] = [];
  private readonly inputToRenderSamples: number[] = [];
  private inputAt: number | null = null;
  private renderCount = 0;

  /** Preserve the earliest unrendered input in a coalesced frame. */
  markInput(timestamp = performance.now()): void {
    if (!Number.isFinite(timestamp)) return;
    if (this.inputAt === null || timestamp < this.inputAt) this.inputAt = timestamp;
  }

  recordFrame(durationMs: number, completedAt = performance.now()): void {
    if (!Number.isFinite(durationMs) || durationMs < 0) return;
    this.renderCount += 1;
    this.frameTimes.push(durationMs);
    if (this.frameTimes.length > 120) this.frameTimes.shift();

    if (this.inputAt !== null && Number.isFinite(completedAt)) {
      this.inputToRenderSamples.push(Math.max(0, completedAt - this.inputAt));
      if (this.inputToRenderSamples.length > 120) this.inputToRenderSamples.shift();
      this.inputAt = null;
    }
  }

  snapshot(): RenderMetricsSnapshot {
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const inputSorted = [...this.inputToRenderSamples].sort((a, b) => a - b);
    const percentile = (values: readonly number[], fraction: number): number | null =>
      values.length === 0 ? null : values[Math.ceil(values.length * fraction) - 1]!;
    const average = this.frameTimes.length === 0
      ? 0
      : this.frameTimes.reduce((sum, value) => sum + value, 0) / this.frameTimes.length;
    return {
      fps: average > 0 ? 1000 / average : 0,
      averageFrameTimeMs: average,
      p50FrameTimeMs: percentile(sorted, 0.5) ?? 0,
      p95FrameTimeMs: percentile(sorted, 0.95) ?? 0,
      inputToRenderMs: this.inputToRenderSamples.at(-1) ?? null,
      p50InputToRenderMs: percentile(inputSorted, 0.5),
      p95InputToRenderMs: percentile(inputSorted, 0.95),
      inputSampleCount: this.inputToRenderSamples.length,
      renderCount: this.renderCount,
    };
  }
}
