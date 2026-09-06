// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { parseEps } from '../src/eps/eps-parser.js';
import { importAi } from '../src/ai/ai-importer.js';
import { parseCdr } from '../src/cdr/cdr-parser.js';
import { ZipBuilder } from '../src/cdr/zip-builder.js';
import { epsProvider, aiProvider, cdrProvider } from '../src/providers/honest-unsupported-providers.js';

describe('EPIC-15: EPS, AI, and CDR Vector Parsers', () => {
  describe('EPS Parser', () => {
    const epsFixture = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 200 200
gsave
1 0 0 setrgbcolor
2 setlinewidth
10 10 moveto
100 10 lineto
100 100 lineto
10 100 lineto
closepath
stroke
grestore
showpage
%%EOF`;

    it('extracts vector paths from EPS content', () => {
      const { objects, report } = parseEps(epsFixture);
      expect(objects.length).toBeGreaterThanOrEqual(1);
      expect(objects[0]!.type).toBe('path');
      expect(report.editable).toBeGreaterThanOrEqual(1);
    });

    it('epsProvider imports File and returns ok-partial with objects', async () => {
      const file = new File([epsFixture], 'test.eps', { type: 'application/postscript' });
      const result = await epsProvider.import(file);
      expect(result.status).toBe('ok-partial');
      if (result.status === 'ok-partial') {
        expect(result.objects.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('AI Importer', () => {
    const aiPdfFixture = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 400] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 60 >>
stream
q
1 0 0 rg
10 10 m 50 10 l 50 50 l 10 50 l h f
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
320
%%EOF`;

    it('recovers vector paths from PDF-compatible AI', async () => {
      const { objects, report } = await importAi(new TextEncoder().encode(aiPdfFixture).buffer);
      expect(objects.length).toBeGreaterThanOrEqual(1);
      expect(objects[0]!.type).toBe('path');
      expect(report.editable).toBeGreaterThanOrEqual(1);
    });

    it('aiProvider imports File and returns ok-partial with objects', async () => {
      const file = new File([aiPdfFixture], 'artwork.ai', { type: 'application/illustrator' });
      const result = await aiProvider.import(file);
      expect(result.status).toBe('ok-partial');
      if (result.status === 'ok-partial') {
        expect(result.objects.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('CDR Parser', () => {
    const cdrRifxFixture = new Uint8Array([
      0x52, 0x49, 0x46, 0x58, // 'RIFX'
      0x00, 0x00, 0x00, 0x20, // chunk size
      0x43, 0x44, 0x52, 0x76, // 'CDRv'
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
    ]);

    it('reports unsupported for binary CDR container without embedded SVG (zero fake geometry)', async () => {
      const { objects, report } = await parseCdr(cdrRifxFixture.buffer);
      expect(objects).toHaveLength(0);
      expect(report.unsupported).toBeGreaterThanOrEqual(1);
      expect(report.entries[0]?.code).toBe('cdr.binary_stream.unsupported');
    });

    it('cdrProvider returns status unsupported for binary CDR files without embedded SVG', async () => {
      const file = new File([cdrRifxFixture.buffer as ArrayBuffer], 'drawing.cdr', { type: 'application/x-coreldraw' });
      const result = await cdrProvider.import(file);
      expect(result.status).toBe('unsupported');
      expect('objects' in result).toBe(false);
    });

    it('extracts real vector objects from CDR package with embedded SVG stream', async () => {
      const builder = new ZipBuilder();
      const svgStream = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="#ff0000" /></svg>`;
      builder.addFile('content/root.xml', svgStream);
      const zipBytes = builder.build();

      const { objects, report } = await parseCdr(zipBytes.buffer as ArrayBuffer);
      expect(objects.length).toBeGreaterThanOrEqual(1);
      expect(report.editable).toBeGreaterThanOrEqual(1);

      const file = new File([zipBytes.buffer as ArrayBuffer], 'package.cdr', { type: 'application/x-coreldraw' });
      const result = await cdrProvider.import(file);
      expect(result.status).toBe('ok-partial');
      if (result.status === 'ok-partial') {
        expect(result.objects.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
