import { Vec2 } from '@vectoria/shared';

/**
 * Generates vertices for a regular polygon.
 * @param sides - Number of sides, must be at least 3.
 * @param radius - The radius of the circumscribed circle.
 * @returns Array of vertices centered at (0,0).
 */
export function getPolygonVertices(sides: number, radius: number): Vec2[] {
  const points: Vec2[] = [];
  const clampedSides = Math.max(3, Math.floor(sides));
  // Start at top (-PI/2)
  const angleStep = (Math.PI * 2) / clampedSides;
  for (let i = 0; i < clampedSides; i++) {
    const angle = i * angleStep - Math.PI / 2;
    points.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }
  return points;
}
