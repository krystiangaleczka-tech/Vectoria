import type { SceneObject } from '@vectoria/core';
import { countReport, type ImportReport } from '@vectoria/core';
import { importPdf } from '../pdf/pdf-vector-importer.js';
import { parseEps } from '../eps/eps-parser.js';

export interface AiImportResult {
  readonly objects: readonly SceneObject[];
  readonly report: ImportReport;
}

/**
 * Adobe Illustrator (.ai) vector importer.
 * Extracts vector paths, text frames, and graphics from both modern PDF-compatible
 * AI files and legacy PostScript AI files without losing vector data.
 */
export async function importAi(data: ArrayBuffer | Uint8Array): Promise<AiImportResult> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 1024));

  // 1. Check if modern PDF-compatible AI (%PDF-)
  const pdfOffset = head.indexOf('%PDF-');
  if (pdfOffset !== -1) {
    const pdfBytes = bytes.slice(pdfOffset);
    const pdfDoc = await importPdf(pdfBytes);
    const report = countReport(
      pdfDoc.objects.map((o) => ({
        category: 'editable' as const,
        code: 'ai.vector.extracted',
        message: `Wyodrębniono obiekt wektorowy ${o.type} z danych AI`,
      })),
    );
    return { objects: pdfDoc.objects, report };
  }

  // 2. Check if PostScript-compatible AI (%!PS)
  if (head.includes('%!PS')) {
    const epsResult = parseEps(bytes);
    return epsResult;
  }

  throw new Error('Plik nie jest poprawnym dokumentem Adobe Illustrator (.ai)');
}
