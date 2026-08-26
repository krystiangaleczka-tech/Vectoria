import { Vec2 } from '@vectoria/shared';

/**
 * Defines the geometry for a callout (speech bubble).
 */
export interface CalloutGeometry {
  width: number;
  height: number;
  cornerRadius: number;
  tailTip: Vec2;
  tailBaseWidth: number;
}

/** Samples used to approximate each rounded corner of the bubble body. */
const CORNER_SEGMENTS = 4;

/**
 * Generates a closed vertex loop for a speech-bubble callout in local space,
 * with the body spanning (0,0)–(width,height) and the tail anchored to the
 * bottom edge. Renderer, hit-testing and SVG export share this single source
 * so all three stay geometrically identical.
 */
export function getCalloutVertices(
  width: number,
  height: number,
  cornerRadius: number,
  tailTip: Vec2,
  tailBaseWidth: number,
): Vec2[] {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;
  const r = Math.min(Math.max(Number.isFinite(cornerRadius) ? cornerRadius : 0, 0), Math.min(safeWidth, safeHeight) / 2);
  const halfBase = Math.max(Number.isFinite(tailBaseWidth) ? tailBaseWidth : 0, 0) / 2;
  const tipX = Number.isFinite(tailTip.x) ? tailTip.x : safeWidth / 2;
  const tipY = Number.isFinite(tailTip.y) ? tailTip.y : safeHeight;

  let baseLeft = clamp(tipX - halfBase, r, safeWidth - r);
  let baseRight = clamp(tipX + halfBase, r, safeWidth - r);
  if (baseRight < baseLeft) [baseLeft, baseRight] = [baseRight, baseLeft];

  const points: Vec2[] = [];
  // Clockwise in screen-space (y grows downward), starting after the TL corner.
  points.push({ x: r, y: 0 });
  points.push({ x: safeWidth - r, y: 0 });
  pushCorner(points, safeWidth - r, r, r, -Math.PI / 2, 0);
  points.push({ x: safeWidth, y: safeHeight - r });
  pushCorner(points, safeWidth - r, safeHeight - r, r, 0, Math.PI / 2);
  // Bottom edge runs right → left and is interrupted by the tail.
  points.push({ x: baseRight, y: safeHeight });
  points.push({ x: tipX, y: tipY });
  points.push({ x: baseLeft, y: safeHeight });
  points.push({ x: r, y: safeHeight });
  pushCorner(points, r, safeHeight - r, r, Math.PI / 2, Math.PI);
  points.push({ x: 0, y: r });
  pushCorner(points, r, r, r, Math.PI, Math.PI * 1.5);
  return dedupeConsecutive(points);
}

function pushCorner(points: Vec2[], cx: number, cy: number, radius: number, startAngle: number, endAngle: number): void {
  if (radius <= 0) return;
  for (let i = 1; i < CORNER_SEGMENTS; i += 1) {
    const angle = startAngle + ((endAngle - startAngle) * i) / CORNER_SEGMENTS;
    points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function dedupeConsecutive(points: readonly Vec2[]): Vec2[] {
  const result: Vec2[] = [];
  for (const point of points) {
    const previous = result[result.length - 1];
    if (previous && previous.x === point.x && previous.y === point.y) continue;
    result.push(point);
  }
  return result;
}
