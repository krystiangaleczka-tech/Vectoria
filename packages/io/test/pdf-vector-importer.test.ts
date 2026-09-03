import { describe, expect, it } from 'vitest';
import { importPdf } from '../src/pdf/pdf-vector-importer.js';

describe('PDF Vector Importer (EPIC-12 & EPIC-15)', () => {
  const samplePdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 120 >>
stream
q
1 0 0 1 50 100 cm
1 0 0 rg
0 0 1 RG
2 w
10 10 m
100 10 l
100 80 l
10 80 l
h
B
0 0 50 50 re
f
BT
/Helvetica 24 Tf
(Vectoria PDF Title) Tj
ET
Q
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
380
%%EOF`;

  const pdfFixture = new TextEncoder().encode(samplePdfContent).buffer;

  it('imports PDF vector paths as editable objects', async () => {
    const result = await importPdf(pdfFixture);

    expect(result.objects.some((object) => object.type === 'path')).toBe(true);
    const paths = result.objects.filter((obj) => obj.type === 'path');
    expect(paths.length).toBeGreaterThanOrEqual(2);

    // Verify first path has nodes and styles
    const firstPath = paths[0]!;
    expect(firstPath.nodes.length).toBeGreaterThanOrEqual(2);
    expect(firstPath.style.fill.type).toBe('solid');
  });

  it('imports PDF text elements as editable text objects', async () => {
    const result = await importPdf(pdfFixture);

    const texts = result.objects.filter((obj) => obj.type === 'text');
    expect(texts.length).toBeGreaterThanOrEqual(1);
    expect(texts[0]!.type).toBe('text');
    if (texts[0]!.type === 'text') {
      expect(texts[0]!.text).toBe('Vectoria PDF Title');
      expect(texts[0]!.fontSize).toBe(24);
    }
  });

  it('rejects invalid PDF buffer with controlled error', async () => {
    const invalidBuffer = new TextEncoder().encode('NOT A VALID PDF PAYLOAD').buffer;
    await expect(importPdf(invalidBuffer)).rejects.toThrow(/brak sygnatury %PDF-/);
  });
});
