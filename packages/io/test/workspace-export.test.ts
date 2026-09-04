import { describe, expect, it } from 'vitest';
import type { BrandKit, CanvasAnnotation } from '@vectoria/core';
import {
  exportAnnotationsToJson,
  exportAnnotationsToMarkdown,
  exportBrandKitToFile,
  importBrandKitFromFile,
} from '../src/storage/workspace-export.js';

describe('Workspace Export / Handoff (EPIC-17 SAAS-018, SAAS-019, SAAS-021)', () => {
  const sampleAnnotations: readonly CanvasAnnotation[] = [
    {
      id: 'ann-1',
      worldPoint: { x: 100, y: 200 },
      body: 'Należy zmienić font na Inter @designer',
      authorName: 'Marek',
      resolved: false,
      mentions: ['designer'],
      createdAt: '2026-09-04T05:00:00.000Z',
      updatedAt: '2026-09-04T05:00:00.000Z',
    },
    {
      id: 'ann-2',
      worldPoint: { x: 400, y: 150 },
      body: 'Wszystko zatwierdzone',
      authorName: 'Anna',
      resolved: true,
      mentions: [],
      createdAt: '2026-09-04T05:05:00.000Z',
      updatedAt: '2026-09-04T05:10:00.000Z',
    },
  ];

  it('exportAnnotationsToJson creates valid parseable JSON envelope', () => {
    const jsonStr = exportAnnotationsToJson(sampleAnnotations);
    const parsed = JSON.parse(jsonStr) as { app: string; type: string; count: number; annotations: CanvasAnnotation[] };

    expect(parsed.app).toBe('vectoria');
    expect(parsed.type).toBe('annotations-export');
    expect(parsed.count).toBe(2);
    expect(parsed.annotations).toHaveLength(2);
    expect(parsed.annotations[0]?.id).toBe('ann-1');
  });

  it('exportAnnotationsToMarkdown structures open and resolved annotations with coordinates', () => {
    const md = exportAnnotationsToMarkdown('Plakat Festiwalu', sampleAnnotations);

    expect(md).toContain('# Komentarze i adnotacje: Plakat Festiwalu');
    expect(md).toContain('## Otwarte uwagi (1)');
    expect(md).toContain('### [ ] Marek — (100, 200)');
    expect(md).toContain('Należy zmienić font na Inter @designer');
    expect(md).toContain('## Rozwiązane uwagi (1)');
    expect(md).toContain('### [x] Anna — (400, 150)');
  });

  it('exportBrandKitToFile and importBrandKitFromFile perform full round-trip', () => {
    const kit: BrandKit = {
      logos: [{ id: 'logo-1', name: 'Vectoria Mark', imageUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }],
      fontFamilies: ['Inter', 'Roboto Mono'],
      colorPaletteIds: ['palette-primary'],
      symbolIds: ['sym-icon'],
    };

    const fileContent = exportBrandKitToFile(kit);
    expect(typeof fileContent).toBe('string');
    expect(fileContent).toContain('brandkit-bundle');

    const imported = importBrandKitFromFile(fileContent);
    expect(imported.fontFamilies).toEqual(['Inter', 'Roboto Mono']);
    expect(imported.logos).toHaveLength(1);
    expect(imported.logos?.[0]?.name).toBe('Vectoria Mark');
  });

  it('importBrandKitFromFile rejects invalid payload and malformed JSON', () => {
    expect(() => importBrandKitFromFile('not a json')).toThrow(/Invalid JSON/);
    expect(() => importBrandKitFromFile('12345')).toThrow(/must be a JSON object/);
    expect(() => importBrandKitFromFile(JSON.stringify({ brandKit: { fontFamilies: 123 } }))).toThrow();
  });
});
