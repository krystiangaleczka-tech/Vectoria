/// <reference lib="webworker" />
import { importPdf } from './pdf-vector-importer.js';

self.onmessage = async (event: MessageEvent) => {
  const { type, buffer, options } = event.data;
  if (type === 'IMPORT_PDF') {
    try {
      const document = await importPdf(buffer, options);
      self.postMessage({ type: 'IMPORT_RESULT', document });
    } catch (err: unknown) {
      self.postMessage({
        type: 'IMPORT_ERROR',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
};
