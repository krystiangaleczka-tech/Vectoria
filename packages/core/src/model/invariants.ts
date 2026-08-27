import { normalizeColor } from '@vectoria/shared';
import type { DocumentModel, PaletteSwatch } from './types.js';

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

  const allIds = new Set<string>();
  const registerId = (id: string, code: string): void => {
    if (allIds.has(id)) violations.push({ code, message: `ID '${id}' is not unique across the document.` });
    allIds.add(id);
  };
  registerId(doc.id, 'DUPLICATE_DOCUMENT_ID');

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
    registerId(artboard.id, 'DUPLICATE_DOCUMENT_ID');
    if (artboard.id !== artboardId) violations.push({ code: 'ARTBOARD_KEY_MISMATCH', message: `Artboard key '${artboardId}' does not match its id.` });
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
    if (layer) {
      registerId(layer.id, 'DUPLICATE_DOCUMENT_ID');
      if (layer.id !== layerId) violations.push({ code: 'LAYER_KEY_MISMATCH', message: `Layer key '${layerId}' does not match its id.` });
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
        registerId(obj.id, 'DUPLICATE_DOCUMENT_ID');
        if (obj.id !== objectId) violations.push({ code: 'OBJECT_KEY_MISMATCH', message: `Object key '${objectId}' does not match its id.` });
        if (obj.type === 'group') {
          if (obj.childIds.length === 0) violations.push({ code: 'EMPTY_GROUP', message: `Group '${objectId}' must contain at least one child.` });
          const nestedIds = new Set<string>();
          const visitChild = (childId: string, ancestors: ReadonlySet<string>): void => {
            if (nestedIds.has(childId)) violations.push({ code: 'DUPLICATE_GROUP_CHILD', message: `Group '${objectId}' contains child '${childId}' more than once.` });
            nestedIds.add(childId);
            const child = doc.objects[childId];
            if (!child) violations.push({ code: 'MISSING_GROUP_CHILD', message: `Group '${objectId}' references missing child '${childId}'.` });
            if (ancestors.has(childId)) violations.push({ code: 'GROUP_CYCLE', message: `Group hierarchy contains cycle at '${childId}'.` });
            if (child && child.layerId !== obj.layerId) violations.push({ code: 'GROUP_LAYER_MISMATCH', message: `Group '${objectId}' child '${childId}' belongs to another layer.` });
            if (child && seenObjectIds.has(childId)) violations.push({ code: 'DUPLICATE_OBJECT_IN_GROUPS', message: `Object '${childId}' appears in more than one ownership location.` });
            if (child) seenObjectIds.add(childId);
            if (child?.type === 'group' && !ancestors.has(childId)) visitGroup(child, new Set([...ancestors, childId]));
          };
          const visitGroup = (group: Extract<typeof obj, { type: 'group' }>, ancestors: ReadonlySet<string>): void => {
            for (const childId of group.childIds) visitChild(childId, ancestors);
          };
          visitGroup(obj, new Set([objectId]));
        }
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
        if (obj.style.blendMode !== undefined && !['normal', 'multiply', 'screen', 'overlay'].includes(obj.style.blendMode)) {
          violations.push({ code: 'INVALID_BLEND_MODE', message: `Object '${objectId}' has an unsupported blend mode.` });
        }

        // ── Stroke validation ──────────────────────────────────────────────
        if (obj.style.stroke) {
          const s = obj.style.stroke;
          if (s.align !== undefined && !['center', 'inside', 'outside'].includes(s.align)) violations.push({ code: 'INVALID_STROKE_ALIGN', message: `Object '${objectId}' has an unsupported stroke alignment.` });
          if (!Number.isFinite(s.width) || s.width < 0) {
            violations.push({ code: 'INVALID_STROKE_WIDTH', message: `Object '${objectId}' has negative or non-finite stroke width.` });
          }
          if (!Number.isFinite(s.opacity) || s.opacity < 0 || s.opacity > 1) {
            violations.push({ code: 'INVALID_STROKE_OPACITY', message: `Object '${objectId}' stroke opacity out of range or non-finite.` });
          }
          if (!Number.isFinite(s.miterLimit) || s.miterLimit < 1) {
            violations.push({ code: 'INVALID_MITER_LIMIT', message: `Object '${objectId}' miterLimit must be >= 1 and finite.` });
          }
          if (s.dashArray.some((value) => !Number.isFinite(value) || value < 0)) violations.push({ code: 'INVALID_DASH_ARRAY', message: `Object '${objectId}' has an invalid dash pattern.` });
        }

        // ── Gradient validation ─────────────────────────────────────────────
        if (obj.style.fill.type === 'linear-gradient' || obj.style.fill.type === 'radial-gradient' || obj.style.fill.type === 'angular-gradient') {
          const { stops } = obj.style.fill;
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
          const points = obj.style.fill.type === 'linear-gradient' ? [obj.style.fill.start, obj.style.fill.end] : [obj.style.fill.center];
          if (points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) violations.push({ code: 'NON_FINITE_GRADIENT_POINT', message: `Object '${objectId}' gradient has non-finite points.` });
          if (obj.style.fill.type === 'linear-gradient' && (obj.style.fill.start.x === obj.style.fill.end.x && obj.style.fill.start.y === obj.style.fill.end.y)) violations.push({ code: 'DEGENERATE_GRADIENT', message: `Object '${objectId}' gradient endpoints must differ.` });
          if (obj.style.fill.type === 'radial-gradient' && (!Number.isFinite(obj.style.fill.radius) || obj.style.fill.radius <= 0)) violations.push({ code: 'INVALID_GRADIENT_RADIUS', message: `Object '${objectId}' radial gradient radius must be positive.` });
        }
        if (obj.style.fill.type === 'pattern' && (!Number.isFinite(obj.style.fill.size) || obj.style.fill.size <= 0)) {
          violations.push({ code: 'INVALID_PATTERN_SIZE', message: `Object '${objectId}' pattern size must be positive.` });
        }

        // ── Type-specific geometry validation ──────────────────────────────
        if (obj.type === 'ellipse' && (obj.width <= 0 || obj.height <= 0)) {
          violations.push({ code: 'INVALID_ELLIPSE_SIZE', message: `Object '${objectId}' has non-positive ellipse dimensions.` });
        }

        if (obj.type === 'polygon') {
          if (!Number.isFinite(obj.sides) || obj.sides < 3 || obj.sides > 64) violations.push({ code: 'INVALID_POLYGON_SIDES', message: `Object '${objectId}' polygon sides must be between 3 and 64.` });
          if (!Number.isFinite(obj.radius) || obj.radius <= 0) violations.push({ code: 'INVALID_POLYGON_RADIUS', message: `Object '${objectId}' polygon radius must be positive.` });
        }

        if (obj.type === 'star') {
          if (!Number.isFinite(obj.points) || obj.points < 3 || obj.points > 64) violations.push({ code: 'INVALID_STAR_POINTS', message: `Object '${objectId}' star points must be between 3 and 64.` });
          if (!Number.isFinite(obj.outerRadius) || !Number.isFinite(obj.innerRadius) || obj.innerRadius < 0 || obj.innerRadius >= obj.outerRadius) {
            violations.push({ code: 'INVALID_STAR_RADII', message: `Object '${objectId}' star inner radius must be >= 0 and strictly less than outer radius.` });
          }
        }

        if (obj.type === 'arc' || obj.type === 'pie') {
          if (!Number.isFinite(obj.radiusX) || obj.radiusX <= 0 || !Number.isFinite(obj.radiusY) || obj.radiusY <= 0) violations.push({ code: 'INVALID_ARC_RADII', message: `Object '${objectId}' arc/pie radii must be positive.` });
          if (!Number.isFinite(obj.startAngle) || !Number.isFinite(obj.endAngle)) violations.push({ code: 'INVALID_ARC_ANGLES', message: `Object '${objectId}' arc/pie angles must be finite.` });
        }

        if (obj.type === 'ring') {
          if (!Number.isFinite(obj.outerRadius) || !Number.isFinite(obj.innerRadius) || obj.innerRadius < 0 || obj.innerRadius >= obj.outerRadius) {
            violations.push({ code: 'INVALID_RING_RADII', message: `Object '${objectId}' ring inner radius must be >= 0 and strictly less than outer radius.` });
          }
        }

        if (obj.type === 'spiral') {
          if (!Number.isFinite(obj.turns) || obj.turns <= 0 || obj.turns > 20) violations.push({ code: 'INVALID_SPIRAL_TURNS', message: `Object '${objectId}' spiral turns must be in (0, 20].` });
          if (!Number.isFinite(obj.decay) || obj.decay <= 0) violations.push({ code: 'INVALID_SPIRAL_DECAY', message: `Object '${objectId}' spiral decay must be positive.` });
        }

        if (obj.type === 'callout') {
          if (!Number.isFinite(obj.tailBaseWidth) || obj.tailBaseWidth < 0) violations.push({ code: 'INVALID_CALLOUT_TAIL_WIDTH', message: `Object '${objectId}' callout tailBaseWidth must be non-negative.` });
          if (!Number.isFinite(obj.tailTip.x) || !Number.isFinite(obj.tailTip.y)) violations.push({ code: 'INVALID_CALLOUT_TAIL_TIP', message: `Object '${objectId}' callout tail tip must be finite.` });
        }

        if (obj.type === 'polyline') {
          if (obj.points.length < 2) violations.push({ code: 'INVALID_POLYLINE_POINTS', message: `Object '${objectId}' polyline must have at least 2 points.` });
          for (const pt of obj.points) {
            if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
               violations.push({ code: 'NON_FINITE_POLYLINE_POINT', message: `Object '${objectId}' polyline has non-finite coordinates.` });
               break;
            }
          }
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
          if (obj.widthProfile) {
            let previousT = -Infinity;
            for (const point of obj.widthProfile) {
              if (!Number.isFinite(point.t) || point.t < 0 || point.t > 1 || !Number.isFinite(point.width) || point.width <= 0 || point.t < previousT) {
                violations.push({ code: 'INVALID_WIDTH_PROFILE', message: `Object '${objectId}' has an invalid local stroke width profile.` });
                break;
              }
              previousT = point.t;
            }
          }
        }

        if (obj.type === 'text') {
          if (!Number.isFinite(obj.fontSize) || obj.fontSize <= 0) {
            violations.push({ code: 'INVALID_FONT_SIZE', message: `Object '${objectId}' text fontSize must be positive and finite.` });
          }
          if (!Number.isFinite(obj.letterSpacing)) {
            violations.push({ code: 'INVALID_LETTER_SPACING', message: `Object '${objectId}' text letterSpacing must be finite.` });
          }
          if (!Number.isFinite(obj.lineHeight) || obj.lineHeight <= 0) {
            violations.push({ code: 'INVALID_LINE_HEIGHT', message: `Object '${objectId}' text lineHeight must be positive and finite.` });
          }
          if (obj.pathId && (!(obj.pathId in doc.objects) || doc.objects[obj.pathId]?.type !== 'path')) {
            violations.push({ code: 'INVALID_TEXT_PATH_TARGET', message: `Object '${objectId}' text pathId '${obj.pathId}' must point to an existing path object.` });
          }
        }

        if (obj.type === 'text-frame') {
          if (!Number.isFinite(obj.width) || obj.width <= 0) {
            violations.push({ code: 'INVALID_TEXT_FRAME_WIDTH', message: `Object '${objectId}' text-frame width must be positive and finite.` });
          }
          if (!Number.isFinite(obj.height) || obj.height <= 0) {
            violations.push({ code: 'INVALID_TEXT_FRAME_HEIGHT', message: `Object '${objectId}' text-frame height must be positive and finite.` });
          }
          if (!Number.isFinite(obj.fontSize) || obj.fontSize <= 0) {
            violations.push({ code: 'INVALID_FONT_SIZE', message: `Object '${objectId}' text-frame fontSize must be positive and finite.` });
          }
          if (!Number.isFinite(obj.letterSpacing)) {
            violations.push({ code: 'INVALID_LETTER_SPACING', message: `Object '${objectId}' text-frame letterSpacing must be finite.` });
          }
          if (!Number.isFinite(obj.lineHeight) || obj.lineHeight <= 0) {
            violations.push({ code: 'INVALID_LINE_HEIGHT', message: `Object '${objectId}' text-frame lineHeight must be positive and finite.` });
          }
          if (!Number.isInteger(obj.columnCount) || obj.columnCount < 1 || obj.columnCount > 8) {
            violations.push({ code: 'INVALID_COLUMN_COUNT', message: `Object '${objectId}' text-frame columnCount must be an integer between 1 and 8.` });
          }
          if (!Number.isFinite(obj.columnGutter) || obj.columnGutter < 0) {
            violations.push({ code: 'INVALID_COLUMN_GUTTER', message: `Object '${objectId}' text-frame columnGutter must be non-negative and finite.` });
          }
          if (!Number.isFinite(obj.paragraphSpacing) || obj.paragraphSpacing < 0) {
            violations.push({ code: 'INVALID_PARAGRAPH_SPACING', message: `Object '${objectId}' text-frame paragraphSpacing must be non-negative and finite.` });
          }
          if (!Number.isFinite(obj.indent) || obj.indent < 0) {
            violations.push({ code: 'INVALID_TEXT_INDENT', message: `Object '${objectId}' text-frame indent must be non-negative and finite.` });
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
        if (Math.abs(transform.scale.x) < 1e-6 || Math.abs(transform.scale.y) < 1e-6) {
          violations.push({ code: 'ZERO_SCALE', message: `Object '${objectId}' has a degenerate transform scale.` });
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

  for (const group of Object.values(doc.maskGroups ?? {})) {
    if (!doc.objects[group.maskId]) violations.push({ code: 'DANGLING_MASK_TARGET', message: `Mask '${group.id}' references missing mask object.` });
    if (group.contentIds.length === 0 || group.contentIds.some((id) => !doc.objects[id] || id === group.maskId)) violations.push({ code: 'INVALID_MASK_CONTENT', message: `Mask '${group.id}' has missing or empty content references.` });
  }

  for (const palette of doc.palettes ?? []) {
    registerId(palette.id, 'DUPLICATE_PALETTE_ID');
    if (!palette.name.trim()) violations.push({ code: 'INVALID_PALETTE_NAME', message: `Palette '${palette.id}' has an empty name.` });
    const paletteColorIds = new Set<string>();
    for (const color of palette.colors) {
      if (paletteColorIds.has(color.id)) violations.push({ code: 'DUPLICATE_PALETTE_COLOR_ID', message: `Palette '${palette.id}' contains duplicate color '${color.id}'.` });
      registerId(color.id, 'DUPLICATE_PALETTE_COLOR_ID');
      paletteColorIds.add(color.id);
      if (!color.name.trim() || !normalizeColor(color.color)) violations.push({ code: 'INVALID_PALETTE_COLOR', message: `Palette '${palette.id}' contains an empty color name or invalid value.` });
    }
    const swatchIds = new Set<string>();
    for (const swatch of palette.swatches ?? []) {
      if (swatchIds.has(swatch.id)) violations.push({ code: 'DUPLICATE_SWATCH_ID', message: `Palette '${palette.id}' contains duplicate swatch '${swatch.id}'.` });
      registerId(swatch.id, 'DUPLICATE_SWATCH_ID');
      swatchIds.add(swatch.id);
      if (!swatch.name.trim()) violations.push({ code: 'INVALID_SWATCH_NAME', message: `Palette '${palette.id}' contains an unnamed swatch.` });
      validateSwatch(swatch, palette.id, violations);
    }
  }
  for (const style of doc.objectStyles ?? []) {
    registerId(style.id, 'DUPLICATE_OBJECT_STYLE_ID');
    if (!style.name.trim()) violations.push({ code: 'INVALID_OBJECT_STYLE_NAME', message: `Object style '${style.id}' has an empty name.` });
  }

  return violations;
}

function validateSwatch(swatch: PaletteSwatch, paletteId: string, violations: InvariantViolation[]): void {
  if (swatch.type === 'solid') {
    if (!normalizeColor(swatch.color)) violations.push({ code: 'INVALID_SWATCH_COLOR', message: `Palette '${paletteId}' contains a swatch with an invalid color.` });
    return;
  }
  if (swatch.type === 'pattern') {
    if (!normalizeColor(swatch.fill.foreground) || !normalizeColor(swatch.fill.background) || !Number.isFinite(swatch.fill.size) || swatch.fill.size <= 0) violations.push({ code: 'INVALID_SWATCH_PATTERN', message: `Palette '${paletteId}' contains an invalid pattern swatch.` });
    return;
  }
  if (swatch.fill.stops.length < 2) violations.push({ code: 'INVALID_SWATCH_GRADIENT', message: `Palette '${paletteId}' contains a gradient with fewer than two stops.` });
  for (const stop of swatch.fill.stops) {
    if (!normalizeColor(stop.color) || !Number.isFinite(stop.offset) || stop.offset < 0 || stop.offset > 1 || !Number.isFinite(stop.opacity) || stop.opacity < 0 || stop.opacity > 1) violations.push({ code: 'INVALID_SWATCH_GRADIENT_STOP', message: `Palette '${paletteId}' contains an invalid gradient stop.` });
  }
  if (swatch.fill.type === 'linear-gradient' && swatch.fill.start.x === swatch.fill.end.x && swatch.fill.start.y === swatch.fill.end.y) violations.push({ code: 'INVALID_SWATCH_GRADIENT_GEOMETRY', message: `Palette '${paletteId}' contains a degenerate linear gradient.` });
  if (swatch.fill.type === 'radial-gradient' && (!Number.isFinite(swatch.fill.radius) || swatch.fill.radius <= 0)) violations.push({ code: 'INVALID_SWATCH_GRADIENT_GEOMETRY', message: `Palette '${paletteId}' contains an invalid radial gradient radius.` });
}
