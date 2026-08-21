import type { Vec2 } from '@vectoria/shared';
import { rectContainsPoint } from '@vectoria/shared';
import type { DocumentModel, SceneObject, ObjectId, RectangleObject } from '@vectoria/core';
import { getTransformMatrix } from '@vectoria/core';
import { mat3Inverse, mat3TransformPoint } from '@vectoria/shared';

/**
 * Hit-test a point in world space against all visible, unlocked objects.
 * Returns the topmost hit object ID, or null.
 * Iterates in reverse z-order (top to bottom).
 */
export function hitTest(
  doc: DocumentModel,
  worldPoint: Vec2,
): ObjectId | null {
  // Iterate layers top-to-bottom
  for (let li = doc.layerIds.length - 1; li >= 0; li--) {
    const layerId = doc.layerIds[li]!;
    const layer = doc.layers[layerId];
    if (!layer || !layer.visible || layer.locked) continue;

    // Iterate objects top-to-bottom within layer
    for (let oi = layer.objectIds.length - 1; oi >= 0; oi--) {
      const objectId = layer.objectIds[oi]!;
      const obj = doc.objects[objectId];
      if (!obj || !obj.visible || obj.locked) continue;

      if (hitTestObject(obj, worldPoint)) {
        return objectId;
      }
    }
  }

  return null;
}

/**
 * Hit-test a single object.
 */
function hitTestObject(obj: SceneObject, worldPoint: Vec2): boolean {
  switch (obj.type) {
    case 'rectangle':
      return hitTestRectangle(obj, worldPoint);
    default:
      return false;
  }
}

/**
 * Hit-test a rectangle: transform the world point into local space
 * and check if it falls within the rectangle bounds.
 *
 * For "No Fill" objects, hit-test the stroke only (within strokeWidth/2 of edges).
 */
function hitTestRectangle(obj: RectangleObject, worldPoint: Vec2): boolean {
  const matrix = getTransformMatrix(obj.transform);
  const inv = mat3Inverse(matrix);
  if (!inv) return false;

  const localPoint = mat3TransformPoint(inv, worldPoint);

  const hasFill = obj.style.fill.type !== 'none';
  const strokeWidth = obj.style.stroke?.width ?? 0;
  const halfStroke = strokeWidth / 2;

  if (hasFill) {
    // Fill hit-test: point inside rectangle + stroke expansion
    return rectContainsPoint(
      {
        x: -halfStroke,
        y: -halfStroke,
        width: obj.width + strokeWidth,
        height: obj.height + strokeWidth,
      },
      localPoint,
    );
  }

  // No fill: hit-test stroke only (within halfStroke of edges)
  const tolerance = Math.max(halfStroke, 3); // minimum 3px tolerance

  const insideOuter = (
    localPoint.x >= -tolerance &&
    localPoint.x <= obj.width + tolerance &&
    localPoint.y >= -tolerance &&
    localPoint.y <= obj.height + tolerance
  );

  const insideInner = (
    localPoint.x >= tolerance &&
    localPoint.x <= obj.width - tolerance &&
    localPoint.y >= tolerance &&
    localPoint.y <= obj.height - tolerance
  );

  return insideOuter && !insideInner;
}
