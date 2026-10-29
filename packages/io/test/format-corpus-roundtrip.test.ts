// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createDefaultDocument, type SceneObject } from '@vectoria/core';
import { importPdf } from '../src/pdf/pdf-vector-importer.js';
import { exportArtboardToSvg } from '../src/svg/export.js';
import { importSvgWithReport } from '../src/svg/import.js';
import { aiProvider, cdrProvider, epsProvider } from '../src/providers/honest-unsupported-providers.js';
import { FORMAT_CORPUS, type CorpusFormat } from './fixtures/format-corpus.js';

const CASE_IDS = [
  'pdf-basic-vector-text',
  'ai-postscript-compatible',
  'eps-basic-vector',
  'cdr-embedded-svg',
] as const;

async function importCase(id: string): Promise<readonly SceneObject[]> {
  const fixture = FORMAT_CORPUS.find((item) => item.id === id);
  if (!fixture) throw new Error('Missing format fixture: ' + id);
  const bytes = fixture.build();
  if (fixture.format === 'pdf') return (await importPdf(bytes)).objects;
  const providers = { ai: aiProvider, cdr: cdrProvider, eps: epsProvider } satisfies Record<
    Exclude<CorpusFormat, 'pdf'>,
    typeof aiProvider
  >;
  const provider = providers[fixture.format];
  const result = await provider.import(new File([bytes as unknown as BlobPart], fixture.filename, { type: fixture.mimeType }));
  if (result.status !== 'ok-partial') throw new Error('Expected editable import: ' + id);
  return result.objects;
}

describe('VEC016: real importer to SVG to importer structural regression', () => {
  it.each(CASE_IDS)('%s retains vector geometry through SVG export and re-import', async (id) => {
    const sourceObjects = await importCase(id);
    expect(sourceObjects.length).toBeGreaterThan(0);

    const doc = createDefaultDocument({ width: 1000, height: 1000 });
    const objects = Object.fromEntries(
      sourceObjects.map((object) => [object.id, { ...object, layerId: doc.activeLayerId }]),
    );
    const importedDoc = {
      ...doc,
      objects,
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: sourceObjects.map((object) => object.id),
        },
      },
    };
    const exported = exportArtboardToSvg(importedDoc);
    expect(exported).toContain('<svg');
    expect(exported).not.toMatch(/\b(?:NaN|Infinity)\b/);

    const xml = new DOMParser().parseFromString(exported, 'image/svg+xml');
    const xmlError = xml.querySelector('parsererror')?.textContent ?? null;
    expect(xmlError, exported).toBeNull();
    const restored = importSvgWithReport(exported);
    const restoredObjects = Object.values(restored.document.objects);
    expect(restoredObjects.length).toBeGreaterThan(0);

    // A stubbed importer that only returns text, or an SVG exporter with
    // empty object output, must not satisfy this regression.
    const vectorTypes = new Set(['rectangle', 'ellipse', 'line', 'path', 'polyline']);
    expect(sourceObjects.some((object) => vectorTypes.has(object.type))).toBe(true);
    expect(restoredObjects.some((object) => vectorTypes.has(object.type))).toBe(true);
  });
});
