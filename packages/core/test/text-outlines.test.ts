import { describe, it, expect } from 'vitest';
import {
  createDefaultDocument,
  createTextObject,
  ConvertTextToOutlinesCommand,
  convertTextToOutlines,
} from '../src/index.js';

describe('Text to Outlines Conversion', () => {
  it('converts artistic text into vector path outlines with nodes', () => {
    const textObj = createTextObject('txt-outline', 'layer-1', 'ALT');
    const pathObj = convertTextToOutlines(textObj);

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

    const cmd = new ConvertTextToOutlinesCommand('txt-outline-undo');
    const docAfter = cmd.execute(docWithText);
    expect(docAfter.objects['txt-outline-undo']?.type).toBe('path');

    const docUndone = cmd.undo(docAfter);
    expect(docUndone.objects['txt-outline-undo']?.type).toBe('text');
    expect((docUndone.objects['txt-outline-undo'] as typeof textObj).text).toBe('Hello');
  });
});
