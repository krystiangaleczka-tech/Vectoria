import type { PathNode } from '../model/types.js';
import type { Vec2 } from '@vectoria/shared';
import { parseColor } from '@vectoria/shared';

export interface ExtrusionBevelOptions {
  readonly enabled: boolean;
  readonly size: number;
  readonly segments: number;
}

export interface ExtrusionLightingOptions {
  readonly azimuth: number; // degrees, 0 = right, 90 = top
  readonly elevation: number; // degrees, 0 = horizon, 90 = zenith
  readonly intensity: number; // [0, 1]
}

export interface ExtrusionOptions {
  readonly depth: number;
  readonly bevel?: ExtrusionBevelOptions;
  readonly lighting?: ExtrusionLightingOptions;
}

export interface ExtrusionFacet {
  readonly points: readonly Vec2[];
  readonly color: string;
  readonly depthOrder: number;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculates surface normal of 3 points in 3D.
 */
function computeNormal(p0: Vec3, p1: Vec3, p2: Vec3): Vec3 {
  const ax = p1.x - p0.x;
  const ay = p1.y - p0.y;
  const az = p1.z - p0.z;

  const bx = p2.x - p0.x;
  const by = p2.y - p0.y;
  const bz = p2.z - p0.z;

  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;

  const len = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
}

/**
 * Calculates shaded color based on surface normal and directional lighting.
 */
function computeShading(
  baseColor: string,
  normal: Vec3,
  lighting: ExtrusionLightingOptions = { azimuth: 45, elevation: 45, intensity: 0.8 },
): string {
  const parsed = parseColor(baseColor);
  const rgb = parsed ? parsed.rgb : { r: 180, g: 180, b: 180, alpha: 1 };
  const azimRad = (lighting.azimuth * Math.PI) / 180;
  const elevRad = (lighting.elevation * Math.PI) / 180;

  const lx = Math.cos(elevRad) * Math.cos(azimRad);
  const ly = Math.cos(elevRad) * Math.sin(azimRad);
  const lz = Math.sin(elevRad);

  const dot = normal.x * lx + normal.y * ly + normal.z * lz;
  const diffuse = Math.max(0, dot) * lighting.intensity;
  const ambient = 0.25;
  const brightness = Math.min(1.2, ambient + diffuse);

  const r = Math.min(255, Math.round(rgb.r * brightness));
  const g = Math.min(255, Math.round(rgb.g * brightness));
  const b = Math.min(255, Math.round(rgb.b * brightness));
  const a = Math.round(rgb.alpha * 100) / 100;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Extrudes a 2D path into a 3D geometry mesh with side facets and realistic lighting.
 * Returns back-to-front sorted 2D facets suitable for Canvas 2D and SVG rendering.
 */
export function extrudePathGeometry(
  nodes: readonly PathNode[],
  closed: boolean,
  baseColor: string,
  options: ExtrusionOptions,
): ExtrusionFacet[] {
  if (nodes.length < 2) return [];

  const depth = options.depth > 0 ? options.depth : 20;
  const lighting = options.lighting ?? { azimuth: 45, elevation: 45, intensity: 0.8 };

  // Isometric / oblique offset vector for 3D depth projection
  const isoAngle = Math.PI / 4;
  const dx = Math.cos(isoAngle) * depth * 0.7;
  const dy = -Math.sin(isoAngle) * depth * 0.7;

  const facets: ExtrusionFacet[] = [];

  const count = nodes.length;
  const limit = closed ? count : count - 1;

  // 1. Generate side wall facets connecting front points to back points
  for (let i = 0; i < limit; i++) {
    const nextIdx = (i + 1) % count;
    const p0 = nodes[i]!.point;
    const p1 = nodes[nextIdx]!.point;

    const p0Back: Vec2 = { x: p0.x + dx, y: p0.y + dy };
    const p1Back: Vec2 = { x: p1.x + dx, y: p1.y + dy };

    const p0_3D: Vec3 = { x: p0.x, y: p0.y, z: depth };
    const p1_3D: Vec3 = { x: p1.x, y: p1.y, z: depth };
    const p0B_3D: Vec3 = { x: p0.x, y: p0.y, z: 0 };

    const normal = computeNormal(p0_3D, p1_3D, p0B_3D);
    const sideColor = computeShading(baseColor, normal, lighting);

    facets.push({
      points: [p0, p1, p1Back, p0Back],
      color: sideColor,
      depthOrder: 1, // sides
    });
  }

  // 2. Generate front face
  const frontPoints: Vec2[] = nodes.map((n) => n.point);
  const frontNormal: Vec3 = { x: 0, y: 0, z: 1 };
  const frontColor = computeShading(baseColor, frontNormal, lighting);

  facets.push({
    points: frontPoints,
    color: frontColor,
    depthOrder: 2, // front face on top
  });

  // Sort back-to-front
  facets.sort((a, b) => a.depthOrder - b.depthOrder);

  return facets;
}
