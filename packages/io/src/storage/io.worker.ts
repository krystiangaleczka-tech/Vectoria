/// <reference lib="webworker" />
import type { PersistedDocument } from '../schema/document-v1.js';

self.addEventListener('message', async (e: MessageEvent) => {
  const { id, type, payload } = e.data;
  
  try {
    if (type === 'compress') {
      const json = JSON.stringify(payload);
      const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
      const buffer = await new Response(stream).arrayBuffer();
      self.postMessage({ id, type: 'compress_result', payload: buffer }, [buffer]);
    } else if (type === 'decompress') {
      const stream = new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'));
      const text = await new Response(stream).text();
      const doc = JSON.parse(text) as PersistedDocument;
      self.postMessage({ id, type: 'decompress_result', payload: doc });
    }
  } catch (error) {
    self.postMessage({ id, type: 'error', error: error instanceof Error ? error.message : 'Worker error' });
  }
});
