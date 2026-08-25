export interface RenderMetricsSnapshot {
  readonly fps: number;
  readonly averageFrameTimeMs: number;
  readonly p95FrameTimeMs: number;
  readonly inputToRenderMs: number | null;
  readonly renderCount: number;
}

/** Collects bounded frame and input timing samples for developer diagnostics. */
export class RenderMetrics {
  private readonly frameTimes: number[] = [];
  private inputAt: number | null = null;
  private renderCount = 0;

  markInput(timestamp = performance.now()): void { this.inputAt = timestamp; }

  recordFrame(durationMs: number): void {
    if (!Number.isFinite(durationMs) || durationMs < 0) return;
    this.renderCount += 1;
    this.frameTimes.push(durationMs);
    if (this.frameTimes.length > 120) this.frameTimes.shift();
  }

  snapshot(): RenderMetricsSnapshot {
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const average = this.frameTimes.length === 0 ? 0 : this.frameTimes.reduce((sum, value) => sum + value, 0) / this.frameTimes.length;
    const p95 = sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]!;
    return {
      fps: average > 0 ? 1000 / average : 0,
      averageFrameTimeMs: average,
      p95FrameTimeMs: p95,
      inputToRenderMs: this.inputAt === null ? null : Math.max(0, performance.now() - this.inputAt),
      renderCount: this.renderCount,
    };
  }
}
