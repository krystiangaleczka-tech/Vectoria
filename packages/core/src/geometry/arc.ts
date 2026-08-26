import { Vec2 } from '@vectoria/shared';

/**
 * Generates points approximating an arc.
 * @param radiusX - Horizontal radius
 * @param radiusY - Vertical radius
 * @param startAngle - Start angle in radians
 * @param endAngle - End angle in radians
 * @param segments - Number of segments to approximate the arc
 * @returns Array of points approximating the arc segment.
 */
export function approximateArc(
  radiusX: number,
  radiusY: number,
  startAngle: number,
  endAngle: number,
  segments: number = 32
): Vec2[] {
  const points: Vec2[] = [];
  const sweep = endAngle - startAngle;
  
  if (segments < 1) segments = 1;
  const step = sweep / segments;
  
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + step * i;
    points.push({
      x: radiusX * Math.cos(angle),
      y: radiusY * Math.sin(angle),
    });
  }
  return points;
}
