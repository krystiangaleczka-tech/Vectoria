import type { DocumentModel, ObjectStyle, SceneObject, ObjectId, TextObject, TextFrameObject } from '../model/types.js';
import { getObjectBounds } from '../model/bounds.js';
import { normalizeColor } from '@vectoria/shared';

export type SelectSameTarget =
  | 'fill' | 'stroke' | 'fill-stroke'
  | 'font' | 'size' | 'opacity' | 'type';
export type SelectSameScope = 'document' | 'active-artboard' | 'active-layer';

const EPS = 1e-6;

type StyledText = TextObject | TextFrameObject;

function isStyledText(obj: SceneObject): obj is StyledText {
  return obj.type === 'text' || obj.type === 'text-frame';
}

/** Normalized solid color; `null` for non-solid fills. */
function solidColor(fill: ObjectStyle['fill']): string | null {
  return fill.type === 'solid' ? normalizeColor(fill.color) : null;
}

/** Gradients/patterns match when type and stop colors match (geometry ignored by design). */
function matchesFill(a: ObjectStyle, b: ObjectStyle): boolean {
  if (a.fill.type !== b.fill.type) return false;
  const ca = solidColor(a.fill);
  const cb = solidColor(b.fill);
  if (ca !== null && cb !== null) return ca === cb;
  if (a.fill.type === 'linear-gradient' && b.fill.type === 'linear-gradient') {
    const aFill = a.fill;
    const bFill = b.fill;
    if (aFill.stops.length !== bFill.stops.length) return false;
    return aFill.stops.every((s, i) => {
      const bs = bFill.stops[i];
      return bs !== undefined && s.offset === bs.offset && normalizeColor(s.color) === normalizeColor(bs.color);
    });
  }
  // radial/angular/pattern: same type counts as same (documented simplification)
  return true;
}

function matchesStroke(a: ObjectStyle, b: ObjectStyle): boolean {
  if (!a.stroke && !b.stroke) return true;
  if (!a.stroke || !b.stroke) return false;
  const na = normalizeColor(a.stroke.color);
  const nb = normalizeColor(b.stroke.color);
  if (na === null || nb === null) return a.stroke.color === b.stroke.color;
  return na === nb && Math.abs(a.stroke.width - b.stroke.width) <= EPS;
}

function matchesFont(a: SceneObject, b: SceneObject): boolean {
  if (!isStyledText(a) || !isStyledText(b)) return false;
  return a.fontFamily.trim() === b.fontFamily.trim();
}

function matchesSize(doc: DocumentModel, a: SceneObject, b: SceneObject): boolean {
  const ba = getObjectBounds(a, doc);
  const bb = getObjectBounds(b, doc);
  return Math.abs(ba.width - bb.width) <= EPS && Math.abs(ba.height - bb.height) <= EPS;
}

/** Hidden or locked objects are never selected by Select Same. */
function isSelectable(obj: SceneObject): boolean {
  return obj.visible && !obj.locked;
}

/**
 * Finds objects in the document matching the visual or geometric properties of a reference object.
 * Applies color normalization and floating-point tolerance for widths/opacities/bounds.
 */
export function selectSame(
  doc: DocumentModel,
  referenceId: ObjectId,
  target: SelectSameTarget,
  scope: SelectSameScope = 'document'
): ObjectId[] {
  const refObj = doc.objects[referenceId];
  if (!refObj) return [];

  let candidates: SceneObject[] = [];
  if (scope === 'active-layer') {
    const layer = doc.layers[doc.activeLayerId];
    candidates = (layer?.objectIds ?? [])
      .map(id => doc.objects[id])
      .filter((o): o is SceneObject => Boolean(o));
  } else {
    // 'document' i 'active-artboard': iteracja per warstwa pomija ukryte/zablokowane warstwy
    for (const layerId of doc.layerIds) {
      const layer = doc.layers[layerId];
      if (!layer || !layer.visible || layer.locked) continue;
      for (const id of layer.objectIds) {
        const obj = doc.objects[id];
        if (obj) candidates.push(obj);
      }
    }
  }

  return candidates.filter(obj => {
    if (obj.id === referenceId) return true;
    if (!isSelectable(obj)) return false;
    const style = obj.style;
    const refStyle = refObj.style;

    switch (target) {
      case 'fill': return matchesFill(style, refStyle);
      case 'stroke': return matchesStroke(style, refStyle);
      case 'fill-stroke': return matchesFill(style, refStyle) && matchesStroke(style, refStyle);
      case 'font': return matchesFont(refObj, obj);
      case 'size': return matchesSize(doc, refObj, obj);
      case 'opacity': return Math.abs(style.opacity - refStyle.opacity) <= EPS;
      case 'type': return obj.type === refObj.type;
      default: return false;
    }
  }).map(obj => obj.id);
}
