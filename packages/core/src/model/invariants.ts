import type { DocumentModel } from './types.js';

export interface InvariantViolation {
  readonly code: string;
  readonly message: string;
}

/**
 * Validate all domain invariants on a DocumentModel.
 * Returns an empty array if the document is valid.
 */
export function validateInvariants(doc: DocumentModel): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // ── layerIds consistency ──────────────────────────────────────────────────
  for (const layerId of doc.layerIds) {
    if (!(layerId in doc.layers)) {
      violations.push({
        code: 'MISSING_LAYER',
        message: `layerIds contains '${layerId}' but layers does not have it.`,
      });
    }
  }

  // ── artboardIds consistency ───────────────────────────────────────────────
  for (const artboardId of doc.artboardIds) {
    if (!(artboardId in doc.artboards)) {
      violations.push({
        code: 'MISSING_ARTBOARD',
        message: `artboardIds contains '${artboardId}' but artboards does not have it.`,
      });
    }
  }

  // ── activeLayerId exists ──────────────────────────────────────────────────
  if (!(doc.activeLayerId in doc.layers)) {
    violations.push({
      code: 'INVALID_ACTIVE_LAYER',
      message: `activeLayerId '${doc.activeLayerId}' does not exist in layers.`,
    });
  }

  // ── activeArtboardId exists ───────────────────────────────────────────────
  if (!(doc.activeArtboardId in doc.artboards)) {
    violations.push({
      code: 'INVALID_ACTIVE_ARTBOARD',
      message: `activeArtboardId '${doc.activeArtboardId}' does not exist in artboards.`,
    });
  }

  // ── Object uniqueness across layers ───────────────────────────────────────
  const seenObjectIds = new Set<string>();
  for (const layerId of doc.layerIds) {
    const layer = doc.layers[layerId];
    if (!layer) continue;

    for (const objectId of layer.objectIds) {
      if (seenObjectIds.has(objectId)) {
        violations.push({
          code: 'DUPLICATE_OBJECT_IN_LAYERS',
          message: `ObjectId '${objectId}' appears in multiple layers.`,
        });
      }
      seenObjectIds.add(objectId);

      // Object must exist in objects record
      const obj = doc.objects[objectId];
      if (!obj) {
        violations.push({
          code: 'MISSING_OBJECT',
          message: `ObjectId '${objectId}' is in layer '${layerId}' objectIds but not in objects.`,
        });
      } else {
        // object.layerId must match
        if (obj.layerId !== layerId) {
          violations.push({
            code: 'OBJECT_LAYER_MISMATCH',
            message: `Object '${objectId}' has layerId '${obj.layerId}' but is in layer '${layerId}'.`,
          });
        }

        // Geometry dimensions must be positive
        if ('width' in obj && obj.width <= 0) {
          violations.push({
            code: 'INVALID_WIDTH',
            message: `Object '${objectId}' has non-positive width: ${obj.width}.`,
          });
        }
        if ('height' in obj && (obj as { height: number }).height <= 0) {
          violations.push({
            code: 'INVALID_HEIGHT',
            message: `Object '${objectId}' has non-positive height: ${(obj as { height: number }).height}.`,
          });
        }

        // All numbers must be finite
        const { transform } = obj;
        const numbers = [
          transform.position.x, transform.position.y,
          transform.rotation,
          transform.scale.x, transform.scale.y,
          transform.pivot.x, transform.pivot.y,
        ];
        for (const n of numbers) {
          if (!Number.isFinite(n)) {
            violations.push({
              code: 'NON_FINITE_NUMBER',
              message: `Object '${objectId}' contains a non-finite number in transform.`,
            });
            break;
          }
        }
      }
    }
  }

  // ── Check for orphaned objects (in objects record but not in any layer) ──
  for (const objectId of Object.keys(doc.objects)) {
    if (!seenObjectIds.has(objectId)) {
      violations.push({
        code: 'ORPHANED_OBJECT',
        message: `Object '${objectId}' exists in objects but is not in any layer's objectIds.`,
      });
    }
  }

  return violations;
}
