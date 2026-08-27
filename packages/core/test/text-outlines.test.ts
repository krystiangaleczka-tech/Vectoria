import { describe, it, expect } from 'vitest';
import {
  createDefaultDocument,
  createTextObject,
  ConvertTextToOutlinesCommand,
  convertTextToOutlines,
  type FontOutlineProvider,
} from '../src/index.js';

const fixtureProvider: FontOutlineProvider = {
  unitsPerEm: 1000,
  getGlyph: (codePoint) => codePoint === 79
    ? { advanceWidth: 700, commands: [
      { type: 'M', x: 0, y: 0 }, { type: 'L', x: 700, y: 0 }, { type: 'L', x: 700, y: -1000 }, { type: 'L', x: 0, y: -1000 }, { type: 'Z' },
      { type: 'M', x: 200, y: -200 }, { type: 'L', x: 500, y: -200 }, { type: 'L', x: 500, y: -800 }, { type: 'L', x: 200, y: -800 }, { type: 'Z' },
    ] }
    : { advanceWidth: 600, commands: [
      { type: 'M', x: 0, y: 0 }, { type: 'L', x: 600, y: 0 }, { type: 'C', x1: 550, y1: -400, x2: 500, y2: -700, x: 400, y: -1000 }, { type: 'L', x: 0, y: -1000 }, { type: 'Z' },
    ] },
};

describe('Text to Outlines Conversion', () => {
  it('converts artistic text into vector path outlines with nodes', () => {
    const textObj = createTextObject('txt-outline', 'layer-1', 'ALT');
    const pathObj = convertTextToOutlines(textObj, fixtureProvider);

    expect(pathObj.type).toBe('path');
    expect(pathObj.closed).toBe(true);
    expect(pathObj.nodes.length).toBeGreaterThanOrEqual(3);
    expect(pathObj.fillRule).toBe('evenodd');
    expect(pathObj.compoundChildren?.length).toBeGreaterThanOrEqual(1);
  });

  it('supports undo and redo for ConvertTextToOutlinesCommand', () => {
    const doc = createDefaultDocument();
    const textObj = createTextObject('txt-outline-undo', doc.activeLayerId, 'Hello');
    const docWithText = {
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

    const cmd = new ConvertTextToOutlinesCommand('txt-outline-undo', fixtureProvider);
    const docAfter = cmd.execute(docWithText);
    expect(docAfter.objects['txt-outline-undo']?.type).toBe('path');

    const docUndone = cmd.undo(docAfter);
    expect(docUndone.objects['txt-outline-undo']?.type).toBe('text');
    expect((docUndone.objects['txt-outline-undo'] as typeof textObj).text).toBe('Hello');
  });

  it('rejects conversion without real font outline data', () => {
    const textObj = createTextObject('txt-outline-missing', 'layer-1', 'A');
    expect(() => convertTextToOutlines(textObj)).toThrow(/outline data is unavailable/);
  });

  it('uses supplied glyph contours instead of hardcoded character geometry', () => {
    const a = convertTextToOutlines(createTextObject('a', 'layer-1', 'A'), fixtureProvider);
    const o = convertTextToOutlines(createTextObject('o', 'layer-1', 'O'), fixtureProvider);
    expect(a.nodes).not.toEqual(o.nodes);
    expect(o.compoundChildren).toHaveLength(1);
    expect(a.nodes.some((node) => node.outHandle !== null)).toBe(true);
  });
});
