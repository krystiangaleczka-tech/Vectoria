import type { DocumentModel, SelectionState, SceneObject } from '@vectoria/core';
import { getObjectBounds } from '@vectoria/core';
import type { Rect } from '@vectoria/shared';
import type { ExportTarget } from './export-types.js';

/**
 * Resolves the bounding rectangle in world-space coordinates for an export request.
 * Completely decoupled from viewport camera zoom and pan (per EPIC-16 invariant).
 *
 * @param doc The immutable document snapshot.
 * @param target Artboard, selection, or arbitrary area target.
 * @param selection Current selection state (used if target is 'selection').
 * @returns Bounding box in world coordinates.
 * @throws Error if target artboard or selection is missing or empty.
 */
export function resolveExportRect(
  doc: DocumentModel,
  target: ExportTarget,
  selection?: SelectionState,
): Rect {
  if (target.kind === 'area') {
    return {
      x: target.rect.x,
      y: target.rect.y,
      width: Math.max(1, target.rect.width),
      height: Math.max(1, target.rect.height),
    };
  }

  if (target.kind === 'artboard') {
    const artboard = doc.artboards[target.artboardId];
    if (!artboard) {
      throw new Error(`EXPORT_TARGET_MISSING: Artboard with ID "${target.artboardId}" not found`);
    }
    return {
      x: artboard.x,
      y: artboard.y,
      width: Math.max(1, artboard.width),
      height: Math.max(1, artboard.height),
    };
  }

  // target.kind === 'selection'
  const ids = selection?.objectIds ?? [];
  if (ids.length === 0) {
    throw new Error('EXPORT_EMPTY_SELECTION: No objects selected for export');
  }

  const visibleObjects = ids
    .map((id) => doc.objects[id])
    .filter((obj): obj is SceneObject => Boolean(obj && obj.visible));

  if (visibleObjects.length === 0) {
    throw new Error('EXPORT_EMPTY_SELECTION: No visible objects found in selection');
  }

  const boundsList = visibleObjects.map((obj) => getObjectBounds(obj, doc));
  const minX = Math.min(...boundsList.map((b) => b.x));
  const minY = Math.min(...boundsList.map((b) => b.y));
  const maxX = Math.max(...boundsList.map((b) => b.x + b.width));
  const maxY = Math.max(...boundsList.map((b) => b.y + b.height));

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}
