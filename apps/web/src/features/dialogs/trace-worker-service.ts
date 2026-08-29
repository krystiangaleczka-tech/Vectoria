import type { PathObject, PixelBuffer, TraceOptions } from '@vectoria/core';
import { traceImageToPaths } from '@vectoria/core';
import TraceWorkerCtor from './trace.worker.ts?worker';
import type { TraceWorkerRequest, TraceWorkerResponse } from './trace.worker.js';

export interface TraceJobRequest {
  jobId: string;
  pixels: PixelBuffer;
  options: TraceOptions;
}

export interface TraceJobResponse {
  jobId: string;
  paths?: PathObject[];
  cancelled?: boolean;
  error?: string;
}

type PendingCallback = (res: TraceJobResponse) => void;

let worker: Worker | null = null;
let activeJobId: string | null = null;
const pending = new Map<string, PendingCallback>();
const fallbackCancelled = new Set<string>();

function ensureWorker(): Worker | null {
  if (worker) return worker;

  if (typeof Worker === 'undefined') return null;

  try {
    const created = new TraceWorkerCtor();

    created.onmessage = (event: MessageEvent<TraceWorkerResponse>) => {      const res = event.data;
      const callback = pending.get(res.jobId);
      pending.delete(res.jobId);
      if (activeJobId === res.jobId) activeJobId = null;
      callback?.(res);
    };

    created.onerror = () => {
      for (const [jobId, callback] of pending) {
        callback({ jobId, error: 'Trace worker crashed.' });
      }
      pending.clear();
      activeJobId = null;
      worker = null;
      created.terminate();
    };

    worker = created;
    return created;
  } catch {
    return null;
  }
}

function runOnMainThread(request: TraceJobRequest, onComplete: PendingCallback): void {
  const { jobId, pixels, options } = request;
  fallbackCancelled.delete(jobId);

  setTimeout(() => {
    if (fallbackCancelled.has(jobId)) {
      fallbackCancelled.delete(jobId);
      onComplete({ jobId, cancelled: true });
      return;
    }

    try {
      const paths = traceImageToPaths(pixels, options, () => fallbackCancelled.has(jobId));

      if (fallbackCancelled.has(jobId)) {
        fallbackCancelled.delete(jobId);
        onComplete({ jobId, cancelled: true });
        return;
      }

      fallbackCancelled.delete(jobId);
      onComplete({ jobId, paths });
    } catch (err) {
      fallbackCancelled.delete(jobId);
      onComplete({ jobId, error: err instanceof Error ? err.message : String(err) });
    }
  }, 0);
}

/**
 * Runs a trace job off the main thread in a dedicated Web Worker.
 * Falls back to a deferred main-thread run only when Worker is unavailable
 * (e.g. test environments), keeping the dialog API identical.
 */
export function runTraceJob(request: TraceJobRequest, onComplete: PendingCallback): void {
  const currentWorker = ensureWorker();

  if (!currentWorker) {
    runOnMainThread(request, onComplete);
    return;
  }

  pending.set(request.jobId, onComplete);
  activeJobId = request.jobId;

  const message: TraceWorkerRequest = {
    type: 'trace',
    jobId: request.jobId,
    pixels: request.pixels,
    options: request.options,
  };
  currentWorker.postMessage(message);
}

/**
 * Cancels an in-flight trace job. Terminates the worker so a long-running
 * pixel loop stops immediately; a fresh worker is spawned for the next job.
 */
export function cancelTraceJob(jobId: string): void {
  pending.delete(jobId);
  fallbackCancelled.add(jobId);

  if (worker && activeJobId === jobId) {
    worker.terminate();
    worker = null;
    activeJobId = null;
  }
}
