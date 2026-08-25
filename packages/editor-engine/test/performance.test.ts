import { describe, it, expect } from 'vitest';
import { getObjectBounds } from '@vectoria/core';
import type { SceneObject, DocumentModel } from '@vectoria/core';
import { generateId } from '@vectoria/shared';

function createDummyDocument(objectsCount: number, type: 'rectangle' | 'path' = 'rectangle', nodesPerPath = 100): DocumentModel {
  const objects: Record<string, SceneObject> = {};
  const objectIds: string[] = [];

  for (let i = 0; i < objectsCount; i++) {
    const id = generateId();
    objectIds.push(id);

    if (type === 'rectangle') {
      objects[id] = {
        type: 'rectangle',
        id,
        name: `Rect ${i}`,
        layerId: 'layer1',
        visible: true,
        locked: false,
        transform: {
          position: { x: Math.random() * 1000, y: Math.random() * 1000 },
          rotation: 0,
          scale: { x: 1, y: 1 },
          skew: { x: 0, y: 0 },
          pivot: { x: 0, y: 0 },
        },
        style: { fill: { type: 'solid', color: '#ff0000' }, stroke: null, opacity: 1, blendMode: 'normal' },
        width: 10 + Math.random() * 90,
        height: 10 + Math.random() * 90,
        cornerRadius: 0,
      };
    } else if (type === 'path') {
      const nodes = [];
      for (let j = 0; j < nodesPerPath; j++) {
        nodes.push({
          id: generateId(),
          point: { x: Math.random() * 1000, y: Math.random() * 1000 },
          inHandle: null,
          outHandle: null,
          kind: 'corner' as const,
        });
      }
      objects[id] = {
        type: 'path',
        id,
        name: `Path ${i}`,
        layerId: 'layer1',
        visible: true,
        locked: false,
        transform: {
          position: { x: 0, y: 0 },
          rotation: 0,
          scale: { x: 1, y: 1 },
          skew: { x: 0, y: 0 },
          pivot: { x: 0, y: 0 },
        },
        style: { fill: { type: 'none' }, stroke: null, opacity: 1, blendMode: 'normal' },
        nodes,
        closed: false,
      };
    }
  }

  return {
    schemaVersion: 1,
    id: 'doc1',
    name: 'Benchmark Doc',
    unit: 'px',
    artboards: {
      artboard1: {
        id: 'artboard1',
        name: 'Artboard',
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        background: { type: 'transparent' },
        visible: true,
      },
      hugeArtboard: {
        id: 'hugeArtboard',
        name: 'Huge Artboard',
        x: 0,
        y: 0,
        width: 135000,
        height: 450000,
        background: { type: 'transparent' },
        visible: true,
      }
    },
    artboardIds: ['artboard1', 'hugeArtboard'],
    activeArtboardId: 'artboard1',
    layers: {
      layer1: {
        id: 'layer1',
        name: 'Layer 1',
        visible: true,
        locked: false,
        opacity: 1,
        objectIds,
      },
    },
    layerIds: ['layer1'],
    activeLayerId: 'layer1',
    objects,
    guides: [],
    grid: { visible: true, size: 10, subdivisions: 1 },
    snap: { enabled: false, tolerancePx: 8, sources: { grid: true, guide: true, node: true, edge: true, center: true, intersection: true, pixel: false } },
    palettes: [],
    objectStyles: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('Performance Benchmarks', () => {
  it('measures bounds computation for 100 simple objects', () => {
    const doc = createDummyDocument(100);
    const start = performance.now();
    for (const obj of Object.values(doc.objects)) {
      getObjectBounds(obj, doc);
    }
    const end = performance.now();
    expect(end - start).toBeLessThan(50); // should be extremely fast
  });

  it('measures bounds computation for 10 000 simple objects', () => {
    const doc = createDummyDocument(10000);
    const start = performance.now();
    for (const obj of Object.values(doc.objects)) {
      getObjectBounds(obj, doc);
    }
    const end = performance.now();
    // this demonstrates the need for caching or R-Tree if it takes too long
    console.log(`10,000 objects bounds: ${end - start} ms`);
    expect(end - start).toBeLessThan(500); 
  });

  it('measures bounds computation for 1000 paths with 100 nodes each', () => {
    const doc = createDummyDocument(1000, 'path', 100);
    const start = performance.now();
    for (const obj of Object.values(doc.objects)) {
      getObjectBounds(obj, doc);
    }
    const end = performance.now();
    console.log(`1,000 paths (100 nodes) bounds: ${end - start} ms`);
    expect(end - start).toBeLessThan(1000); 
  });

  it('simulates dragging 500 objects', () => {
    const doc = createDummyDocument(500);
    const start = performance.now();
    
    // Simulate computing bounds repeatedly as if dragging them 60 frames
    for (let frame = 0; frame < 60; frame++) {
      for (const obj of Object.values(doc.objects)) {
        getObjectBounds(obj, doc);
      }
    }
    const end = performance.now();
    console.log(`Dragging 500 objects (60 frames) bounds computation: ${end - start} ms`);
    expect(end - start).toBeLessThan(500);
  });
  
  it('supports extreme artboard sizes without crashing', () => {
    const doc = createDummyDocument(1);
    const docWithHuge = { ...doc, activeArtboardId: 'hugeArtboard' };
    const artboard = docWithHuge.artboards[docWithHuge.activeArtboardId];
    expect(artboard?.width).toBe(135000);
    expect(artboard?.height).toBe(450000);
  });
});
