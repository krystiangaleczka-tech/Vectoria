// @vitest-environment jsdom
import { emptyImportReport, type ImportReport } from '@vectoria/core';
import { importPdf } from '../../src/pdf/pdf-vector-importer.js';
import { aiProvider, cdrProvider, epsProvider } from '../../src/providers/honest-unsupported-providers.js';
import type { ProviderResult } from '../../src/providers/format-provider.js';
import { ZipBuilder } from '../../src/cdr/zip-builder.js';

export type CorpusFormat = 'pdf' | 'ai' | 'cdr' | 'eps';
export type CorpusStatus = ProviderResult['status'] | 'rejected';

export interface FormatCorpusExpectation {
  readonly status: CorpusStatus;
  readonly minObjects?: number;
  readonly minEditable?: number;
  readonly minSimplified?: number;
  readonly minUnsupported?: number;
  readonly reportCodes?: readonly string[];
  readonly errorIncludes?: string;
}

export interface FormatCorpusFixture {
  readonly id: string;
  readonly format: CorpusFormat;
  readonly filename: string;
  readonly mimeType: string;
  readonly features: readonly string[];
  readonly provenance: 'synthetic-vectoria';
  readonly license: 'repository';
  readonly expected: FormatCorpusExpectation;
  build(): Uint8Array;
}

export interface FormatCorpusObservation {
  readonly id: string;
  readonly format: CorpusFormat;
  readonly inputBytes: number;
  readonly status: CorpusStatus;
  readonly objectCount: number;
  readonly report: ImportReport;
  readonly error?: string;
}

const encode = (value: string): Uint8Array => new TextEncoder().encode(value);

function pdfFixture(streams: readonly string[], pageCount = 1): Uint8Array {
  const streamObjects = streams
    .map(
      (stream, index) => `${4 + index} 0 obj
<< /Length ${stream.length} >>
stream
${stream}
endstream
endobj`,
    )
    .join('\n');

  return encode(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count ${pageCount} >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 400] /Contents 4 0 R >>
endobj
${streamObjects}
trailer
<< /Root 1 0 R >>
%%EOF`);
}

const basicPdf = () =>
  pdfFixture([
    `q
1 0 0 rg
0 0 1 RG
2 w
10 10 m
100 10 l
100 80 l
10 80 l
h
B
BT
/Helvetica 18 Tf
20 120 Td
(Vectoria corpus) Tj
ET
Q`,
  ]);

const cmykPdf = () =>
  pdfFixture([
    `0.1 0.2 0 0 k
0 0 0.2 0 K
12 12 72 48 re
B`,
  ]);

const advancedPdf = () =>
  pdfFixture([
    `q
10 10 80 60 re
W
n
/Sh1 sh
/Im0 Do
Q`,
  ]);

const multiStreamPdf = () =>
  pdfFixture(
    [
      `10 10 50 50 re
f`,
      `80 80 m
140 80 l
140 140 l
h
S`,
    ],
    2,
  );

const basicEps = () =>
  encode(`%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 200 200
1 0 0 setrgbcolor
2 setlinewidth
10 10 moveto
100 10 lineto
100 100 lineto
10 100 lineto
closepath
stroke
%%EOF`);

const textEps = () =>
  encode(`%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 200 200
30 40 moveto
(Vectoria EPS) show
%%EOF`);

const invalidAi = () => encode('VECTORIA_SYNTHETIC_AI_WITHOUT_PDF_OR_POSTSCRIPT_HEADER');
const invalidEps = () => encode('VECTORIA_SYNTHETIC_NOT_POSTSCRIPT');
const invalidCdr = () => encode('VECTORIA_SYNTHETIC_NOT_CDR');

function cdrWithEmbeddedSvg(): Uint8Array {
  const builder = new ZipBuilder();
  builder.addFile(
    'content/root.xml',
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="#ff0000" /></svg>',
  );
  return builder.build();
}

const cdrRiffWithoutRecoverableVectorStream = () =>
  new Uint8Array([
    0x52, 0x49, 0x46, 0x58,
    0x00, 0x00, 0x00, 0x20,
    0x43, 0x44, 0x52, 0x76,
    0x00, 0x00, 0x00, 0x00,
  ]);

export const FORMAT_CORPUS: readonly FormatCorpusFixture[] = [
  {
    id: 'pdf-basic-vector-text',
    format: 'pdf',
    filename: 'basic-vector-text.pdf',
    mimeType: 'application/pdf',
    features: ['vector-path', 'text', 'fill', 'stroke'],
    provenance: 'synthetic-vectoria',
    license: 'repository',
    build: basicPdf,
    expected: {
      status: 'ok-partial',
      minObjects: 2,
      minEditable: 2,
      reportCodes: ['pdf.paths.extracted', 'pdf.text.extracted'],
    },
  },
  {
    id: 'pdf-cmyk-vector',
    format: 'pdf',
    filename: 'cmyk-vector.pdf',
    mimeType: 'application/pdf',
    features: ['vector-path', 'cmyk-fill', 'cmyk-stroke'],
    provenance: 'synthetic-vectoria',
    license: 'repository',
    build: cmykPdf,
    expected: { status: 'ok-partial', minObjects: 1, minEditable: 1 },
  },
  {
    id: 'pdf-advanced-operators',
    format: 'pdf',
    filename: 'advanced-operators.pdf',
    mimeType: 'application/pdf',
    features: ['clipping', 'shading', 'xobject'],
    provenance: 'synthetic-vectoria',
    license: 'repository',
    build: advancedPdf,
    expected: {
      status: 'ok-partial',
      minSimplified: 1,
      reportCodes: ['pdf.operators.skipped'],
    },
  },
  {
    id: 'pdf-multi-stream',
    format: 'pdf',
    filename: 'multi-stream.pdf',
    mimeType: 'application/pdf',
    features: ['multiple-content-streams', 'multi-page-count'],
    provenance: 'synthetic-vectoria',
    license: 'repository',
    build: multiStreamPdf,
    expected: { status: 'ok-partial', minObjects: 2, minEditable: 1 },
  },
  {
    id: 'ai-pdf-compatible',
    format: 'ai',
    filename: 'pdf-compatible.ai',
    mimeType: 'application/illustrator',
    features: ['pdf-compatible', 'vector-path', 'text'],
    provenance: 'synthetic-vectoria',
    license: 'repository',
    build: basicPdf,
    expected: {
      status: 'ok-partial',
      minObjects: 2,
      minEditable: 2,
      reportCodes: ['ai.vector.extracted'],
    },
  },
  {
    id: 'ai-postscript-compatible',
    format: 'ai',
    filename: 'postscript-compatible.ai',
    mimeType: 'application/illustrator',
    features: ['legacy-postscript', 'vector-path'],
    provenance: 'synthetic-vectoria',
    license: 'repository',
    build: basicEps,
    expected: {
      status: 'ok-partial',
      minObjects: 1,
      minEditable: 1,
      reportCodes: ['eps.vector.extracted'],
    },
  },
  {
    id: 'ai-unrecognized-payload',
    format: 'ai',
    filename: 'unrecognized.ai',
    mimeType: 'application/illustrator',
    features: ['invalid-header', 'controlled-rejection'],
    provenance: 'synthetic-vectoria',
    license: 'repository',
    build: invalidAi,
    expected: { status: 'rejected', errorIncludes: 'Illustrator' },
  },
  {
    id: 'eps-basic-vector',
    format: 'eps',
    filename: 'basic-vector.eps',
    mimeType: 'application/postscript',
    features: ['vector-path', 'stroke'],
    provenance: 'synthetic-vectoria',
    license: 'repository',
    build: basicEps,
    expected: {
      status: 'ok-partial',
      minObjects: 1,
      minEditable: 1,
      reportCodes: ['eps.vector.extracted'],
    },
  },
  {
    id: 'eps-text',
    format: 'eps',
    filename: 'text.eps',
    mimeType: 'application/postscript',
    features: ['text'],
    provenance: 'synthetic-vectoria',
    license: 'repository',
    build: textEps,
    expected: {
      status: 'ok-partial',
      minObjects: 1,
      minEditable: 1,
      reportCodes: ['eps.vector.extracted'],
    },
  },
  {
    id: 'eps-invalid-header',
    format: 'eps',
    filename: 'invalid.eps',
    mimeType: 'application/postscript',
    features: ['invalid-header', 'controlled-rejection'],
    provenance: 'synthetic-vectoria',
    license: 'repository',
    build: invalidEps,
    expected: { status: 'rejected', errorIncludes: 'PostScript/EPS' },
  },
  {
    id: 'cdr-embedded-svg',
    format: 'cdr',
    filename: 'embedded-svg.cdr',
    mimeType: 'application/x-coreldraw',
    features: ['zip-container', 'embedded-svg', 'editable-vector'],
    provenance: 'synthetic-vectoria',
    license: 'repository',
    build: cdrWithEmbeddedSvg,
    expected: { status: 'ok-partial', minObjects: 1, minEditable: 1 },
  },
  {
    id: 'cdr-riff-no-vector-stream',
    format: 'cdr',
    filename: 'binary-no-svg.cdr',
    mimeType: 'application/x-coreldraw',
    features: ['riff-container', 'unsupported-binary-stream'],
    provenance: 'synthetic-vectoria',
    license: 'repository',
    build: cdrRiffWithoutRecoverableVectorStream,
    expected: {
      status: 'unsupported',
      minUnsupported: 1,
      reportCodes: ['cdr.binary_stream.unsupported'],
    },
  },
  {
    id: 'cdr-invalid-header',
    format: 'cdr',
    filename: 'invalid.cdr',
    mimeType: 'application/x-coreldraw',
    features: ['invalid-header', 'controlled-rejection'],
    provenance: 'synthetic-vectoria',
    license: 'repository',
    build: invalidCdr,
    expected: { status: 'rejected', errorIncludes: 'CorelDRAW' },
  },
];

function countObjects(result: ProviderResult): number {
  if (result.status === 'ok-partial') return result.objects.length;
  if (result.status === 'ok') return Object.keys(result.document.objects).length;
  return 0;
}

export async function runFormatCorpusFixture(
  fixture: FormatCorpusFixture,
): Promise<FormatCorpusObservation> {
  const bytes = fixture.build();

  try {
    if (fixture.format === 'pdf') {
      const result = await importPdf(bytes);
      return {
        id: fixture.id,
        format: fixture.format,
        inputBytes: bytes.byteLength,
        status: 'ok-partial',
        objectCount: result.objects.length,
        report: result.report ?? emptyImportReport(),
      };
    }

    const file = new File([bytes as unknown as BlobPart], fixture.filename, {
      type: fixture.mimeType,
    });
    const provider =
      fixture.format === 'ai'
        ? aiProvider
        : fixture.format === 'cdr'
          ? cdrProvider
          : epsProvider;
    const result = await provider.import(file);

    return {
      id: fixture.id,
      format: fixture.format,
      inputBytes: bytes.byteLength,
      status: result.status,
      objectCount: countObjects(result),
      report: result.report,
    };
  } catch (error) {
    return {
      id: fixture.id,
      format: fixture.format,
      inputBytes: bytes.byteLength,
      status: 'rejected',
      objectCount: 0,
      report: emptyImportReport(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function summarizeCorpus(
  observations: readonly FormatCorpusObservation[],
): Readonly<Record<CorpusFormat, { fixtures: number; rejected: number; unsupported: number; editable: number; simplified: number }>> {
  const summary: Record<CorpusFormat, { fixtures: number; rejected: number; unsupported: number; editable: number; simplified: number }> = {
    pdf: { fixtures: 0, rejected: 0, unsupported: 0, editable: 0, simplified: 0 },
    ai: { fixtures: 0, rejected: 0, unsupported: 0, editable: 0, simplified: 0 },
    cdr: { fixtures: 0, rejected: 0, unsupported: 0, editable: 0, simplified: 0 },
    eps: { fixtures: 0, rejected: 0, unsupported: 0, editable: 0, simplified: 0 },
  };

  for (const observation of observations) {
    const row = summary[observation.format];
    row.fixtures += 1;
    row.rejected += observation.status === 'rejected' ? 1 : 0;
    row.unsupported += observation.report.unsupported;
    row.editable += observation.report.editable;
    row.simplified += observation.report.simplified;
  }

  return summary;
}
