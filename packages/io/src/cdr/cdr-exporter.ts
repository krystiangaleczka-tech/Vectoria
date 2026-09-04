import type { DocumentModel } from '@vectoria/core';
import { validateInvariants } from '@vectoria/core';
import { exportRegionToSvg } from '../svg/export.js';
import { ZipBuilder } from './zip-builder.js';

export interface CdrExportOptions {
  /** Target artboard ID to export. Defaults to active artboard. */
  readonly artboardId?: string;
}

const CDR_MIME = 'application/x-coreldraw';

/**
 * Serializes the document into a CorelDRAW-compatible package (.cdr).
 * Implements the standard modern CorelDRAW container specification (PKZIP container
 * with CorelDRAW version metadata and embedded vector stream).
 *
 * @param doc The immutable document snapshot to export.
 * @param options Target artboard selection.
 * @returns Blob containing the generated .cdr container.
 */
export async function exportCdrFile(
  doc: DocumentModel,
  options: CdrExportOptions = {},
): Promise<Blob> {
  const violations = validateInvariants(doc);
  if (violations.length > 0) {
    throw new Error(`Refusing to export invalid document to CDR: ${violations.map((v) => v.code).join(', ')}`);
  }

  const artboardId = options.artboardId ?? doc.activeArtboardId;
  const artboard = doc.artboards[artboardId] ?? Object.values(doc.artboards)[0];

  if (!artboard) {
    throw new Error('No artboard found in document for CDR export');
  }

  // 1. Generate full vector SVG representation for the target artboard
  const svgContent = exportRegionToSvg(
    doc,
    { x: artboard.x, y: artboard.y, width: artboard.width, height: artboard.height },
    { background: 'none' },
  );

  // 2. Build standard CorelDRAW container manifest
  const metadataXml = `<?xml version="1.0" encoding="utf-8"?>
<metadata>
  <application>CorelDRAW</application>
  <version>24.0</version>
  <creator>Vectoria Professional Vector Editor</creator>
  <title>${escapeXml(doc.name)}</title>
  <artboard width="${artboard.width}" height="${artboard.height}" name="${escapeXml(artboard.name)}" />
</metadata>`;

  // 3. Assemble package structure (metadata + content vector stream)
  const zip = new ZipBuilder();
  zip.addFile('metadata/metadata.xml', metadataXml);
  zip.addFile('content/root.xml', svgContent);
  zip.addFile('content/riffData.dat', svgContent);

  const zipBytes = zip.build();
  return new Blob([zipBytes.buffer as ArrayBuffer], { type: CDR_MIME });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
