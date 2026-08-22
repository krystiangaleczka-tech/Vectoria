import type { Vec2 } from '@vectoria/shared';
import { gridLines, snapToGrid, type GridSettings } from './grid.js';

export type SnapSource = 'grid' | 'guide' | 'node' | 'edge' | 'center' | 'intersection' | 'pixel';

export interface Guide {
  id: string;
  axis: 'horizontal' | 'vertical';
  position: number;
  visible: boolean;
  locked: boolean;
}

export interface SnapSettings {
  enabled: boolean;
  tolerancePx: number;
  sources: Record<SnapSource, boolean>;
}

export interface SnapCandidate {
  source: SnapSource;
  worldPoint: Vec2;
  distancePx: number;
  priority: number;
  label: string;
  targetId?: string;
}

export interface SnapResult {
  snapped: boolean;
  worldPoint: Vec2;
  candidate?: SnapCandidate;
}

const PRIORITY: Record<SnapSource, number> = { node: 0, guide: 1, intersection: 2, edge: 3, center: 4, grid: 5, pixel: 6 };
const LABEL: Record<SnapSource, string> = { grid: 'Grid', guide: 'Guide', node: 'Anchor', edge: 'Edge', center: 'Center', intersection: 'Intersection', pixel: 'Pixel' };

export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  enabled: false,
  tolerancePx: 8,
  sources: { grid: true, guide: true, node: true, edge: true, center: true, intersection: true, pixel: false },
};

export class SnapService {
  snapPoint(point: Vec2, options: { zoom: number; settings: SnapSettings; grid: GridSettings; guides?: readonly Guide[]; candidates?: readonly SnapCandidate[] }): SnapResult {
    const { settings, zoom } = options;
    if (!settings.enabled || !Number.isFinite(zoom) || zoom <= 0) return { snapped: false, worldPoint: point };
    const tolerance = Math.max(0, settings.tolerancePx);
    const candidates: SnapCandidate[] = [];
    const add = (source: SnapSource, worldPoint: Vec2, targetId?: string) => {
      if (!settings.sources[source]) return;
      const distancePx = Math.hypot(worldPoint.x - point.x, worldPoint.y - point.y) * zoom;
      if (distancePx <= tolerance) candidates.push({ source, worldPoint, distancePx, priority: PRIORITY[source], label: LABEL[source], targetId });
    };

    if (settings.sources.grid) add('grid', snapToGrid(point, options.grid));
    for (const guide of options.guides ?? []) {
      if (!guide.visible) continue;
      add('guide', guide.axis === 'vertical' ? { x: guide.position, y: point.y } : { x: point.x, y: guide.position }, guide.id);
    }
    for (const candidate of options.candidates ?? []) {
      if (settings.sources[candidate.source]) add(candidate.source, candidate.worldPoint, candidate.targetId);
    }
    candidates.sort((a, b) => a.distancePx - b.distancePx || a.priority - b.priority || (a.targetId ?? '').localeCompare(b.targetId ?? ''));
    const candidate = candidates[0];
    return candidate ? { snapped: true, worldPoint: candidate.worldPoint, candidate } : { snapped: false, worldPoint: point };
  }
}

export { gridLines };
