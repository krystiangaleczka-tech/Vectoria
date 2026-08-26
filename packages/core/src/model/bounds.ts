import type { Rect, Vec2 } from '@vectoria/shared';
import { mat3TransformPoint } from '@vectoria/shared';
import { getTransformMatrix } from './transform.js';
import type { SceneObject } from './types.js';
import { getPolygonVertices } from '../geometry/polygon.js';
import { getStarVertices } from '../geometry/star.js';
import { approximateArc } from '../geometry/arc.js';
import { getSpiralVertices } from '../geometry/spiral.js';

/** Axis-aligned world-space bounds used by viewport culling and selection. */
export function getObjectBounds(object: SceneObject, document?: import('./types.js').DocumentModel): Rect {
  if (object.type === 'group') {
    const children = object.childIds.map((id) => document?.objects[id]).filter((child): child is SceneObject => Boolean(child));
    if (children.length === 0) return { x: object.transform.position.x, y: object.transform.position.y, width: 0, height: 0 };
    return children.reduce((bounds, child) => {
      const childBounds = getObjectBounds(child, document);
      const x = Math.min(bounds.x, childBounds.x);
      const y = Math.min(bounds.y, childBounds.y);
      const right = Math.max(bounds.x + bounds.width, childBounds.x + childBounds.width);
      const bottom = Math.max(bounds.y + bounds.height, childBounds.y + childBounds.height);
      return { x, y, width: right - x, height: bottom - y };
    }, getObjectBounds(children[0]!, document));
  }
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
      case 'polygon':
        return getPolygonVertices(object.sides, object.radius);
      case 'star':
        return getStarVertices(object.points, object.outerRadius, object.innerRadius);
      case 'arc':
      case 'pie':
        return approximateArc(object.radiusX, object.radiusY, object.startAngle, object.endAngle, 32);
      case 'ring':
        return approximateArc(object.outerRadius, object.outerRadius, 0, Math.PI * 2, 32);
      case 'spiral':
        return getSpiralVertices(object.turns, object.decay, object.direction, 32);
      case 'polyline':
        return [...object.points];
      case 'callout':
        return [
          { x: 0, y: 0 }, { x: object.width, y: 0 },
          { x: object.width, y: object.height }, { x: 0, y: object.height },
          object.tailTip
        ];
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
