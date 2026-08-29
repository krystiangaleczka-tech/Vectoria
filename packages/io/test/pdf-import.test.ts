// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  getPdfDocumentInfo,
  renderPdfPageToDataUrl,
  importPdfPageAsImageObject,
} from '../src/assets/pdf-import-service.js';

describe('PdfImportService (ASSET-005)', () => {
  // Minimal valid 1-page PDF
  const minimalPdfText = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 100 100]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF';
  const encoder = new TextEncoder();
  const pdfBytes = encoder.encode(minimalPdfText);

  it('reads PDF document metadata and returns page count', async () => {
    const info = await getPdfDocumentInfo(pdfBytes);
    expect(info.numPages).toBe(1);
  });

  it('throws a controlled error when canvas rendering is unavailable (no silent placeholder)', async () => {
    // jsdom does not implement canvas 2D context, so rendering must fail loudly
    // instead of returning an invisible 1x1 placeholder image.
    await expect(renderPdfPageToDataUrl(pdfBytes, 1)).rejects.toThrow(/canvas|PDF|render/i);
  });

  it('propagates render failure from import instead of producing a broken image object', async () => {
    await expect(
      importPdfPageAsImageObject(pdfBytes, {
        pageNumber: 1,
        dropPosition: { x: 100, y: 200 },
        targetLayerId: 'layer-art',
        fileName: 'Portfolio.pdf',
      }),
    ).rejects.toThrow();
  });

  it('throws for invalid PDF payloads', async () => {
    const garbage = encoder.encode('this is not a pdf at all');
    await expect(getPdfDocumentInfo(garbage)).rejects.toThrow();
  });
});
