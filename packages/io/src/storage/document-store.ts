import type { DocumentModel } from '@vectoria/core';
import { createDefaultDocument, validateInvariants } from '@vectoria/core';
import { parseAndMigrateDocument } from '../schema/document-v1.js';

const DB_NAME = 'vectoria_db';
const DB_VERSION = 1;
const STORE_NAME = 'documents';
const CURRENT_DOC_KEY = 'current_document';

export type BootstrapState =
  | { status: 'loading' }
  | { status: 'ready'; document: DocumentModel }
  | {
      status: 'recovery-error';
      document: DocumentModel;
      error: string;
    };

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

/**
 * Loads the active document from IndexedDB, validates it, and returns BootstrapState.
 */
export async function bootstrapDocument(): Promise<BootstrapState> {
  try {
    const db = await openDB();
    const raw = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(CURRENT_DOC_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!raw) {
      const defaultDoc = createDefaultDocument();
      await saveDocument(defaultDoc);
      return { status: 'ready', document: defaultDoc };
    }

    const parsed = parseAndMigrateDocument(raw);
    const violations = validateInvariants(parsed);
    if (violations.length > 0) {
      throw new Error(`Invariant violations: ${violations.map((v) => v.message).join(', ')}`);
    }

    return { status: 'ready', document: parsed };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Vectoria] Document recovery fallback triggered:', errorMsg);
    const fallbackDoc = createDefaultDocument();
    return {
      status: 'recovery-error',
      document: fallbackDoc,
      error: errorMsg,
    };
  }
}

/**
 * Persists a document into IndexedDB.
 */
export async function saveDocument(document: DocumentModel): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(document, CURRENT_DOC_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('Failed to save document to IndexedDB'));
  });
}
