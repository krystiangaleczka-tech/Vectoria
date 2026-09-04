import { describe, it, expect } from 'vitest';
import { createDefaultDocument, type Artboard } from '@vectoria/core';
import { PDFDocument } from 'pdf-lib';
import { exportDocToPdf } from '../src/export/pdf-export.js';

describe('exportDocToPdf (EXPORT-012, EXPORT-013, EXPORT-014)', () => {
  it('generates a single page PDF from active artboard', async () => {
    const doc = createDefaultDocument({ name: 'Single Artboard PDF', width: 600, height: 400 });
    const pdfBlob = await exportDocToPdf(doc);

    expect(pdfBlob.type).toBe('application/pdf');
    expect(pdfBlob.size).toBeGreaterThan(100);

    const buffer = await pdfBlob.arrayBuffer();
    const pdf = await PDFDocument.load(buffer);
    expect(pdf.getPageCount()).toBe(1);
    const page = pdf.getPage(0);
    expect(page.getWidth()).toBe(600);
    expect(page.getHeight()).toBe(400);
  });

  it('generates a multi-page PDF when multiple artboard IDs are specified', async () => {
    const doc = createDefaultDocument({ name: 'Multi Artboard PDF', width: 500, height: 300 });
    const secondArtboard: Artboard = {
      id: 'artboard-2',
      name: 'Page 2',
      x: 600,
      y: 0,
      width: 400,
      height: 600,
      visible: true,
      background: { type: 'transparent' },
    };
    const docWith2Pages = {
      ...doc,
      artboards: { ...doc.artboards, [secondArtboard.id]: secondArtboard },
      artboardIds: [...doc.artboardIds, secondArtboard.id],
    };

    const pdfBlob = await exportDocToPdf(docWith2Pages, {
      artboardIds: [doc.activeArtboardId, secondArtboard.id],
    });

    const buffer = await pdfBlob.arrayBuffer();
    const pdf = await PDFDocument.load(buffer);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPage(0).getWidth()).toBe(500);
    expect(pdf.getPage(1).getWidth()).toBe(400);
  });

  it('includes bleed and crop mark margins when requested', async () => {
    const doc = createDefaultDocument({ name: 'Print Bleed PDF', width: 800, height: 600 });
    const bleed = 10;
    const cropMarks = true;
    const markMargin = 20;

    const pdfBlob = await exportDocToPdf(doc, { bleed, cropMarks });
    const buffer = await pdfBlob.arrayBuffer();
    const pdf = await PDFDocument.load(buffer);
    const page = pdf.getPage(0);

    // Expected width: 800 + 2 * (10 + 20) = 860
    // Expected height: 600 + 2 * (10 + 20) = 660
    expect(page.getWidth()).toBe(800 + 2 * (bleed + markMargin));
    expect(page.getHeight()).toBe(600 + 2 * (bleed + markMargin));
  });
});
