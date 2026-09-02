import type { DocumentModel } from '@vectoria/core';
import { validateInvariants } from '@vectoria/core';
import { parseAndMigrateDocument, PersistedDocumentSchema, serializeDocument } from '../schema/document-v1.js';
import { compressDocument, decompressDocument } from '../storage/worker-client.js';

const VCT_MIME = 'application/x-vectoria-vct';

/**
 * Serialize the live document to a portable .vct blob. Compression runs in the
 * io worker so the main thread never blocks (epic non-blocking invariant).
 */
export async function exportVctFile(document: DocumentModel): Promise<Blob> {
  const violations = validateInvariants(document);
  if (violations.length > 0) {
    throw new Error(`Refusing to export invalid document: ${violations.map((v) => v.code).join(', ')}`);
  }
  const json = serializeDocument(document);
  try {
    const compressed = await compressDocument(JSON.parse(json));
    return new Blob([compressed], { type: VCT_MIME });
  } catch {
    return new Blob([json], { type: VCT_MIME }); // uncompressed fallback
  }
}

/**
 * Parse a .vct file: decompress → Zod → migrate → invariants. Throws with
 * user-facing messages; caller guarantees the active document stays untouched.
 */
export async function importVctFile(file: File): Promise<DocumentModel> {
  const buffer = await file.arrayBuffer();
  let raw: unknown;
  try {
    raw = await decompressDocument(buffer);
  } catch {
    raw = JSON.parse(new TextDecoder().decode(buffer)); // plain JSON .vct
  }
  const persisted = PersistedDocumentSchema.parse(raw);
  const document = parseAndMigrateDocument(persisted.document);
  if (persisted.schemaVersion !== document.schemaVersion) {
    throw new Error(`Nieobsługiwana wersja schematu: ${persisted.schemaVersion}. Zaktualizuj aplikację.`);
  }
  const violations = validateInvariants(document);
  if (violations.length > 0) {
    throw new Error(`Plik narusza invariants: ${violations.slice(0, 3).map((v) => v.code).join(', ')}`);
  }
  return document;
}
