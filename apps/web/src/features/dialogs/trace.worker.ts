import type { PathObject, PixelBuffer, TraceOptions } from '@vectoria/core';
import { traceImageToPaths } from '@vectoria/core';

export type TraceWorkerRequest =
  | { type: 'trace'; jobId: string; pixels: PixelBuffer; options: TraceOptions }
  | { type: 'cancel'; jobId: string };

export interface TraceWorkerResponse {
  jobId: string;
  paths?: PathObject[];
  cancelled?: boolean;
  error?: string;
}

const ctx = self as unknown as {
  postMessage: (msg: TraceWorkerResponse) => void;
  onmessage: ((event: MessageEvent<TraceWorkerRequest>) => void) | null;
};

const cancelledJobs = new Set<string>();

ctx.onmessage = (event) => {
  const msg = event.data;

  if (msg.type === 'cancel') {
    cancelledJobs.add(msg.jobId);
    return;
  }

  const { jobId, pixels, options } = msg;
  try {
    if (cancelledJobs.has(jobId)) {
      cancelledJobs.delete(jobId);
      ctx.postMessage({ jobId, cancelled: true });
      return;
    }

    const paths = traceImageToPaths(pixels, options, () => cancelledJobs.has(jobId));

    if (cancelledJobs.has(jobId)) {
      cancelledJobs.delete(jobId);
      ctx.postMessage({ jobId, cancelled: true });
      return;
    }

    ctx.postMessage({ jobId, paths });
  } catch (err) {
    cancelledJobs.delete(jobId);
    ctx.postMessage({ jobId, error: err instanceof Error ? err.message : String(err) });
  }
};
