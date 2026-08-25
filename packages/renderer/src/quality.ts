export type RenderQuality = 'interactive' | 'settling' | 'final';

export interface RenderQualityOptions {
  readonly settlingDelayMs?: number;
  readonly onChange?: (quality: RenderQuality) => void;
}

/** Coordinates cheap interaction rendering with delayed final-quality rendering. */
export class RenderQualityPolicy {
  private _quality: RenderQuality = 'final';
  private settlingTimer: ReturnType<typeof setTimeout> | null = null;
  private manualPerformance = false;

  constructor(private readonly options: RenderQualityOptions = {}) {}

  get quality(): RenderQuality { return this._quality; }

  get performanceMode(): boolean { return this.manualPerformance; }

  beginInteraction(): void {
    this.clearTimer();
    this.setQuality('interactive');
  }

  endInteraction(): void {
    this.clearTimer();
    this.setQuality('settling');
    this.settlingTimer = setTimeout(() => {
      this.settlingTimer = null;
      this.setQuality(this.manualPerformance ? 'interactive' : 'final');
    }, this.options.settlingDelayMs ?? 120);
  }

  setPerformanceMode(enabled: boolean): void {
    this.manualPerformance = enabled;
    if (!enabled && this._quality === 'interactive') this.setQuality('final');
  }

  dispose(): void { this.clearTimer(); }

  private setQuality(quality: RenderQuality): void {
    if (this._quality === quality) return;
    this._quality = quality;
    this.options.onChange?.(quality);
  }

  private clearTimer(): void {
    if (this.settlingTimer !== null) clearTimeout(this.settlingTimer);
    this.settlingTimer = null;
  }
}
