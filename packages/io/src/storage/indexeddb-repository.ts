import type { PersistedDocument } from '../schema/document-v1.js';
import type { DocumentRepository } from './document-repository.js';

const DB_NAME = 'vectoria_db';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

export class IndexedDBDocumentRepository implements DocumentRepository {
  constructor(private readonly storageKey?: string) {}

  /** Saves one validated document envelope under its stable document key. */
  async save(snapshot: PersistedDocument): Promise<void> {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(snapshot, this.storageKey ?? snapshot.document.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to save document to IndexedDB'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB save transaction aborted'));
    });
    db.close();
  }

  /** Loads one persisted envelope, returning null when no snapshot exists. */
  async load(documentId: string): Promise<PersistedDocument | null> {
    const db = await openDB();
    const snapshot = await new Promise<PersistedDocument | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(documentId);
      request.onsuccess = () => resolve((request.result as PersistedDocument | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('Failed to load document from IndexedDB'));
    });
    db.close();
    return snapshot;
  }
}
