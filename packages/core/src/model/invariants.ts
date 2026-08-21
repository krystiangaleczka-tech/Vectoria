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

  if (new Set(doc.layerIds).size !== doc.layerIds.length) {
    violations.push({ code: 'DUPLICATE_LAYER_ID', message: 'layerIds contains duplicates.' });
  }
  if (new Set(doc.artboardIds).size !== doc.artboardIds.length) {
    violations.push({ code: 'DUPLICATE_ARTBOARD_ID', message: 'artboardIds contains duplicates.' });
  }

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
        
        if ('cornerRadius' in obj) {
          const r = obj.cornerRadius;
          if (r < 0) {
            violations.push({ code: 'INVALID_CORNER_RADIUS', message: `Object '${objectId}' has negative corner radius.` });
          } else if ('width' in obj && 'height' in obj) {
            const height = 'height' in obj ? obj.height : 0;
            const maxR = Math.min(obj.width, height) / 2;
            if (r > maxR) {
              violations.push({ code: 'INVALID_CORNER_RADIUS', message: `Object '${objectId}' corner radius exceeds min(width, height)/2.` });
            }
          }
        }

        if (obj.style.opacity < 0 || obj.style.opacity > 1) {
          violations.push({ code: 'INVALID_OPACITY', message: `Object '${objectId}' has opacity out of bounds [0, 1].` });
        }

        // ── Stroke validation ──────────────────────────────────────────────
        if (obj.style.stroke) {
          const s = obj.style.stroke;
          if (s.width < 0) {
            violations.push({ code: 'INVALID_STROKE_WIDTH', message: `Object '${objectId}' has negative stroke width.` });
          }
          if (s.opacity < 0 || s.opacity > 1) {
            violations.push({ code: 'INVALID_STROKE_OPACITY', message: `Object '${objectId}' stroke opacity out of range.` });
          }
          if (s.miterLimit < 1) {
            violations.push({ code: 'INVALID_MITER_LIMIT', message: `Object '${objectId}' miterLimit must be >= 1.` });
          }
        }

        // ── Gradient validation ─────────────────────────────────────────────
        if (obj.style.fill.type === 'linear-gradient') {
          const { stops, start, end } = obj.style.fill;
          if (stops.length < 2) {
            violations.push({ code: 'INVALID_GRADIENT_STOPS', message: `Object '${objectId}' gradient needs >= 2 stops.` });
          }
          for (const stop of stops) {
            if (stop.offset < 0 || stop.offset > 1) {
              violations.push({ code: 'INVALID_GRADIENT_OFFSET', message: `Object '${objectId}' gradient offset out of range.` });
            }
          }
          if (!Number.isFinite(start.x) || !Number.isFinite(start.y) || !Number.isFinite(end.x) || !Number.isFinite(end.y)) {
            violations.push({ code: 'NON_FINITE_GRADIENT_POINT', message: `Object '${objectId}' gradient has non-finite points.` });
          }
        }

        // ── Type-specific geometry validation ──────────────────────────────
        if (obj.type === 'ellipse' && (obj.width <= 0 || obj.height <= 0)) {
          violations.push({ code: 'INVALID_ELLIPSE_SIZE', message: `Object '${objectId}' has non-positive ellipse dimensions.` });
        }

        if (obj.type === 'line') {
          if (!Number.isFinite(obj.endPoint.x) || !Number.isFinite(obj.endPoint.y)) {
            violations.push({ code: 'NON_FINITE_ENDPOINT', message: `Object '${objectId}' has non-finite endPoint.` });
          }
        }

        if (obj.type === 'path') {
          // Open path needs >= 2 nodes, closed needs >= 3
          const minNodes = obj.closed ? 3 : 2;
          if (obj.nodes.length < minNodes) {
            violations.push({ code: 'INVALID_PATH_NODE_COUNT', message: `Object '${objectId}' path has too few nodes (${obj.nodes.length}, need >= ${minNodes}).` });
          }
          for (const node of obj.nodes) {
            if (!Number.isFinite(node.point.x) || !Number.isFinite(node.point.y)) {
              violations.push({ code: 'NON_FINITE_PATH_NODE', message: `Object '${objectId}' has non-finite path node coordinates.` });
              break;
            }
            if (node.inHandle && (!Number.isFinite(node.inHandle.x) || !Number.isFinite(node.inHandle.y))) {
              violations.push({ code: 'NON_FINITE_PATH_NODE', message: `Object '${objectId}' has non-finite path node inHandle.` });
              break;
            }
            if (node.outHandle && (!Number.isFinite(node.outHandle.x) || !Number.isFinite(node.outHandle.y))) {
              violations.push({ code: 'NON_FINITE_PATH_NODE', message: `Object '${objectId}' has non-finite path node outHandle.` });
              break;
            }
          }
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
