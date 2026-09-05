import type { ExportExecutionSnapshot, ExportJob, ExportRequest, ExportStage } from './export-types.js';

export interface JobInput {
  readonly request: ExportRequest;
  readonly snapshot?: ExportExecutionSnapshot;
  readonly run: (
    signal: AbortSignal,
    onStage: (stage: ExportStage, progress?: number) => void,
    snapshot?: ExportExecutionSnapshot,
  ) => Promise<{ blob: Blob; fileName: string }>;
}

/**
 * Sequential FIFO export queue runner with progress reporting and cancellation support.
 * Guarantees that export jobs are executed one at a time without blocking the UI.
 */
export class ExportJobRunner {
  private jobs: ExportJob[] = [];
  private queue: Array<{ id: string; input: JobInput }> = [];
  private controllers = new Map<string, AbortController>();
  private listeners = new Set<(jobs: readonly ExportJob[]) => void>();
  private isProcessing = false;

  /**
   * Enqueues a new export task.
   *
   * @param input Definition of the export job and its runner callback.
   * @returns Generated unique job ID.
   */
  enqueue(input: JobInput): string {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const job: ExportJob = {
      id,
      status: 'queued',
    };

    this.jobs = [...this.jobs, job];
    this.queue.push({ id, input });
    this.notify();

    void this.processNext();
    return id;
  }

  /**
   * Cancels a queued or currently running export job.
   *
   * @param id ID of the job to cancel.
   */
  cancel(id: string): void {
    // If job is still queued in queue array, remove it and mark cancelled
    const queuedIndex = this.queue.findIndex((item) => item.id === id);
    if (queuedIndex !== -1) {
      this.queue.splice(queuedIndex, 1);
      this.updateJob(id, { status: 'cancelled' });
      return;
    }

    // If job is currently running, abort its signal
    const controller = this.controllers.get(id);
    if (controller) {
      controller.abort();
    }
  }

  /**
   * Subscribes to updates whenever the job list or job status changes.
   *
   * @param listener Callback receiving the updated immutable jobs array.
   * @returns Unsubscribe callback.
   */
  subscribe(listener: (jobs: readonly ExportJob[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Current snapshot of all jobs.
   */
  get snapshot(): readonly ExportJob[] {
    return this.jobs;
  }

  /**
   * Removes finished, errored, or cancelled jobs from the snapshot list.
   */
  clearCompleted(): void {
    this.jobs = this.jobs.filter((j) => j.status === 'queued' || j.status === 'running');
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.jobs);
    }
  }

  private updateJob(id: string, patch: Partial<ExportJob>): void {
    this.jobs = this.jobs.map((job) => (job.id === id ? { ...job, ...patch } : job));
    this.notify();
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing) return;
    const next = this.queue.shift();
    if (!next) return;

    this.isProcessing = true;
    const { id, input } = next;
    const controller = new AbortController();
    this.controllers.set(id, controller);

    this.updateJob(id, { status: 'running', stage: 'serialize', progress: 0 });

    try {
      const onStage = (stage: ExportStage, progress?: number) => {
        this.updateJob(id, { stage, progress });
      };

      const result = await input.run(controller.signal, onStage, input.snapshot);

      if (controller.signal.aborted) {
        this.updateJob(id, { status: 'cancelled' });
      } else {
        this.updateJob(id, {
          status: 'done',
          stage: 'deliver',
          progress: 1,
          result,
        });
      }
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof Error && (error.name === 'AbortError' || error.message.includes('Aborted')))
      ) {
        this.updateJob(id, { status: 'cancelled' });
      } else {
        const message = error instanceof Error ? error.message : 'Export failed';
        const code = message.startsWith('EXPORT_') ? message.split(':')[0]!.trim() : 'EXPORT_FAILED';
        this.updateJob(id, {
          status: 'error',
          error: { code, message },
        });
      }
    } finally {
      this.controllers.delete(id);
      this.isProcessing = false;
      // Drain next item in queue
      void this.processNext();
    }
  }
}
