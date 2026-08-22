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

  for (const artboardId of doc.artboardIds) {
    const artboard = doc.artboards[artboardId];
    if (!artboard) continue;
    if (!Number.isFinite(artboard.x) || !Number.isFinite(artboard.y)) violations.push({ code: 'INVALID_ARTBOARD_POSITION', message: `Artboard '${artboardId}' position must be finite.` });
    if (!Number.isFinite(artboard.width) || artboard.width <= 0) violations.push({ code: 'INVALID_ARTBOARD_WIDTH', message: `Artboard '${artboardId}' width must be positive and finite.` });
    if (!Number.isFinite(artboard.height) || artboard.height <= 0) violations.push({ code: 'INVALID_ARTBOARD_HEIGHT', message: `Artboard '${artboardId}' height must be positive and finite.` });
    if (artboard.frame && (!Number.isFinite(artboard.frame.x) || !Number.isFinite(artboard.frame.y) || !Number.isFinite(artboard.frame.width) || !Number.isFinite(artboard.frame.height) || artboard.frame.width <= 0 || artboard.frame.height <= 0)) violations.push({ code: 'INVALID_ARTBOARD_FRAME', message: `Artboard '${artboardId}' frame must contain finite positive dimensions.` });
  }

  if (!Number.isFinite(doc.grid.size) || doc.grid.size <= 0 || !Number.isInteger(doc.grid.subdivisions) || doc.grid.subdivisions < 1) violations.push({ code: 'INVALID_GRID', message: 'Grid size must be finite and subdivisions must be a positive integer.' });
  if (!Number.isFinite(doc.snap.tolerancePx) || doc.snap.tolerancePx < 0) violations.push({ code: 'INVALID_SNAP_TOLERANCE', message: 'Snap tolerance must be finite and non-negative.' });
  for (const guide of doc.guides) if (!Number.isFinite(guide.position)) violations.push({ code: 'INVALID_GUIDE_POSITION', message: `Guide '${guide.id}' position must be finite.` });

  for (const layerId of doc.layerIds) {
    const layer = doc.layers[layerId];
    if (layer && (!Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1)) violations.push({ code: 'INVALID_LAYER_OPACITY', message: `Layer '${layerId}' opacity must be within [0, 1].` });
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

        // Geometry dimensions must be positive and finite
        if ('width' in obj) {
          if (!Number.isFinite(obj.width) || obj.width <= 0) {
            violations.push({
              code: 'INVALID_WIDTH',
              message: `Object '${objectId}' has non-positive or non-finite width: ${obj.width}.`,
            });
          }
        }
        if ('height' in obj) {
          const h = (obj as { height: number }).height;
          if (!Number.isFinite(h) || h <= 0) {
            violations.push({
              code: 'INVALID_HEIGHT',
              message: `Object '${objectId}' has non-positive or non-finite height: ${h}.`,
            });
          }
        }
        
        if ('cornerRadius' in obj) {
          const r = obj.cornerRadius;
          const radii = typeof r === 'number' ? [r] : [r.topLeft, r.topRight, r.bottomRight, r.bottomLeft];
          const maxR = Math.min(obj.width, obj.height) / 2;
          if (radii.some((radius) => !Number.isFinite(radius) || radius < 0 || radius > maxR)) {
            violations.push({ code: 'INVALID_CORNER_RADIUS', message: `Object '${objectId}' has a corner radius outside [0, min(width, height)/2].` });
          }
        }

        if (!Number.isFinite(obj.style.opacity) || obj.style.opacity < 0 || obj.style.opacity > 1) {
          violations.push({ code: 'INVALID_OPACITY', message: `Object '${objectId}' has opacity out of bounds [0, 1] or non-finite.` });
        }

        // ── Stroke validation ──────────────────────────────────────────────
        if (obj.style.stroke) {
          const s = obj.style.stroke;
          if (!Number.isFinite(s.width) || s.width < 0) {
            violations.push({ code: 'INVALID_STROKE_WIDTH', message: `Object '${objectId}' has negative or non-finite stroke width.` });
          }
          if (!Number.isFinite(s.opacity) || s.opacity < 0 || s.opacity > 1) {
            violations.push({ code: 'INVALID_STROKE_OPACITY', message: `Object '${objectId}' stroke opacity out of range or non-finite.` });
          }
          if (!Number.isFinite(s.miterLimit) || s.miterLimit < 1) {
            violations.push({ code: 'INVALID_MITER_LIMIT', message: `Object '${objectId}' miterLimit must be >= 1 and finite.` });
          }
        }

        // ── Gradient validation ─────────────────────────────────────────────
        if (obj.style.fill.type === 'linear-gradient') {
          const { stops, start, end } = obj.style.fill;
          if (stops.length < 2) {
            violations.push({ code: 'INVALID_GRADIENT_STOPS', message: `Object '${objectId}' gradient needs >= 2 stops.` });
          }
          for (const stop of stops) {
            if (!Number.isFinite(stop.offset) || stop.offset < 0 || stop.offset > 1) {
              violations.push({ code: 'INVALID_GRADIENT_OFFSET', message: `Object '${objectId}' gradient offset out of range or non-finite.` });
            }
            if (!Number.isFinite(stop.opacity) || stop.opacity < 0 || stop.opacity > 1) {
              violations.push({ code: 'INVALID_GRADIENT_STOP_OPACITY', message: `Object '${objectId}' gradient stop opacity out of range or non-finite.` });
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
          const nodeIds = obj.nodes.map((node) => node.id).filter((id): id is string => Boolean(id));
          if (new Set(nodeIds).size !== nodeIds.length) {
            violations.push({ code: 'DUPLICATE_PATH_NODE_ID', message: `Object '${objectId}' contains duplicate path node IDs.` });
          }
          for (const node of obj.nodes) {
            if (node.id !== undefined && node.id.trim() === '') {
              violations.push({ code: 'INVALID_PATH_NODE_ID', message: `Object '${objectId}' contains an empty path node ID.` });
            }
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
