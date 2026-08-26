import { Vec2 } from '@vectoria/shared';

/**
 * Generates vertices for a star shape.
 * @param points - Number of points (spikes), must be at least 3.
 * @param outerRadius - The radius of the outer points.
 * @param innerRadius - The radius of the inner points.
 * @returns Array of vertices centered at (0,0).
 */
export function getStarVertices(points: number, outerRadius: number, innerRadius: number): Vec2[] {
  const vertices: Vec2[] = [];
  const clampedPoints = Math.max(3, Math.floor(points));
  const numVertices = clampedPoints * 2;
  const angleStep = Math.PI / clampedPoints; // Half step for alternating points

  for (let i = 0; i < numVertices; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * angleStep - Math.PI / 2;
    vertices.push({
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
    });
  }
  return vertices;
}
