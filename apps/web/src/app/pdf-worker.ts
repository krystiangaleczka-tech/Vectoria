import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { configurePdfWorker } from '@vectoria/io';

let configured = false;

/**
 * Points pdf.js at the locally bundled worker asset.
 * Must run before the first PDF import; keeps the PWA offline-capable
 * by never fetching the worker from a CDN.
 */
export function ensurePdfWorker(): void {
  if (configured) return;
  configurePdfWorker(pdfWorkerUrl);
  configured = true;
}
