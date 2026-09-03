import type { BrushProfile, PathNode } from '../model/types.js';
import type { Vec2 } from '@vectoria/shared';
import { samplePath } from './effects.js';

export interface BrushGeometryOptions {
  readonly spacing?: number;
  readonly scale?: number;
  readonly rotation?: 'fixed' | 'tangent';
}

/**
 * Generates continuous vector geometry for artistic stamp and pattern brushes
 * along an arbitrary bezier curve path using arc-length sampling.
 * Guarantees identical geometry generation across Canvas 2D and SVG exporters.
 */
export function generateBrushGeometry(
  nodes: readonly PathNode[],
  closed: boolean,
  brush: BrushProfile,
): { subpaths: PathNode[][]; isFilled: boolean } {
  if (brush.kind === 'caligraphic') {
    return { subpaths: [], isFilled: true };
  }

  const spacing = brush.spacing > 0 ? brush.spacing : 10;
  const samples = samplePath(nodes, closed, 16);
  if (samples.length < 2) return { subpaths: [], isFilled: true };

  const totalLength = samples[samples.length - 1]!.length;
  const stampCount = Math.max(2, Math.floor(totalLength / spacing));
  const subpaths: PathNode[][] = [];

  let sampleIdx = 0;
  for (let i = 0; i <= stampCount; i++) {
    const targetDist = (i / stampCount) * totalLength;
    while (sampleIdx < samples.length - 1 && samples[sampleIdx + 1]!.length < targetDist) {
      sampleIdx++;
    }
    const s = samples[sampleIdx]!;
    const pt = s.point;
    const tangent = s.tangent;
    const angle = Math.atan2(tangent.y, tangent.x);

    if (brush.kind === 'stamp') {
      const radius = brush.size / 2;
      // Generate a circular stamp polygon at pt
      const segs = 8;
      const stampNodes: PathNode[] = [];
      for (let j = 0; j < segs; j++) {
        const theta = (j / segs) * Math.PI * 2;
        stampNodes.push({
          point: {
            x: pt.x + Math.cos(theta) * radius,
            y: pt.y + Math.sin(theta) * radius,
          },
          inHandle: null,
          outHandle: null,
          kind: 'corner',
        });
      }
      subpaths.push(stampNodes);
    } else if (brush.kind === 'pattern') {
      const size = brush.size;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      if (brush.motif === 'dashes') {
        // Oriented rectangle dash
        const hw = size / 2;
        const hh = size / 6;
        const localCorners: Vec2[] = [
          { x: -hw, y: -hh },
          { x: hw, y: -hh },
          { x: hw, y: hh },
          { x: -hw, y: hh },
        ];
        const dashNodes: PathNode[] = localCorners.map((c) => ({
          point: {
            x: pt.x + (c.x * cos - c.y * sin),
            y: pt.y + (c.x * sin + c.y * cos),
          },
          inHandle: null,
          outHandle: null,
          kind: 'corner',
        }));
        subpaths.push(dashNodes);
      } else if (brush.motif === 'ornament') {
        // Diamond / rhombus ornament
        const r = size / 2;
        const localPoints: Vec2[] = [
          { x: 0, y: -r },
          { x: r * 0.7, y: 0 },
          { x: 0, y: r },
          { x: -r * 0.7, y: 0 },
        ];
        const diamondNodes: PathNode[] = localPoints.map((c) => ({
          point: {
            x: pt.x + (c.x * cos - c.y * sin),
            y: pt.y + (c.x * sin + c.y * cos),
          },
          inHandle: null,
          outHandle: null,
          kind: 'corner',
        }));
        subpaths.push(diamondNodes);
      } else {
        // Dots pattern
        const r = size / 2;
        const dotNodes: PathNode[] = [];
        const segs = 6;
        for (let j = 0; j < segs; j++) {
          const theta = (j / segs) * Math.PI * 2;
          dotNodes.push({
            point: {
              x: pt.x + Math.cos(theta) * r,
              y: pt.y + Math.sin(theta) * r,
            },
            inHandle: null,
            outHandle: null,
            kind: 'corner',
          });
        }
        subpaths.push(dotNodes);
      }
    }
  }

  return { subpaths, isFilled: true };
}
