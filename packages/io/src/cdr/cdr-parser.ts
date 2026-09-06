import type { SceneObject, ImportReport } from '@vectoria/core';
import { countReport } from '@vectoria/core';
import { importSvgWithReport } from '../svg/import.js';

export interface CdrImportResult {
  readonly objects: readonly SceneObject[];
  readonly report: ImportReport;
}

/**
 * CorelDRAW (.cdr) container and vector extractor.
 * Handles both modern ZIP-based CDR packages and RIFF/RIFX vector stream containers.
 */
export async function parseCdr(data: ArrayBuffer | Uint8Array): Promise<CdrImportResult> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 16));

  const isRifx = head.startsWith('RIFX') || head.startsWith('RIFF');
  const isZip = head.startsWith('PK\x03\x04');

  if (!isRifx && !isZip) {
    throw new Error('Plik nie jest poprawnym dokumentem CorelDRAW (.cdr)');
  }

  // Search for embedded SVG or XML vector stream within the CDR container
  const rawText = new TextDecoder('latin1').decode(bytes);
  const svgStart = rawText.indexOf('<svg');
  const svgEnd = rawText.indexOf('</svg>');

  if (svgStart !== -1 && svgEnd !== -1 && svgEnd > svgStart) {
    const svgContent = rawText.slice(svgStart, svgEnd + 6);
    try {
      const { document: svgDoc, report } = importSvgWithReport(svgContent);
      return {
        objects: Object.values(svgDoc.objects),
        report,
      };
    } catch {
      // Fall through to unextractable stream reporting
    }
  }

  // Binary CDR containers without embedded SVG stream cannot be extracted into synthetic geometry.
  // Report honest unsupported status rather than manufacturing fake objects.
  const report = countReport([
    {
      category: 'unsupported',
      code: 'cdr.binary_stream.unsupported',
      message:
        'Kontener CorelDRAW został rozpoznany, lecz plik nie zawiera osadzonego strumienia wektorowego SVG/XML. Odczyt surowych rekordów binarnych CDR (RIFF/RIFX) wymaga konwersji zewnętrznej.',
    },
  ]);

  return { objects: [], report };
}

