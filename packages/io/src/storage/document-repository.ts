import type { PersistedDocument } from '../schema/document-v1.js';

export interface DocumentRepository {
  save(snapshot: PersistedDocument): Promise<void>;
  load(documentId: string): Promise<PersistedDocument | null>;
  saveAtomic?(snapshot: PersistedDocument, knownGoodKey: string): Promise<void>;
  loadKnownGood?(knownGoodKey: string): Promise<PersistedDocument | null>;
}
