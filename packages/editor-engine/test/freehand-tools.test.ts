import { describe, expect, it } from 'vitest';
import { BrushTool, EraserTool, PencilTool, WidthTool } from '../src/index.js';
import type { PathObject } from '@vectoria/core';
import { createPathNode, createTransform, defaultObjectStyle, defaultStroke } from '@vectoria/core';

const event = (x: number, y: number, pressure = 1) => ({ screenPoint: { x, y }, worldPoint: { x, y }, pressure, time: x + y });
const path: PathObject = {
  type: 'path', id: 'path', name: 'Brush 1', layerId: 'layer', visible: true, locked: false,
  transform: createTransform({ x: 0, y: 0 }), style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke }, closed: false,
  nodes: [createPathNode({ x: 0, y: 0 }), createPathNode({ x: 100, y: 0 })],
};

describe('freehand tool state machines', () => {
  it('keeps Pencil samples transient until pointerup', () => {
    const tool = new PencilTool();
    tool.pointerDown(event(0, 0));
    tool.pointerMove(event(30, 5), 1);
    expect(tool.currentState).toBe('drawing');
    expect(tool.pointerUp(event(60, 0))).toMatchObject({ type: 'commit' });
    expect(tool.currentState).toBe('idle');
  });

  it('supports pressure samples in Brush and Escape cancel', () => {
    const tool = new BrushTool();
    tool.pointerDown(event(0, 0, 0.2));
    tool.pointerMove(event(20, 0, 0.8), 0);
    expect(tool.preview[1]!.pressure).toBe(0.8);
    expect(tool.keyDown('Escape')).toEqual({ type: 'cancel' });
    expect(tool.preview).toHaveLength(0);
  });

  it('keeps eraser radius in screen pixels and width drag reversible in session', () => {
    const eraser = new EraserTool();
    eraser.radiusPx = 20;
    expect(eraser.preview.radius).toBe(20);
    const width = new WidthTool();
    width.pointerDown(path, { x: 50, y: 0 }, 0.5);
    width.pointerMove(10, 1);
    expect(width.preview.find((point) => point.t === 0.5)!.width).toBeGreaterThan(defaultStroke.width);
    expect(width.pointerUp().length).toBeGreaterThan(0);
    width.cancel();
    expect(width.preview).toHaveLength(0);
  });
});
