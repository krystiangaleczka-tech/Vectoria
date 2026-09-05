import type { PersistedDocument } from '../schema/document-v1.js';

export interface DocumentVersion {
  readonly id: string;
  readonly name: string;
  readonly document: PersistedDocument;
}

export interface DocumentRepository {
  load(documentId: string): Promise<PersistedDocument | null>;
  save(documentId: string, snapshot: PersistedDocument): Promise<void>;
  deleteDocument?(documentId: string): Promise<void>;
  listDocuments?(): Promise<readonly string[]>;
  saveAtomic?(documentId: string, snapshot: PersistedDocument, knownGoodKey?: string): Promise<void>;
  loadKnownGood?(documentId: string): Promise<PersistedDocument | null>;
  saveVersion?(version: DocumentVersion, key: string): Promise<void>;
  loadVersions?(key: string): Promise<readonly DocumentVersion[]>;
}

/** In-memory implementation of DocumentRepository for tests and portable headless sessions. */
export class MemoryDocumentRepository implements DocumentRepository {
  private docs = new Map<string, PersistedDocument>();

  async load(documentId: string): Promise<PersistedDocument | null> {
    return this.docs.get(documentId) ?? null;
  }

  async save(documentId: string, snapshot: PersistedDocument): Promise<void> {
    this.docs.set(documentId, snapshot);
  }

  async deleteDocument(documentId: string): Promise<void> {
    this.docs.delete(documentId);
  }

  async listDocuments(): Promise<readonly string[]> {
    return Array.from(this.docs.keys());
  }

  async saveAtomic(documentId: string, snapshot: PersistedDocument, knownGoodKey?: string): Promise<void> {
    this.docs.set(documentId, snapshot);
    if (knownGoodKey) {
      this.docs.set(knownGoodKey, snapshot);
    }
  }

  async loadKnownGood(documentId: string): Promise<PersistedDocument | null> {
    return this.load(documentId);
  }
}

