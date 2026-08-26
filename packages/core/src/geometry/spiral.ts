import { Vec2 } from '@vectoria/shared';

/**
 * Generates vertices for an Archimedean spiral.
 * @param turns - Number of full rotations.
 * @param decay - Distance between turns.
 * @param direction - 'cw' (clockwise) or 'ccw' (counter-clockwise).
 * @param segmentsPerTurn - Precision of the spiral approximation.
 * @returns Array of vertices centered at (0,0).
 */
export function getSpiralVertices(
  turns: number,
  decay: number,
  direction: 'cw' | 'ccw',
  segmentsPerTurn: number = 32
): Vec2[] {
  const points: Vec2[] = [];
  const maxAngle = turns * Math.PI * 2;
  const dirMultiplier = direction === 'cw' ? 1 : -1;
  
  const totalSegments = Math.ceil(turns * segmentsPerTurn);
  const angleStep = maxAngle / totalSegments;
  
  for (let i = 0; i <= totalSegments; i++) {
    const angle = i * angleStep;
    // For Archimedean spiral: r = a + b * theta. We assume a=0, b = decay / (2*PI)
    const r = (decay * angle) / (Math.PI * 2);
    
    points.push({
      x: r * Math.cos(angle * dirMultiplier),
      y: r * Math.sin(angle * dirMultiplier),
    });
  }
  return points;
}
