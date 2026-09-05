import type { DocumentModel } from '@vectoria/core';
import { createDefaultDocument, validateInvariants } from '@vectoria/core';
import { parseAndMigrateDocument, PersistedDocumentSchema, type PersistedDocument } from '../schema/document-v1.js';
import { IndexedDBDocumentRepository } from './indexeddb-repository.js';
import type { DocumentRepository, DocumentVersion } from './document-repository.js';

const CURRENT_DOC_KEY = 'current_document';
const LAST_KNOWN_GOOD_KEY = 'last_known_good_document';
const VERSIONS_KEY = 'document_versions';
let activeRepository: DocumentRepository = new IndexedDBDocumentRepository();
const SESSION_MARKER = 'vectoria-session-open';

/** Injects a custom DocumentRepository instance for testing or alternative storage providers. */
export function setDocumentRepository(repo: DocumentRepository): void {
  activeRepository = repo;
}

/** Returns the currently active DocumentRepository. */
export function getDocumentRepository(): DocumentRepository {
  return activeRepository;
}

export function markSessionOpen(): void {
  try { sessionStorage.setItem(SESSION_MARKER, '1'); } catch { /* storage may be unavailable */ }
}

export function markSessionClosed(): void {
  try { sessionStorage.removeItem(SESSION_MARKER); } catch { /* storage may be unavailable */ }
}

function hadInterruptedSession(): boolean {
  try { return sessionStorage.getItem(SESSION_MARKER) === '1'; } catch { return false; }
}

export type BootstrapState =
  | { status: 'loading' }
  | { status: 'ready'; document: DocumentModel; revision: number; savedAt?: string }
  | { status: 'recovery-available'; document: DocumentModel; recoveryDocument: DocumentModel; error: string; revision: number }
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
    const raw = await activeRepository.load(CURRENT_DOC_KEY);

    if (!raw) {
      const defaultDoc = createDefaultDocument();
      await saveDocument(defaultDoc, 0, CURRENT_DOC_KEY);
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
    const revision = typeof envelope?.revision === 'number' && Number.isInteger(envelope.revision) && envelope.revision >= 0 ? envelope.revision : 0;
    const knownGood = await activeRepository.loadKnownGood?.(LAST_KNOWN_GOOD_KEY).catch(() => null);
    if (hadInterruptedSession() && knownGood && knownGood.revision <= revision) {
      const recoveryDocument = parseAndMigrateDocument(knownGood.document);
      if (validateInvariants(recoveryDocument).length === 0) {
        return { status: 'recovery-available', document: parsed, recoveryDocument, error: 'Previous session did not close cleanly.', revision };
      }
    }
    return {
      status: 'ready',
      document: parsed,
      revision,
      savedAt: typeof envelope?.savedAt === 'string' ? envelope.savedAt : undefined,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Vectoria] Document recovery fallback triggered:', errorMsg);
    const knownGood = await activeRepository.loadKnownGood?.(LAST_KNOWN_GOOD_KEY).catch(() => null);
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
export async function saveDocument(document: DocumentModel, revision = 0, documentId?: string): Promise<void> {
  return saveDocumentSnapshot(document, revision, documentId);
}

export async function saveLastKnownGoodSnapshot(document: DocumentModel, revision: number, documentId?: string): Promise<void> {
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
  const key = documentId ?? document.id;
  return activeRepository.saveAtomic?.(key, snapshot, LAST_KNOWN_GOOD_KEY) ?? activeRepository.save(key, snapshot);
}

/** Persists validated document snapshot with revision metadata for stale-write guards. */
export async function saveDocumentSnapshot(document: DocumentModel, revision: number, documentId?: string): Promise<void> {
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
  const key = documentId ?? document.id;
  return activeRepository.save(key, snapshot);
}

/** Save a bounded named document version without changing the active document. */
export async function saveDocumentVersion(document: DocumentModel, name: string, revision: number): Promise<DocumentVersion> {
  if (!name.trim()) throw new Error('Version name cannot be empty');
  if (!Number.isInteger(revision) || revision < 0) throw new Error('Cannot version document with invalid revision');
  const violations = validateInvariants(document);
  if (violations.length > 0) throw new Error(`Cannot version invalid document: ${violations.map((v) => v.code).join(', ')}`);
  const version: DocumentVersion = {
    id: `${revision}-${Date.now()}`,
    name: name.trim().slice(0, 120),
    document: { app: 'vectoria', schemaVersion: document.schemaVersion, document, revision, savedAt: new Date().toISOString() },
  };
  if (!activeRepository.saveVersion) throw new Error('Versioned persistence is not supported');
  await activeRepository.saveVersion(version, VERSIONS_KEY);
  return version;
}

/** Load version metadata and snapshots ordered newest first. */
export async function listDocumentVersions(): Promise<readonly DocumentVersion[]> {
  return activeRepository.loadVersions?.(VERSIONS_KEY) ?? [];
}
