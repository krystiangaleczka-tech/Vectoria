import type { DocumentModel } from '@vectoria/core';
import { createDefaultDocument, validateInvariants } from '@vectoria/core';
import { parseAndMigrateDocument, PersistedDocumentSchema, type PersistedDocument } from '../schema/document-v1.js';
import { IndexedDBDocumentRepository } from './indexeddb-repository.js';

const CURRENT_DOC_KEY = 'current_document';
const LAST_KNOWN_GOOD_KEY = 'last_known_good_document';
const repository = new IndexedDBDocumentRepository(CURRENT_DOC_KEY);

export type BootstrapState =
  | { status: 'loading' }
  | { status: 'ready'; document: DocumentModel; revision: number; savedAt?: string }
  | {
      status: 'recovery-error';
      document: DocumentModel;
      error: string;
      revision: number;
    };

/**
 * Loads the active document from IndexedDB, validates it, and returns BootstrapState.
 */
export async function bootstrapDocument(): Promise<BootstrapState> {
  try {
    const raw = await repository.load(CURRENT_DOC_KEY);

    if (!raw) {
      const defaultDoc = createDefaultDocument();
      await saveDocument(defaultDoc, 0);
      return { status: 'ready', document: defaultDoc, revision: 0 };
    }

    const persisted = typeof raw === 'object' && raw !== null && 'document' in raw
      ? PersistedDocumentSchema.parse(raw)
      : null;
    const parsed = parseAndMigrateDocument(persisted?.document ?? raw);
    if (persisted && persisted.schemaVersion !== parsed.schemaVersion) {
      throw new Error(`Unsupported persisted schema version: ${persisted.schemaVersion}`);
    }
    const violations = validateInvariants(parsed);
    if (violations.length > 0) {
      throw new Error(`Invariant violations: ${violations.map((v) => v.message).join(', ')}`);
    }

    const envelope = persisted as Partial<PersistedDocument> | null;
    return {
      status: 'ready',
      document: parsed,
      revision: typeof envelope?.revision === 'number' && Number.isInteger(envelope.revision) && envelope.revision >= 0 ? envelope.revision : 0,
      savedAt: typeof envelope?.savedAt === 'string' ? envelope.savedAt : undefined,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Vectoria] Document recovery fallback triggered:', errorMsg);
    const knownGood = await repository.loadKnownGood?.(LAST_KNOWN_GOOD_KEY).catch(() => null);
    if (knownGood) {
      try {
        const recovered = parseAndMigrateDocument(knownGood.document);
        if (validateInvariants(recovered).length === 0) {
          return { status: 'recovery-error', document: recovered, error: errorMsg, revision: knownGood.revision };
        }
      } catch {
        // Fall through to a fresh document when both snapshots are unusable.
      }
    }
    const fallbackDoc = createDefaultDocument();
    return {
      status: 'recovery-error',
      document: fallbackDoc,
      error: errorMsg,
      revision: 0,
    };
  }
}

/**
 * Persists a document into IndexedDB.
 */
export async function saveDocument(document: DocumentModel, revision = 0): Promise<void> {
  return saveDocumentSnapshot(document, revision);
}

/** Persists validated document snapshot with revision metadata for stale-write guards. */
export async function saveDocumentSnapshot(document: DocumentModel, revision: number): Promise<void> {
  if (!Number.isInteger(revision) || revision < 0) {
    throw new Error('Cannot persist document with invalid revision');
  }
  const violations = validateInvariants(document);
  if (violations.length > 0) {
    throw new Error(`Cannot persist invalid document: ${violations.map((v) => v.code).join(', ')}`);
  }
  const snapshot: PersistedDocument = {
    app: 'vectoria',
    schemaVersion: document.schemaVersion,
    document,
    revision,
    savedAt: new Date().toISOString(),
  };
  return repository.saveAtomic?.(snapshot, LAST_KNOWN_GOOD_KEY) ?? repository.save(snapshot);
}
