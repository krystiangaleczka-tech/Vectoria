import type { Vec2 } from '@vectoria/shared';
import { parseColor } from '@vectoria/shared';

export interface MeshPatch {
  readonly corners: readonly [Vec2, Vec2, Vec2, Vec2]; // [TL, TR, BR, BL]
  readonly controls?: readonly Vec2[];
  readonly colors: readonly [string, string, string, string]; // [TL, TR, BR, BL]
}

export interface MeshTriangle {
  readonly points: readonly [Vec2, Vec2, Vec2];
  readonly color: string;
}

/**
 * Bilinearly interpolates 2D coordinates between 4 corner points for parameters (u, v) in [0, 1].
 */
export function interpolateMeshPoint(
  corners: readonly [Vec2, Vec2, Vec2, Vec2],
  u: number,
  v: number,
): Vec2 {
  const [tl, tr, br, bl] = corners;
  const topX = (1 - u) * tl.x + u * tr.x;
  const topY = (1 - u) * tl.y + u * tr.y;
  const botX = (1 - u) * bl.x + u * br.x;
  const botY = (1 - u) * bl.y + u * br.y;

  return {
    x: (1 - v) * topX + v * botX,
    y: (1 - v) * topY + v * botY,
  };
}

/**
 * Bilinearly interpolates colors between 4 corners for parameters (u, v) in [0, 1].
 */
export function interpolateMeshColor(
  colors: readonly [string, string, string, string],
  u: number,
  v: number,
): string {
  const fallback = { hex: '#000000', rgb: { r: 0, g: 0, b: 0, alpha: 1 }, outOfGamut: false };
  const c00 = parseColor(colors[0]) ?? fallback;
  const c10 = parseColor(colors[1]) ?? fallback;
  const c11 = parseColor(colors[2]) ?? fallback;
  const c01 = parseColor(colors[3]) ?? fallback;

  const w00 = (1 - u) * (1 - v);
  const w10 = u * (1 - v);
  const w11 = u * v;
  const w01 = (1 - u) * v;

  const r = Math.round(w00 * c00.rgb.r + w10 * c10.rgb.r + w11 * c11.rgb.r + w01 * c01.rgb.r);
  const g = Math.round(w00 * c00.rgb.g + w10 * c10.rgb.g + w11 * c11.rgb.g + w01 * c01.rgb.g);
  const b = Math.round(w00 * c00.rgb.b + w10 * c10.rgb.b + w11 * c11.rgb.b + w01 * c01.rgb.b);
  const a = Math.round((w00 * c00.rgb.alpha + w10 * c10.rgb.alpha + w11 * c11.rgb.alpha + w01 * c01.rgb.alpha) * 100) / 100;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Subdivides a MeshPatch into a deterministic grid of colored triangles.
 * Enables high-fidelity gradient mesh rendering in both Canvas 2D and SVG exporters.
 */
export function triangulateMeshPatch(
  patch: MeshPatch,
  stepsU: number = 4,
  stepsV: number = 4,
): MeshTriangle[] {
  const triangles: MeshTriangle[] = [];

  for (let i = 0; i < stepsU; i++) {
    const u0 = i / stepsU;
    const u1 = (i + 1) / stepsU;

    for (let j = 0; j < stepsV; j++) {
      const v0 = j / stepsV;
      const v1 = (j + 1) / stepsV;

      const p00 = interpolateMeshPoint(patch.corners, u0, v0);
      const p10 = interpolateMeshPoint(patch.corners, u1, v0);
      const p11 = interpolateMeshPoint(patch.corners, u1, v1);
      const p01 = interpolateMeshPoint(patch.corners, u0, v1);

      const color1 = interpolateMeshColor(patch.colors, (u0 + u1 + u0) / 3, (v0 + v0 + v1) / 3);
      const color2 = interpolateMeshColor(patch.colors, (u1 + u1 + u0) / 3, (v0 + v1 + v1) / 3);

      triangles.push({ points: [p00, p10, p01], color: color1 });
      triangles.push({ points: [p10, p11, p01], color: color2 });
    }
  }

  return triangles;
}
