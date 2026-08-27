import { describe, it, expect } from 'vitest';
import {
  createDefaultDocument,
  createTextObject,
  createTextFrameObject,
  CreateTextObjectCommand,
  CreateTextFrameCommand,
  SetTextContentCommand,
  UpdateTextPropertiesCommand,
  SetTextOnPathCommand,
  BatchReplaceTextCommand,
} from '../src/index.js';

describe('Text Commands & Undo/Redo', () => {
  it('creates artistic text and supports undo/redo', () => {
    const doc = createDefaultDocument();
    const textObj = createTextObject('text-1', doc.activeLayerId, 'Initial Text');

    const cmd = new CreateTextObjectCommand(textObj);
    const docAfter = cmd.execute(doc);
    expect(docAfter.objects['text-1']).toBeDefined();
    expect(docAfter.layers[doc.activeLayerId]!.objectIds).toContain('text-1');

    const docUndone = cmd.undo(docAfter);
    expect(docUndone.objects['text-1']).toBeUndefined();
    expect(docUndone.layers[doc.activeLayerId]!.objectIds).not.toContain('text-1');
  });

  it('creates text frame and supports undo/redo', () => {
    const doc = createDefaultDocument();
    const frameObj = createTextFrameObject('frame-1', doc.activeLayerId, 'Frame text', 200, 100);

    const cmd = new CreateTextFrameCommand(frameObj);
    const docAfter = cmd.execute(doc);
    expect(docAfter.objects['frame-1']).toBeDefined();

    const docUndone = cmd.undo(docAfter);
    expect(docUndone.objects['frame-1']).toBeUndefined();
  });

  it('updates text content and typography properties with exact undo', () => {
    const doc = createDefaultDocument();
    const textObj = createTextObject('text-1', doc.activeLayerId, 'Old String', {
      fontSize: 18,
      textAlign: 'left',
    });
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

    // 1. Edit text content
    const editCmd = new SetTextContentCommand('text-1', 'New String');
    const docEdited = editCmd.execute(docWithText);
    expect((docEdited.objects['text-1'] as typeof textObj).text).toBe('New String');

    const docUndoneEdit = editCmd.undo(docEdited);
    expect((docUndoneEdit.objects['text-1'] as typeof textObj).text).toBe('Old String');

    // 2. Update typography properties
    const propCmd = new UpdateTextPropertiesCommand('text-1', {
      fontSize: 32,
      textAlign: 'center',
      fontWeight: 'bold',
    });
    const docProp = propCmd.execute(docWithText);
    expect((docProp.objects['text-1'] as typeof textObj).fontSize).toBe(32);
    expect((docProp.objects['text-1'] as typeof textObj).textAlign).toBe('center');
    expect((docProp.objects['text-1'] as typeof textObj).fontWeight).toBe('bold');

    const docUndoneProp = propCmd.undo(docProp);
    expect((docUndoneProp.objects['text-1'] as typeof textObj).fontSize).toBe(18);
    expect((docUndoneProp.objects['text-1'] as typeof textObj).textAlign).toBe('left');
  });

  it('attaches and detaches text on path with undo', () => {
    const doc = createDefaultDocument();
    const textObj = createTextObject('text-1', doc.activeLayerId, 'Path Text');
    const docWithText = { ...doc, objects: { ...doc.objects, [textObj.id]: textObj } };

    const cmd = new SetTextOnPathCommand('text-1', 'path-99');
    const docAfter = cmd.execute(docWithText);
    expect((docAfter.objects['text-1'] as typeof textObj).pathId).toBe('path-99');

    const docUndone = cmd.undo(docAfter);
    expect((docUndone.objects['text-1'] as typeof textObj).pathId).toBeUndefined();
  });

  it('performs batch text replace across multiple text objects in single command', () => {
    const doc = createDefaultDocument();
    const t1 = createTextObject('t1', doc.activeLayerId, 'Hello Foo');
    const t2 = createTextObject('t2', doc.activeLayerId, 'Foo Bar');
    const docWithTwo = { ...doc, objects: { ...doc.objects, [t1.id]: t1, [t2.id]: t2 } };

    const batchCmd = new BatchReplaceTextCommand(['t1', 't2'], /Foo/g, 'Vector');
    const docAfter = batchCmd.execute(docWithTwo);
    expect((docAfter.objects['t1'] as typeof t1).text).toBe('Hello Vector');
    expect((docAfter.objects['t2'] as typeof t2).text).toBe('Vector Bar');

    const docUndone = batchCmd.undo(docAfter);
    expect((docUndone.objects['t1'] as typeof t1).text).toBe('Hello Foo');
    expect((docUndone.objects['t2'] as typeof t2).text).toBe('Foo Bar');
  });
});
