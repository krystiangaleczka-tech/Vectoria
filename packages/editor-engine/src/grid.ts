import type { Rect, Vec2 } from '@vectoria/shared';

export interface GridSettings {
  visible: boolean;
  size: number;
  subdivisions: number;
}

export const DEFAULT_GRID_SETTINGS: GridSettings = {
  visible: true,
  size: 10,
  subdivisions: 1,
};

export function normalizeGridSettings(settings: Partial<GridSettings> = {}): GridSettings {
  const size = Number.isFinite(settings.size) && (settings.size ?? 0) > 0 ? settings.size! : DEFAULT_GRID_SETTINGS.size;
  const subdivisions = Number.isInteger(settings.subdivisions) && (settings.subdivisions ?? 0) >= 1 ? settings.subdivisions! : DEFAULT_GRID_SETTINGS.subdivisions;
  return { visible: settings.visible ?? DEFAULT_GRID_SETTINGS.visible, size, subdivisions };
}

export function snapToGrid(point: Vec2, settings: GridSettings): Vec2 {
  const grid = normalizeGridSettings(settings);
  const spacing = grid.size / grid.subdivisions;
  return { x: Math.round(point.x / spacing) * spacing, y: Math.round(point.y / spacing) * spacing };
}

export function gridLines(visibleWorldRect: Rect, settings: GridSettings): { major: Vec2[][]; minor: Vec2[][] } {
  const grid = normalizeGridSettings(settings);
  const minorSpacing = grid.size / grid.subdivisions;
  const major: Vec2[][] = [];
  const minor: Vec2[][] = [];
  const startX = Math.floor(visibleWorldRect.x / minorSpacing) * minorSpacing;
  const endX = visibleWorldRect.x + visibleWorldRect.width;
  const startY = Math.floor(visibleWorldRect.y / minorSpacing) * minorSpacing;
  const endY = visibleWorldRect.y + visibleWorldRect.height;

  for (let x = startX; x <= endX; x += minorSpacing) {
    const line = [{ x, y: visibleWorldRect.y }, { x, y: endY }];
    (Math.abs(x / grid.size - Math.round(x / grid.size)) < 1e-8 ? major : minor).push(line);
  }
  for (let y = startY; y <= endY; y += minorSpacing) {
    const line = [{ x: visibleWorldRect.x, y }, { x: endX, y }];
    (Math.abs(y / grid.size - Math.round(y / grid.size)) < 1e-8 ? major : minor).push(line);
  }
  return { major, minor };
}
