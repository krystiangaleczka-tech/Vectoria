import { Vec2 } from '@vectoria/shared';

/**
 * Calculates the geometry for an arrowhead based on the line's tangent.
 * @param type - The shape of the arrowhead.
 * @param size - The scaling factor of the arrowhead.
 * @param point - The position of the arrowhead tip (e.g. line endpoint).
 * @param tangent - The normalized direction vector pointing OUT of the line.
 * @returns An array of vertices representing the arrowhead polygon.
 */
export function getArrowheadVertices(
  type: 'arrow' | 'triangle' | 'square' | 'circle',
  size: number,
  point: Vec2,
  tangent: Vec2
): Vec2[] {
  // If it's a circle, returning bounds/vertices is less exact with a polygon,
  // but we can approximate it or handle it specially in the renderer.
  // We'll return 4 points for the circle's bounding box here for hit testing.
  
  const angle = Math.atan2(tangent.y, tangent.x);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  const transform = (p: Vec2): Vec2 => ({
    x: point.x + p.x * cos - p.y * sin,
    y: point.y + p.x * sin + p.y * cos
  });

  switch (type) {
    case 'arrow':
      return [
        transform({ x: 0, y: 0 }),
        transform({ x: -size, y: -size * 0.5 }),
        transform({ x: -size * 0.7, y: 0 }),
        transform({ x: -size, y: size * 0.5 }),
      ];
    case 'triangle':
      return [
        transform({ x: 0, y: 0 }),
        transform({ x: -size, y: -size * 0.5 }),
        transform({ x: -size, y: size * 0.5 }),
      ];
    case 'square':
      return [
        transform({ x: 0, y: -size * 0.5 }),
        transform({ x: -size, y: -size * 0.5 }),
        transform({ x: -size, y: size * 0.5 }),
        transform({ x: 0, y: size * 0.5 }),
      ];
    case 'circle':
      // Return a bounding box for the circle, centered at (-size/2, 0)
      return [
        transform({ x: 0, y: -size * 0.5 }),
        transform({ x: -size, y: -size * 0.5 }),
        transform({ x: -size, y: size * 0.5 }),
        transform({ x: 0, y: size * 0.5 }),
      ];
    default:
      return [];
  }
}
