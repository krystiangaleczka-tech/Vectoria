import type { PersistedDocument } from '../schema/document-v1.js';

let workerInstance: Worker | null = null;
let messageId = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(new URL('./io.worker.js', import.meta.url), { type: 'module' });
    workerInstance.addEventListener('message', (e) => {
      const { id, type, payload, error } = e.data;
      const req = pendingRequests.get(id);
      if (!req) return;
      pendingRequests.delete(id);
      
      if (type === 'error') {
        req.reject(new Error(error));
      } else {
        req.resolve(payload);
      }
    });
  }
  return workerInstance;
}

export function compressDocument(doc: PersistedDocument): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    pendingRequests.set(id, { resolve, reject });
    getWorker().postMessage({ id, type: 'compress', payload: doc });
  });
}

export function decompressDocument(buffer: ArrayBuffer): Promise<PersistedDocument> {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    pendingRequests.set(id, { resolve, reject });
    getWorker().postMessage({ id, type: 'decompress', payload: buffer }, [buffer]);
  });
}
