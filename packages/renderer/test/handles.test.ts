// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { DocumentModel, RectangleObject } from '@vectoria/core';
import { renderOverlay } from '../src/index.js';

function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    transform: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function createMockCamera(zoom = 1) {
  return {
    pan: { x: 0, y: 0 },
    zoom,
    worldToScreen: (p: { x: number; y: number }) => ({ x: p.x * zoom, y: p.y * zoom }),
    screenToWorld: (p: { x: number; y: number }) => ({ x: p.x / zoom, y: p.y / zoom }),
  } as unknown as import('@vectoria/editor-engine').Camera;
}

function createSampleDoc(scale = { x: 1, y: 1 }): DocumentModel {
  const rect: RectangleObject = {
    id: 'rect-1',
    type: 'rectangle',
    name: 'Rect 1',
    layerId: 'layer-1',
    visible: true,
    locked: false,
    width: 100,
    height: 100,
    transform: {
      position: { x: 0, y: 0 },
      rotation: 0,
      scale,
      pivot: { x: 0, y: 0 },
    },
    style: {
      fill: { type: 'solid', color: '#ff0000' },
      stroke: { type: 'none' },
      opacity: 1,
      blendMode: 'normal',
    },
  };

  return {
    id: 'doc-1',
    version: '1.0',
    title: 'Test',
    unit: 'px',
    artboard: {
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      background: { type: 'solid', color: '#ffffff' },
    },
    layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, locked: false, opacity: 1, collapsed: false, objectIds: ['rect-1'] }],
    objects: { 'rect-1': rect },
    activeLayerId: 'layer-1',
  };
}

describe('Handle rendering & smartDistance (FIX-SESSION)', () => {
  it('renders handles with scale compensation without NaN or Infinity', () => {
    const ctx = createMockContext();
    const camera = createMockCamera(2);
    const doc = createSampleDoc({ x: 3, y: 0.5 });
    const selected = new Set(['rect-1']);

    renderOverlay(ctx, camera, doc, selected, 800, 600);

    const fillRectCalls = (ctx.fillRect as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(fillRectCalls.length).toBeGreaterThan(0);
    for (const call of fillRectCalls) {
      for (const arg of call) {
        expect(Number.isFinite(arg)).toBe(true);
      }
    }
  });

  it('handles zero scale safely without NaN or Infinity', () => {
    const ctx = createMockContext();
    const camera = createMockCamera(1);
    const doc = createSampleDoc({ x: 0, y: 0 });
    const selected = new Set(['rect-1']);

    expect(() => renderOverlay(ctx, camera, doc, selected, 800, 600)).not.toThrow();

    const fillRectCalls = (ctx.fillRect as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    for (const call of fillRectCalls) {
      for (const arg of call) {
        expect(Number.isFinite(arg)).toBe(true);
      }
    }
  });

  it('gates smartDistance delta label on hover only', () => {
    const ctx = createMockContext();
    const camera = createMockCamera(1);
    const doc = createSampleDoc();
    const selected = new Set(['rect-1']);

    // Without hover
    renderOverlay(ctx, camera, doc, selected, 800, 600, {
      smartDistance: { point: { x: 50, y: 50 }, dx: 10, dy: 20 },
    });
    const fillTextCalls1 = (ctx.fillText as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const hasDeltaText1 = fillTextCalls1.some(([text]) => typeof text === 'string' && text.includes('ΔX'));
    expect(hasDeltaText1).toBe(false);

    // With hover
    renderOverlay(ctx, camera, doc, selected, 800, 600, {
      smartDistance: {
        point: { x: 50, y: 50 },
        dx: 10,
        dy: 20,
        hover: {
          selectionBounds: { x: 0, y: 0, width: 100, height: 100 },
          hoverBounds: { x: 150, y: 0, width: 100, height: 100 },
        },
      },
    });
    const fillTextCalls2 = (ctx.fillText as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const hasDeltaText2 = fillTextCalls2.some(([text]) => typeof text === 'string' && text.includes('ΔX'));
    expect(hasDeltaText2).toBe(true);
  });
});
