import type { PersistedDocument } from '../schema/document-v1.js';
import type { DocumentRepository, DocumentVersion } from './document-repository.js';
import { compressDocument, decompressDocument } from './worker-client.js';

const DB_NAME = 'vectoria_db';
const DB_VERSION = 4;
const STORE_NAME = 'documents';
const MAX_DOCUMENT_VERSIONS = 20;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      if (!request.result.objectStoreNames.contains('palettes')) request.result.createObjectStore('palettes');
      if (!request.result.objectStoreNames.contains('workspace')) request.result.createObjectStore('workspace');
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
    
    let payload: PersistedDocument | ArrayBuffer = snapshot;
    try {
      payload = await compressDocument(snapshot);
    } catch (e) {
      console.warn('Document compression failed, falling back to uncompressed', e);
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(payload, this.storageKey ?? snapshot.document.id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Failed to save document to IndexedDB'));
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB save transaction aborted'));
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        throw new Error('QUOTA_EXCEEDED', { cause: e });
      }
      throw e;
    } finally {
      db.close();
    }
  }

  /** Commit current and last-known-good snapshots in one IndexedDB transaction. */
  async saveAtomic(snapshot: PersistedDocument, knownGoodKey: string): Promise<void> {
    const db = await openDB();
    
    let payload: PersistedDocument | ArrayBuffer = snapshot;
    try {
      payload = await compressDocument(snapshot);
    } catch (e) {
      console.warn('Document compression failed, falling back to uncompressed', e);
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(payload, this.storageKey ?? snapshot.document.id);
        store.put(payload, knownGoodKey);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Failed to atomically save document snapshots'));
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB atomic save aborted'));
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        throw new Error('QUOTA_EXCEEDED', { cause: e });
      }
      throw e;
    } finally {
      db.close();
    }
  }

  /** Loads one persisted envelope, returning null when no snapshot exists. */
  async load(documentId: string): Promise<PersistedDocument | null> {
    const db = await openDB();
    const raw = await new Promise<PersistedDocument | ArrayBuffer | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(documentId);
      request.onsuccess = () => resolve((request.result as PersistedDocument | ArrayBuffer | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('Failed to load document from IndexedDB'));
    });
    db.close();
    
    if (!raw) return null;
    
    if (raw instanceof ArrayBuffer) {
      try {
        return await decompressDocument(raw);
      } catch (e) {
        throw new Error('Failed to decompress document', { cause: e });
      }
    }
    
    return raw as PersistedDocument;
  }

  async loadKnownGood(knownGoodKey: string): Promise<PersistedDocument | null> {
    return this.load(knownGoodKey);
  }

  async saveVersion(version: DocumentVersion, key: string): Promise<void> {
    const versions = [...(await this.loadVersions(key))].filter((item) => item.id !== version.id);
    versions.unshift(version);
    versions.splice(MAX_DOCUMENT_VERSIONS);
    
    // We don't compress versions array directly because it's a list.
    // Instead we can compress individual version documents if needed.
    // For simplicity we will compress them before saving the whole array.
    
    // However, saving versions is not modified to compress yet.
    
    const db = await openDB();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(versions, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Failed to save document version'));
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB version save aborted'));
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        throw new Error('QUOTA_EXCEEDED', { cause: e });
      }
      throw e;
    } finally {
      db.close();
    }
  }

  async loadVersions(key: string): Promise<readonly DocumentVersion[]> {
    const db = await openDB();
    const versions = await new Promise<readonly DocumentVersion[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result as DocumentVersion[] : []);
      request.onerror = () => reject(request.error ?? new Error('Failed to load document versions'));
    });
    db.close();
    return versions;
  }

  /** Lists all document keys stored in the documents object store. */
  async listDocuments(): Promise<readonly string[]> {
    const db = await openDB();
    try {
      return await new Promise<readonly string[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        if ('getAllKeys' in store) {
          const req = store.getAllKeys();
          req.onsuccess = () => {
            const keys = (req.result as IDBValidKey[]).map(String);
            resolve(keys);
          };
          req.onerror = () => reject(req.error ?? new Error('Failed to list document keys'));
        } else {
          resolve([]);
        }
      });
    } finally {
      db.close();
    }
  }

  /** Deletes a document by key from the documents store. */
  async deleteDocument(documentId: string): Promise<void> {
    const db = await openDB();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(documentId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Failed to delete document'));
        tx.onabort = () => reject(tx.error ?? new Error('Document deletion aborted'));
      });
    } finally {
      db.close();
    }
  }
}
