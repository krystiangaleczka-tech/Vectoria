// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { runTraceJob, cancelTraceJob } from '../src/features/dialogs/trace-worker-service.js';
import type { PixelBuffer } from '@vectoria/core';

function halfBlackPixels(width: number, height: number): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const solid = x < width / 2;
      data[i] = solid ? 0 : 255;
      data[i + 1] = solid ? 0 : 255;
      data[i + 2] = solid ? 0 : 255;
      data[i + 3] = solid ? 255 : 0;
    }
  }
  return { data, width, height };
}

describe('trace-worker-service (ASSET-016/017)', () => {
  it('traces a bitmap into paths via the main-thread fallback (no Worker in jsdom)', async () => {
    const result = await new Promise<{ jobId: string; paths?: unknown[]; cancelled?: boolean; error?: string }>((resolve) => {
      runTraceJob(
        { jobId: 'job-1', pixels: halfBlackPixels(8, 8), options: { mode: 'black-and-white', threshold: 128 } },
        resolve,
      );
    });

    expect(result.error).toBeUndefined();
    expect(result.cancelled).toBeFalsy();
    expect(Array.isArray(result.paths)).toBe(true);
    expect(result.paths!.length).toBeGreaterThan(0);
  });

  it('reports cancelled when cancel arrives before the deferred run executes', async () => {
    const result = await new Promise<{ jobId: string; paths?: unknown[]; cancelled?: boolean; error?: string }>((resolve) => {
      const jobId = 'job-cancel';
      runTraceJob(
        { jobId, pixels: halfBlackPixels(8, 8), options: { mode: 'black-and-white' } },
        resolve,
      );
      cancelTraceJob(jobId);
    });

    expect(result.cancelled).toBe(true);
  });

  it('cancel after completion is a harmless no-op', async () => {
    await new Promise((resolve) => {
      runTraceJob(
        { jobId: 'job-done', pixels: halfBlackPixels(8, 8), options: { mode: 'black-and-white' } },
        resolve,
      );
    });
    expect(() => cancelTraceJob('job-done')).not.toThrow();
  });
});
