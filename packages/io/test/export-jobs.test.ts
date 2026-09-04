import { describe, it, expect, vi } from 'vitest';
import { ExportJobRunner } from '../src/export/export-jobs.js';
import type { ExportRequest } from '../src/export/export-types.js';

const dummyRequest: ExportRequest = {
  target: { kind: 'artboard', artboardId: 'a1' },
  options: { format: 'png', scale: 1, optimizeSvg: false, fileNameTemplate: '{artboard}.{ext}' },
};

describe('ExportJobRunner (EXPORT-023, EXPORT-024)', () => {
  it('processes queued jobs sequentially in FIFO order', async () => {
    const runner = new ExportJobRunner();
    const order: number[] = [];

    const id1 = runner.enqueue({
      request: dummyRequest,
      run: async () => {
        await new Promise((r) => setTimeout(r, 10));
        order.push(1);
        return { blob: new Blob(['1']), fileName: '1.png' };
      },
    });

    const id2 = runner.enqueue({
      request: dummyRequest,
      run: async () => {
        order.push(2);
        return { blob: new Blob(['2']), fileName: '2.png' };
      },
    });

    expect(runner.snapshot.length).toBe(2);
    expect(runner.snapshot[0]!.id).toBe(id1);
    expect(runner.snapshot[1]!.id).toBe(id2);

    await vi.waitFor(() => {
      expect(runner.snapshot.every((j) => j.status === 'done')).toBe(true);
    });

    expect(order).toEqual([1, 2]);
  });

  it('handles cancellation of a running job via AbortSignal', async () => {
    const runner = new ExportJobRunner();

    const id = runner.enqueue({
      request: dummyRequest,
      run: async (signal) => {
        await new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        });
        return { blob: new Blob(['']), fileName: 'cancelled.png' };
      },
    });

    await vi.waitFor(() => {
      expect(runner.snapshot.find((j) => j.id === id)?.status).toBe('running');
    });

    runner.cancel(id);

    await vi.waitFor(() => {
      expect(runner.snapshot.find((j) => j.id === id)?.status).toBe('cancelled');
    });
  });

  it('cancels a queued job before execution starts', async () => {
    const runner = new ExportJobRunner();

    runner.enqueue({
      request: dummyRequest,
      run: async () => {
        await new Promise((r) => setTimeout(r, 20));
        return { blob: new Blob(['']), fileName: 'first.png' };
      },
    });

    const secondId = runner.enqueue({
      request: dummyRequest,
      run: async () => ({ blob: new Blob(['']), fileName: 'second.png' }),
    });

    runner.cancel(secondId);

    const secondJob = runner.snapshot.find((j) => j.id === secondId);
    expect(secondJob?.status).toBe('cancelled');
  });

  it('captures errors and transitions job status to error', async () => {
    const runner = new ExportJobRunner();

    const id = runner.enqueue({
      request: dummyRequest,
      run: async () => {
        throw new Error('EXPORT_MEMORY_LIMIT: Dimensions exceeded');
      },
    });

    await vi.waitFor(() => {
      const job = runner.snapshot.find((j) => j.id === id);
      expect(job?.status).toBe('error');
      expect(job?.error?.code).toBe('EXPORT_MEMORY_LIMIT');
      expect(job?.error?.message).toContain('Dimensions exceeded');
    });
  });
});
