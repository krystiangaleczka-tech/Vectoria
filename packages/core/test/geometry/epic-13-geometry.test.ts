import { describe, expect, it } from 'vitest';
import type { PathNode } from '../../src/model/types.js';
import { generateBrushGeometry } from '../../src/geometry/brush-geometry.js';
import { interpolateMeshPoint, interpolateMeshColor, triangulateMeshPatch } from '../../src/geometry/mesh-warp.js';
import { extrudePathGeometry } from '../../src/geometry/extrusion-3d.js';

describe('EPIC-13 Advanced Geometry (FX-017, FX-018, FX-021, FX-023)', () => {
  const lineNodes: PathNode[] = [
    { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
    { point: { x: 100, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
  ];

  it('FX-017: generates continuous stamp geometry along arc-length', () => {
    const { subpaths } = generateBrushGeometry(lineNodes, false, {
      kind: 'stamp',
      stamp: 'watercolor',
      size: 16,
      spacing: 20,
      jitter: 0,
    });

    expect(subpaths.length).toBeGreaterThanOrEqual(4);
    // Each stamp subpath has circular polygon nodes
    expect(subpaths[0]!.length).toBe(8);
  });

  it('FX-018: generates continuous pattern brush geometry (dashes & ornament)', () => {
    const { subpaths: dashSubpaths } = generateBrushGeometry(lineNodes, false, {
      kind: 'pattern',
      motif: 'dashes',
      size: 20,
      spacing: 25,
    });
    expect(dashSubpaths.length).toBeGreaterThanOrEqual(3);
    // Oriented dash quad
    expect(dashSubpaths[0]!.length).toBe(4);

    const { subpaths: ornamentSubpaths } = generateBrushGeometry(lineNodes, false, {
      kind: 'pattern',
      motif: 'ornament',
      size: 20,
      spacing: 25,
    });
    expect(ornamentSubpaths.length).toBeGreaterThanOrEqual(3);
    expect(ornamentSubpaths[0]!.length).toBe(4);
  });

  it('FX-021: triangulates gradient mesh patch deterministically without losing colors', () => {
    const corners = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ] as const;
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'] as const;

    const pt = interpolateMeshPoint(corners, 0.5, 0.5);
    expect(pt.x).toBeCloseTo(50);
    expect(pt.y).toBeCloseTo(50);

    const color = interpolateMeshColor(colors, 0.5, 0.5);
    expect(color).toMatch(/^rgba?\(/);

    const triangles = triangulateMeshPatch({ corners, colors }, 3, 3);
    // 3x3 grid = 9 quads = 18 triangles
    expect(triangles.length).toBe(18);
    expect(triangles[0]!.points.length).toBe(3);
  });

  it('FX-023: extrudes 2D path into 3D shaded facets sorted back-to-front', () => {
    const rectNodes: PathNode[] = [
      { point: { x: 0, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
      { point: { x: 80, y: 0 }, inHandle: null, outHandle: null, kind: 'corner' },
      { point: { x: 80, y: 60 }, inHandle: null, outHandle: null, kind: 'corner' },
      { point: { x: 0, y: 60 }, inHandle: null, outHandle: null, kind: 'corner' },
    ];

    const facets = extrudePathGeometry(rectNodes, true, '#3b82f6', {
      depth: 30,
      lighting: { azimuth: 45, elevation: 45, intensity: 0.9 },
    });

    // 4 side walls + 1 front face = 5 facets
    expect(facets.length).toBe(5);
    // Back-to-front sorting puts front face last (highest depthOrder)
    expect(facets[facets.length - 1]!.depthOrder).toBe(2);
    // Shaded colors are generated
    for (const f of facets) {
      expect(f.color).toBeTruthy();
    }
  });
});
