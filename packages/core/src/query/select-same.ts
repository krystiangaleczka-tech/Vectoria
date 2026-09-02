import type { DocumentModel, ObjectStyle, SceneObject, ObjectId } from '../model/types.js';

export type SelectSameTarget = 'fill' | 'stroke' | 'fill-stroke';
export type SelectSameScope = 'document' | 'active-artboard' | 'active-layer';

function getObjectStyle(obj: SceneObject): ObjectStyle | undefined {
  if (obj.type === 'rectangle' || obj.type === 'ellipse' || obj.type === 'polygon' || obj.type === 'star' || 
      obj.type === 'path' || obj.type === 'line' || obj.type === 'arc' || obj.type === 'pie' || 
      obj.type === 'ring' || obj.type === 'spiral' || obj.type === 'callout' || obj.type === 'polyline' || 
      obj.type === 'text') {
    return (obj as unknown as { style?: ObjectStyle }).style;
  }
  return undefined;
}

function matchesFill(a: ObjectStyle, b: ObjectStyle): boolean {
  if (a.fill.type !== b.fill.type) return false;
  if (a.fill.type === 'solid' && b.fill.type === 'solid') return a.fill.color === b.fill.color;
  return true; // For complex gradients, we might need deeper comparison, but simplified for now
}

function matchesStroke(a: ObjectStyle, b: ObjectStyle): boolean {
  if (!a.stroke && !b.stroke) return true;
  if (!a.stroke || !b.stroke) return false;
  return a.stroke.color === b.stroke.color && a.stroke.width === b.stroke.width;
}

export function selectSame(
  doc: DocumentModel,
  referenceId: ObjectId,
  target: SelectSameTarget,
  scope: SelectSameScope = 'document'
): ObjectId[] {
  const refObj = doc.objects[referenceId];
  if (!refObj) return [];
  const refStyle = getObjectStyle(refObj);
  if (!refStyle) return [];

  let candidates: SceneObject[] = [];

  if (scope === 'document') {
    candidates = Object.values(doc.objects).filter((o): o is SceneObject => Boolean(o));
  } else if (scope === 'active-layer') {
    const layer = doc.layers[doc.activeLayerId];
    if (layer) {
      candidates = layer.objectIds.map(id => doc.objects[id]).filter((o): o is SceneObject => Boolean(o));
    }
  } else if (scope === 'active-artboard') {
    // For now, simplify this to document, since strict geometric intersection for active artboard
    // might be out of scope or we can just iterate all objects.
    candidates = Object.values(doc.objects).filter((o): o is SceneObject => Boolean(o));
  }

  return candidates.filter(obj => {
    if (obj.id === referenceId) return true;
    const style = getObjectStyle(obj);
    if (!style) return false;

    if (target === 'fill') return matchesFill(style, refStyle);
    if (target === 'stroke') return matchesStroke(style, refStyle);
    if (target === 'fill-stroke') return matchesFill(style, refStyle) && matchesStroke(style, refStyle);
    
    return false;
  }).map(obj => obj.id);
}
