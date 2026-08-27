import { describe, it, expect } from 'vitest';
import {
  createDefaultDocument,
  createTextObject,
  createTextFrameObject,
  type DocumentModel,
} from '@vectoria/core';
import {
  exportArtboardToSvg,
  importSvgToDocument,
  listDocumentFonts,
  DocumentV1Schema,
} from '../src/index.js';

describe('Text SVG & Schema IO', () => {
  it('exports and imports artistic text in SVG round-trip', () => {
    const doc = createDefaultDocument();
    const textObj = createTextObject('text-1', doc.activeLayerId, 'Vectoria Typography', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: 32,
      fontWeight: 'bold',
      letterSpacing: 2,
    });

    const updatedDoc: DocumentModel = {
      ...doc,
      objects: { ...doc.objects, [textObj.id]: textObj },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [textObj.id],
        },
      },
    };

    // 1. Export SVG
    const svg = exportArtboardToSvg(updatedDoc);
    expect(svg).toContain('<text');
    expect(svg).toContain('font-family="Outfit, sans-serif"');
    expect(svg).toContain('Vectoria Typography');
  });

  const hasDom = typeof DOMParser !== 'undefined';

  it.skipIf(!hasDom)('imports text in SVG when DOMParser is available', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><text x="100" y="100" font-family="Outfit, sans-serif" font-size="32">Vectoria Typography</text></svg>`;
    const importedDoc = importSvgToDocument(svg, 'Imported');
    const importedText = Object.values(importedDoc.objects).find((o) => o.type === 'text');
    expect(importedText).toBeDefined();
    if (importedText && importedText.type === 'text') {
      expect(importedText.text).toBe('Vectoria Typography');
    }
  });

  it('validates document with text objects against DocumentV1Schema', () => {
    const doc = createDefaultDocument();
    const frameObj = createTextFrameObject('frame-1', doc.activeLayerId, 'Paragraph in frame', 250, 150, {
      columnCount: 2,
      indent: 10,
    });

    const updatedDoc: DocumentModel = {
      ...doc,
      objects: { ...doc.objects, [frameObj.id]: frameObj },
      layers: {
        ...doc.layers,
        [doc.activeLayerId]: {
          ...doc.layers[doc.activeLayerId]!,
          objectIds: [frameObj.id],
        },
      },
    };

    const parseResult = DocumentV1Schema.safeParse(updatedDoc);
    expect(parseResult.success).toBe(true);
  });

  it('lists used fonts across document text objects', () => {
    const doc = createDefaultDocument();
    const t1 = createTextObject('t1', doc.activeLayerId, 'One', { fontFamily: 'Roboto' });
    const t2 = createTextObject('t2', doc.activeLayerId, 'Two', { fontFamily: 'Roboto' });
    const t3 = createTextObject('t3', doc.activeLayerId, 'Three', { fontFamily: 'Inter' });

    const docWithFonts: DocumentModel = {
      ...doc,
      objects: { ...doc.objects, [t1.id]: t1, [t2.id]: t2, [t3.id]: t3 },
    };

    const used = listDocumentFonts(docWithFonts);
    expect(used).toHaveLength(2);
    expect(used[0]?.fontFamily).toBe('Roboto');
    expect(used[0]?.count).toBe(2);
    expect(used[1]?.fontFamily).toBe('Inter');
    expect(used[1]?.count).toBe(1);
  });
});
