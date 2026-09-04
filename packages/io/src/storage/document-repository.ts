import type { PersistedDocument } from '../schema/document-v1.js';

export interface DocumentVersion {
  readonly id: string;
  readonly name: string;
  readonly document: PersistedDocument;
}

export interface DocumentRepository {
  save(snapshot: PersistedDocument): Promise<void>;
  load(documentId: string): Promise<PersistedDocument | null>;
  saveAtomic?(snapshot: PersistedDocument, knownGoodKey: string): Promise<void>;
  loadKnownGood?(knownGoodKey: string): Promise<PersistedDocument | null>;
  saveVersion?(version: DocumentVersion, key: string): Promise<void>;
  loadVersions?(key: string): Promise<readonly DocumentVersion[]>;
  listDocuments?(): Promise<readonly string[]>;
  deleteDocument?(documentId: string): Promise<void>;
}
