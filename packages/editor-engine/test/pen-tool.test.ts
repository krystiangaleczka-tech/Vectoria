import { describe, expect, it } from 'vitest';
import { PenTool } from '../src/index.js';

const event = (x: number, y: number) => ({ screenPoint: { x, y }, worldPoint: { x, y } });

describe('PenTool state machine', () => {
  it('creates corner nodes and commits an open path with Enter', () => {
    const tool = new PenTool();
    tool.pointerDown(event(0, 0), 12);
    tool.pointerUp(event(0, 0));
    tool.pointerDown(event(100, 0), 12);
    const draft = tool.pointerUp(event(100, 0));

    expect(draft?.type).toBe('draft');
    expect(tool.currentState).toBe('creating-path');
    expect(tool.keyDown('Enter')).toMatchObject({ type: 'commit', closed: false });
    expect(tool.currentState).toBe('idle');
  });

  it('creates smooth node with mirrored handles after drag', () => {
    const tool = new PenTool();
    tool.pointerDown(event(20, 20), 12);
    tool.pointerUp(event(20, 20));
    tool.pointerDown(event(100, 100), 12);
    tool.pointerMove(event(140, 100));
    tool.pointerUp(event(140, 100));

    const node = tool.preview.nodes[1]!;
    expect(node.kind).toBe('smooth');
    expect(node.point).toEqual({ x: 100, y: 100 });
    expect(node.outHandle).toEqual({ x: 140, y: 100 });
    expect(node.inHandle).toEqual({ x: 60, y: 100 });
  });

  it('closes only when clicking the first node after three nodes', () => {
    const tool = new PenTool();
    for (const point of [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]) {
      tool.pointerDown(event(point.x, point.y), 12);
      tool.pointerUp(event(point.x, point.y));
    }

    expect(tool.pointerDown(event(0, 0), 12)).toMatchObject({ type: 'commit', closed: true });
    expect(tool.currentState).toBe('idle');
  });

  it('cancels transient draft without creating a document object', () => {
    const tool = new PenTool();
    tool.pointerDown(event(0, 0), 12);
    tool.pointerUp(event(0, 0));
    expect(tool.keyDown('Escape')).toEqual({ type: 'cancel' });
    expect(tool.preview.nodes).toHaveLength(0);
  });

  it('constrains the next point to 45-degree increments with Shift', () => {
    const tool = new PenTool();
    tool.pointerDown(event(0, 0), 12);
    tool.pointerUp(event(0, 0));
    tool.pointerDown({ ...event(100, 20), shiftKey: true }, 12);
    tool.pointerUp({ ...event(100, 20), shiftKey: true });

    expect(tool.preview.nodes[1]!.point.y).toBeCloseTo(0);
  });

  it('creates a cusp node when Alt is held during a handle drag', () => {
    const tool = new PenTool();
    tool.pointerDown(event(0, 0), 12);
    tool.pointerUp(event(0, 0));
    tool.pointerDown(event(100, 100), 12);
    tool.pointerMove({ ...event(140, 100), altKey: true });
    tool.pointerUp({ ...event(140, 100), altKey: true });

    expect(tool.preview.nodes[1]!.kind).toBe('cusp');
  });
});
