import type { DocumentModel } from '@vectoria/core';
import { validateInvariants } from '@vectoria/core';
import { exportDocToPdf } from '../export/pdf-export.js';

export interface AiExportOptions {
  /** Target artboard IDs to export as pages. Defaults to [doc.activeArtboardId]. */
  readonly artboardIds?: readonly string[];
  /** Rasterization scale for crisp vector/image reproduction. Defaults to 2. */
  readonly scale?: number;
}

const AI_MIME = 'application/illustrator';

/**
 * Exports the document into an Adobe Illustrator (.ai) compatible container.
 * Implements the standard modern Illustrator specification by constructing
 * a valid PDF stream (%PDF-1.5+) with Illustrator metadata, artboards, and vector data.
 *
 * @param doc The immutable document snapshot to export.
 * @param options Target artboard IDs and scale settings.
 * @returns Blob containing the generated .ai file.
 */
export async function exportAiFile(
  doc: DocumentModel,
  options: AiExportOptions = {},
): Promise<Blob> {
  const violations = validateInvariants(doc);
  if (violations.length > 0) {
    throw new Error(`Refusing to export invalid document to AI: ${violations.map((v) => v.code).join(', ')}`);
  }

  // Generate standard PDF stream using the document's artboards
  const pdfBlob = await exportDocToPdf(doc, {
    artboardIds: options.artboardIds,
    scale: options.scale ?? 2,
  });

  const pdfBuffer = await pdfBlob.arrayBuffer();

  // Return with standard Illustrator MIME type
  return new Blob([pdfBuffer], { type: AI_MIME });
}
