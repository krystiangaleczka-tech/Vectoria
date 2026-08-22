import type { Rect, Vec2 } from '@vectoria/shared';
import { mat3TransformPoint } from '@vectoria/shared';
import { getTransformMatrix } from './transform.js';
import type { SceneObject } from './types.js';

/** Axis-aligned world-space bounds used by viewport culling and selection. */
export function getObjectBounds(object: SceneObject): Rect {
  const points: Vec2[] = (() => {
    switch (object.type) {
      case 'rectangle':
        return [{ x: 0, y: 0 }, { x: object.width, y: 0 }, { x: object.width, y: object.height }, { x: 0, y: object.height }];
      case 'ellipse': {
        const points: Vec2[] = [];
        for (let i = 0; i < 16; i += 1) {
          const angle = (i / 16) * Math.PI * 2;
          points.push({ x: object.width / 2 + Math.cos(angle) * object.width / 2, y: object.height / 2 + Math.sin(angle) * object.height / 2 });
        }
        return points;
      }
      case 'line':
        return [{ x: 0, y: 0 }, object.endPoint];
      case 'path':
        return object.nodes.flatMap((node) => [node.point, ...(node.inHandle ? [node.inHandle] : []), ...(node.outHandle ? [node.outHandle] : [])]);
    }
  })();

  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const matrix = getTransformMatrix(object.transform);
  const transformed = points.map((point) => mat3TransformPoint(matrix, point));
  const xs = transformed.map((point) => point.x);
  const ys = transformed.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}
