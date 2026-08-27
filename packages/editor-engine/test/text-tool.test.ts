import { describe, it, expect } from 'vitest';
import { TextTool } from '../src/index.js';

describe('TextTool State Machine', () => {
  it('creates artistic text on pointer click (small delta)', () => {
    const tool = new TextTool();
    tool.pointerDown({ x: 100, y: 100 });
    tool.pointerMove({ x: 101, y: 101 });

    const result = tool.pointerUp({ x: 101, y: 101 }, 'layer-1', {
      defaultText: 'Hello World',
      fontSize: 20,
    });

    expect(result).not.toBeNull();
    expect(result!.isFrame).toBe(false);
    expect(result!.command.type).toBe('create-text-object');
  });

  it('creates paragraph text frame on drag', () => {
    const tool = new TextTool();
    tool.pointerDown({ x: 100, y: 100 });
    tool.pointerMove({ x: 300, y: 250 });

    expect(tool.isBusy).toBe(true);
    expect(tool.preview?.isFrame).toBe(true);
    expect(tool.preview?.width).toBe(200);
    expect(tool.preview?.height).toBe(150);

    const result = tool.pointerUp({ x: 300, y: 250 }, 'layer-1');
    expect(result).not.toBeNull();
    expect(result!.isFrame).toBe(true);
    expect(result!.command.type).toBe('create-text-frame');
    expect(tool.isBusy).toBe(false);
  });

  it('cancels interaction on cancel()', () => {
    const tool = new TextTool();
    tool.pointerDown({ x: 50, y: 50 });
    tool.cancel();
    expect(tool.preview).toBeNull();
    expect(tool.isBusy).toBe(false);
  });
});
