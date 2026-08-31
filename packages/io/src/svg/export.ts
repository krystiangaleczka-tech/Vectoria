import type { DocumentModel, SceneObject, ObjectId, RectangleObject, EllipseObject, LineObject, PathObject, PathNode, StrokeStyle, FillStyle, LinearGradientFill, RadialGradientFill, PatternFill, TextureFill, PolygonObject, StarObject, ArcObject, PieObject, RingObject, SpiralObject, CalloutObject, PolylineObject, ArrowheadStyle, TextObject, TextFrameObject, ImageObject, SymbolInstanceObject, LiveEffect, Transform2D } from '@vectoria/core';
import { getTransformMatrix, normalizeCornerRadii, getPolygonVertices, getStarVertices, getSpiralVertices, getCalloutVertices, expandObject, getCubicSegment, evaluateCubic, computeTextFrameLayout, effectiveGeometry, hasGeometryEffects, buildCaligraphicOutline, radialRepeatTransforms, mirrorRepeatTransforms, gridRepeatTransforms, samplePath } from '@vectoria/core';

export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function exportArtboardToSvg(doc: DocumentModel, artboardId?: string): string {
  const targetArtboardId = artboardId ?? doc.activeArtboardId;
  const artboard = doc.artboards[targetArtboardId];

  if (!artboard) {
    throw new Error(`Artboard with ID "${targetArtboardId}" not found`);
  }

  const { width, height } = artboard;
  const clipId = `artboard-clip-${escapeXml(targetArtboardId)}`;

  // Collect all gradient fills for <defs>
  const gradientDefs: string[] = [];
  const gradientMap = new Map<FillStyle, string>();
  let gradientCounter = 0;

  // Arrowhead markers share defs and are referenced via marker-start/marker-end.
  const markerDefs: string[] = [];
  const markerMap = new Map<string, string>();

  // Image filters, crops and symbol definitions
  const filterDefs: string[] = [];
  const clipDefs: string[] = [];
  const symbolDefs = new Map<string, string>();

  // Mask groups: content objects are wrapped in <g clip-path|mask>, the mask
  // shape itself is emitted into defs as geometry only.
  const maskDefs: string[] = [];
  const masks = Object.values(doc.maskGroups ?? {});
  const maskedIds = new Set<ObjectId>();
  for (const group of masks) {
    maskedIds.add(group.maskId);
    for (const id of group.contentIds) maskedIds.add(id);
  }
  const maskContentBuffers = new Map<string, string[]>();

  const elements: string[] = [];

  // Render objects in global z-order
  for (const layerId of doc.layerIds) {
    const layer = doc.layers[layerId];
    if (!layer || !layer.visible || layer.isTemplate) continue;

    for (const objectId of layer.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj || !obj.visible) continue;

      // Register gradient if needed
      if (obj.style.fill.type === 'linear-gradient' || obj.style.fill.type === 'radial-gradient' || obj.style.fill.type === 'angular-gradient' || obj.style.fill.type === 'pattern' || obj.style.fill.type === 'texture') {
        const fill = obj.style.fill;
        if (!gradientMap.has(fill)) {
          const gradId = `grad-${gradientCounter++}`;
          gradientMap.set(fill, gradId);
          gradientDefs.push(fill.type === 'linear-gradient' ? buildLinearGradientDef(gradId, fill) : fill.type === 'radial-gradient' ? buildRadialGradientDef(gradId, fill) : fill.type === 'angular-gradient' ? buildAngularGradientDef(gradId, fill) : fill.type === 'texture' ? buildTexturePatternDef(gradId, fill) : buildPatternDef(gradId, fill));
        }
      }

      // Mask shapes are consumed by their group's def, not drawn directly.
      if (maskedIds.has(objectId) && masks.some((group) => group.maskId === objectId)) continue;

      const elementSvg = renderSceneObjectToSvg(obj, gradientMap, markerMap, markerDefs, doc, filterDefs, clipDefs, symbolDefs);
      if (!elementSvg) continue;
      const owningMask = masks.find((group) => group.contentIds.includes(objectId));
      if (owningMask) {
        const buffer = maskContentBuffers.get(owningMask.id) ?? [];
        buffer.push(elementSvg);
        maskContentBuffers.set(owningMask.id, buffer);
      } else {
        elements.push(elementSvg);
      }
    }
  }

  for (const group of masks) {
    const loops = maskGeometryLoopsForExport(doc.objects[group.maskId]);
    if (!loops) continue;
    const d = loops.map((loop) => 'M ' + loop.map((point) => `${round2(point.x)} ${round2(point.y)}`).join(' L ') + ' Z').join(' ');
    const refAttr = group.mode === 'clip' ? ` clip-path="url(#mask-${escapeXml(group.id)})"` : ` mask="url(#mask-${escapeXml(group.id)})"`;
    const body = maskContentBuffers.get(group.id) ?? [];
    elements.push(`<g${refAttr}>${body.map((el) => el).join('')}</g>`);
    const maskTypeAttr = group.mode === 'opacity' && group.opacityMode === 'alpha' ? ' style="mask-type:alpha"' : '';
    if (group.mode === 'clip') {
      maskDefs.push(`<clipPath id="mask-${escapeXml(group.id)}"><path d="${d}" clip-rule="evenodd" /></clipPath>`);
    } else {
      const fill = group.opacityMode === 'alpha' ? '#000000' : '#ffffff';
      maskDefs.push(`<mask id="mask-${escapeXml(group.id)}"${maskTypeAttr}><path d="${d}" fill="${fill}" fill-rule="evenodd" /></mask>`);
    }
  }

  const defsContent = [
    `    <clipPath id="${clipId}">`,
    `      <rect x="0" y="0" width="${width}" height="${height}" />`,
    `    </clipPath>`,
    ...gradientDefs.map((d) => `    ${d}`),
    ...markerDefs.map((d) => `    ${d}`),
    ...maskDefs.map((d) => `    ${d}`),
    ...filterDefs.map((d) => `    ${d}`),
    ...clipDefs.map((d) => `    ${d}`),
    ...Array.from(symbolDefs.values()).map((d) => `    ${d}`),
  ].join('\n');

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${width} ${height}"
  width="${width}"
  height="${height}"
  overflow="hidden"
>
  <defs>
${defsContent}
  </defs>
  <g clip-path="url(#${clipId})" transform="translate(${-artboard.x} ${-artboard.y})">
${elements.map((el) => `    ${el}`).join('\n')}
  </g>
</svg>`;

  return svgContent;
}

/**
 * Build an SVG <linearGradient> definition element.
 * Coordinates use userSpaceOnUse (object local space via parent transform).
 */
function buildLinearGradientDef(id: string, fill: LinearGradientFill): string {
  const stops = fill.stops
    .map((s) => {
      const opacityAttr = s.opacity < 1 ? ` stop-opacity="${s.opacity}"` : '';
      return `      <stop offset="${s.offset}" stop-color="${escapeXml(s.color)}"${opacityAttr} />`;
    })
    .join('\n');

  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${fill.start.x}" y1="${fill.start.y}" x2="${fill.end.x}" y2="${fill.end.y}">\n${stops}\n    </linearGradient>`;
}

function buildRadialGradientDef(id: string, fill: RadialGradientFill): string {
  const stops = fill.stops
    .map((s) => {
      const opacityAttr = s.opacity < 1 ? ` stop-opacity="${s.opacity}"` : '';
      return `      <stop offset="${s.offset}" stop-color="${escapeXml(s.color)}"${opacityAttr} />`;
    })
    .join('\n');

  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${fill.center.x}" cy="${fill.center.y}" r="${fill.radius}">\n${stops}\n    </radialGradient>`;
}

function buildAngularGradientDef(id: string, fill: Extract<FillStyle, { type: 'angular-gradient' }>): string {
  // SVG has no native conical gradients, so we fallback to radial representation for compatibility
  const stops = fill.stops
    .map((s) => {
      const opacityAttr = s.opacity < 1 ? ` stop-opacity="${s.opacity}"` : '';
      return `      <stop offset="${s.offset}" stop-color="${escapeXml(s.color)}"${opacityAttr} />`;
    })
    .join('\n');
  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${fill.center.x}" cy="${fill.center.y}" r="24">\n${stops}\n    </radialGradient>`;
}

function patternTransformAttr(transform: { offsetX: number; offsetY: number; scale: number; rotation: number } | undefined): string {
  if (!transform) return '';
  const parts: string[] = [];
  if (transform.offsetX !== 0 || transform.offsetY !== 0) parts.push(`translate(${round2(transform.offsetX)} ${round2(transform.offsetY)})`);
  if (transform.rotation !== 0) parts.push(`rotate(${round2((transform.rotation * 180) / Math.PI)})`);
  if (transform.scale !== 1) parts.push(`scale(${round2(transform.scale)})`);
  return parts.length > 0 ? ` patternTransform="${parts.join(' ')}"` : '';
}

function buildPatternDef(id: string, fill: PatternFill): string {
  const size = Math.max(2, fill.size);
  let content = `<rect width="${size}" height="${size}" fill="${escapeXml(fill.background)}" />`;
  if (fill.kind === 'dots') {
    content += `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 6}" fill="${escapeXml(fill.foreground)}" />`;
  } else if (fill.kind === 'grid') {
    content += `<rect width="${size}" height="${size}" fill="none" stroke="${escapeXml(fill.foreground)}" stroke-width="${Math.max(1, size / 8)}" />`;
  } else if (fill.kind === 'hatch') {
    content += `<path d="M 0 ${size} L ${size} 0" stroke="${escapeXml(fill.foreground)}" stroke-width="${Math.max(1, size / 8)}" />`;
  }
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"${patternTransformAttr(fill.transform)}>\n      ${content}\n    </pattern>`;
}

function buildTexturePatternDef(id: string, fill: TextureFill): string {
  const href = fill.source.type === 'embed' ? fill.source.data : fill.source.url;
  const tile = 64;
  return `<pattern id="${id}" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse"${patternTransformAttr(fill.transform)}><image href="${escapeXml(href)}" x="0" y="0" width="${tile}" height="${tile}" preserveAspectRatio="none" /></pattern>`;
}

/** Resolve fill to SVG fill attribute value. */
function resolveFillAttr(fill: FillStyle, gradientMap: Map<FillStyle, string>): string {
  if (fill.type === 'solid') return `fill="${escapeXml(fill.color)}"`;
  if (fill.type === 'linear-gradient' || fill.type === 'radial-gradient' || fill.type === 'angular-gradient' || fill.type === 'pattern' || fill.type === 'texture') {
    const id = gradientMap.get(fill);
    return id ? `fill="url(#${id})"` : 'fill="none"';
  }
  if (fill.type === 'mesh-gradient') return `fill="${escapeXml(meshAverageColor(fill.colors))}"`;
  return 'fill="none"';
}

/** Average of the mesh corner colors — documented SVG fallback for mesh gradients (ADR-009). */
function meshAverageColor(colors: readonly (readonly string[])[]): string {
  let r = 0, g = 0, b = 0, count = 0;
  for (const row of colors) {
    for (const hex of row) {
      const clean = hex.replace('#', '');
      if (clean.length !== 6) continue;
      r += parseInt(clean.slice(0, 2), 16);
      g += parseInt(clean.slice(2, 4), 16);
      b += parseInt(clean.slice(4, 6), 16);
      count += 1;
    }
  }
  if (count === 0) return '#000000';
  return `#${[r / count, g / count, b / count].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

function renderSceneObjectToSvg(
  obj: SceneObject,
  gradientMap: Map<FillStyle, string>,
  markerMap: Map<string, string>,
  markerDefs: string[],
  doc?: DocumentModel,
  filterDefs?: string[],
  clipDefs?: string[],
  symbolDefs?: Map<string, string>,
): string | null {
  const visible = (obj.style.effects ?? []).filter((effect) => effect.visible);

  // 1. Geometry effects are baked into path data before dispatch (ADR-009 D3).
  let renderObj: SceneObject = obj;
  if (hasGeometryEffects(obj.style.effects)) {
    const baked = effectiveGeometry(obj, expandObject);
    if (baked) renderObj = { ...baked, id: obj.id, brush: undefined };
  }

  // 2. Body: brush profile replaces plain stroke rendering when present.
  let body: string | null;
  if (renderObj.type === 'path' && renderObj.brush) {
    body = renderBrushBody(renderObj, gradientMap);
  } else {
    body = renderBaseSceneObjectToSvg(renderObj, gradientMap, markerMap, markerDefs, doc, filterDefs, clipDefs, symbolDefs);
  }
  if (!body) return null;

  // 3. Stroke alignment wrapper: clip the stroke inside, mask it outside.
  const align = obj.style.stroke?.align;
  if ((align === 'inside' || align === 'outside') && clipDefs && isClosedShape(obj)) {
    const d = buildShapePathData(obj);
    if (d) {
      const defId = `align-${escapeXml(obj.id)}`;
      if (align === 'inside') {
        clipDefs.push(`<clipPath id="${defId}"><path d="${d}" /></clipPath>`);
        body = `<g clip-path="url(#${defId})">${body}</g>`;
      } else {
        clipDefs.push(`<mask id="${defId}" maskUnits="userSpaceOnUse" x="-100000" y="-100000" width="200000" height="200000"><rect x="-100000" y="-100000" width="200000" height="200000" fill="#fff" /><path d="${d}" fill="#000" /></mask>`);
        body = `<g mask="url(#${defId})">${body}</g>`;
      }
    }
  }

  // 4. Repeat + extrude instances: wrapper conjugation W = M_obj · I · M_obj⁻¹.
  const instances = flattenInstanceLists(collectInstanceTransforms(visible, obj));
  if (instances.length > 1) {
    const m = getTransformMatrix(obj.transform);
    const inv = invertMat3(m);
    const copies = [body];
    for (let i = 1; i < instances.length; i += 1) {
      const w = composeMat3(composeMat3(m, getTransformMatrix(instances[i]!)), inv);
      const opacity = visible.some((effect) => effect.type === 'extrude') ? ` opacity="${(0.55 + 0.45 * (i / instances.length)).toFixed(2)}"` : '';
      copies.push(`<g transform="matrix(${mat3Attr(w)})"${opacity}>${body}</g>`);
    }
    body = copies.join('');
  }

  // 5. Raster effects chain (FX-010 order preserved).
  const raster = visible.filter((effect) => ['dropShadow', 'blur', 'innerShadow', 'glow', 'svgFilter'].includes(effect.type));
  if (raster.length > 0 && filterDefs) {
    const fid = `fx-${escapeXml(obj.id)}`;
    filterDefs.push(buildEffectFilterDef(fid, raster));
    body = `<g filter="url(#${fid})">${body}</g>`;
  }

  return body;
}

function collectInstanceTransforms(visible: readonly LiveEffect[], obj: SceneObject): readonly Transform2D[][] {
  // Returns per-effect instance transform lists in object-local space.
  const transforms: Transform2D[][] = [];
  for (const effect of visible) {
    if (effect.type === 'radialRepeat') {
      transforms.push(radialRepeatTransforms(shapeBounds(obj), effect.count, effect.radius, effect.startAngle));
    } else if (effect.type === 'mirrorRepeat') {
      transforms.push(mirrorRepeatTransforms(shapeBounds(obj), effect.axis, effect.offset));
    } else if (effect.type === 'gridRepeat') {
      transforms.push(gridRepeatTransforms(effect.rows, effect.columns, effect.spacingX, effect.spacingY));
    } else if (effect.type === 'extrude') {
      const out: Transform2D[] = [];
      const dir = { x: Math.cos(effect.angle), y: Math.sin(effect.angle) };
      const stepDepth = effect.depth / effect.steps;
      for (let step = effect.steps; step >= 1; step -= 1) {
        out.push({ position: { x: dir.x * stepDepth * step, y: dir.y * stepDepth * step }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } });
      }
      out.push({ position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } });
      transforms.push(out);
    }
  }
  if (transforms.length === 0) transforms.push([{ position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } }]);
  return transforms;
}

function shapeBounds(obj: SceneObject): { minX: number; minY: number; maxX: number; maxY: number } {
  if (obj.type === 'path') {
    const xs = obj.nodes.map((node) => node.point.x);
    const ys = obj.nodes.map((node) => node.point.y);
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  }
  if ('width' in obj && 'height' in obj) return { minX: 0, minY: 0, maxX: obj.width, maxY: obj.height };
  return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
}

/** Flatten per-effect instance lists into composed local transforms. */
function flattenInstanceLists(effectLists: readonly Transform2D[][]): Transform2D[] {
  let current: Transform2D[] = [{ position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } }];
  for (const list of effectLists) {
    const next: Transform2D[] = [];
    for (const outer of current) {
      for (const inner of list) next.push(composeTransform2D(outer, inner));
    }
    if (next.length > 4096) return next.slice(0, 4096);
    current = next;
  }
  return current;
}

function composeTransform2D(outer: Transform2D, inner: Transform2D): Transform2D {
  const m = composeMat3(getTransformMatrix(outer), getTransformMatrix(inner));
  return {
    position: { x: m[6]!, y: m[7]! },
    rotation: Math.atan2(m[1]!, m[0]!),
    scale: { x: Math.hypot(m[0]!, m[1]!), y: Math.hypot(m[3]!, m[4]!) * (m[0]! * m[4]! - m[1]! * m[3]! < 0 ? -1 : 1) },
    pivot: { x: 0, y: 0 },
  };
}

type Mat3 = [number, number, number, number, number, number, number, number, number];

function composeMat3(a: readonly number[], b: readonly number[]): Mat3 {
  return [
    a[0]! * b[0]! + a[3]! * b[1]!, a[1]! * b[0]! + a[4]! * b[1]!, 0,
    a[0]! * b[3]! + a[3]! * b[4]!, a[1]! * b[3]! + a[4]! * b[4]!, 0,
    a[0]! * b[6]! + a[3]! * b[7]! + a[6]!, a[1]! * b[6]! + a[4]! * b[7]! + a[7]!, 1,
  ];
}

function invertMat3(m: readonly number[]): Mat3 {
  const [a, b, , c, d, , e, f] = m;
  const det = (a! * d! - b! * c!) || 1e-12;
  const ia = d! / det;
  const ib = -b! / det;
  const ic = -c! / det;
  const id = a! / det;
  const ie = -(ia * e! + ic * f!);
  const ifg = -(ib * e! + id * f!);
  return [ia, ib, 0, ic, id, 0, ie, ifg, 1];
}

function mat3Attr(m: readonly number[]): string {
  return `${round6(m[0]!)} ${round6(m[1]!)} ${round6(m[3]!)} ${round6(m[4]!)} ${round6(m[6]!)} ${round6(m[7]!)}`;
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * Build one SVG filter chaining the given raster effects in stack order.
 * Uses feDropShadow/feGaussianBlur for shadow and blur, the standard
 * inverted-alpha recipe for inner shadow, and passes svgFilter primitives
 * through. Mirrors the Canvas composite pipeline.
 */
function buildEffectFilterDef(id: string, effects: readonly LiveEffect[]): string {
  const body: string[] = [];
  let prev = 'SourceGraphic';
  let index = 0;
  for (const effect of effects) {
    const out = `fx${index}`;
    if (effect.type === 'dropShadow') {
      body.push(`<feDropShadow in="${prev}" dx="${round2(effect.offsetX)}" dy="${round2(effect.offsetY)}" stdDeviation="${round2(effect.blur / 2)}" flood-color="${escapeXml(effect.color)}" flood-opacity="${effect.opacity}" result="${out}" />`);
    } else if (effect.type === 'blur') {
      body.push(`<feGaussianBlur in="${prev}" stdDeviation="${round2(effect.radius / 2)}" result="${out}" />`);
    } else if (effect.type === 'glow') {
      const b = `glowB${index}`;
      const f = `glowF${index}`;
      const c = `glowC${index}`;
      body.push(`<feGaussianBlur in="${prev}" stdDeviation="${round2(effect.blur / 2)}" result="${b}" />`);
      body.push(`<feFlood flood-color="${escapeXml(effect.color)}" flood-opacity="${effect.opacity}" result="${f}" />`);
      body.push(`<feComposite in="${f}" in2="${b}" operator="in" result="${c}" />`);
      body.push(`<feMerge result="${out}"><feMergeNode in="${c}" /><feMergeNode in="${prev}" /></feMerge>`);
    } else if (effect.type === 'innerShadow') {
      const inv = `inv${index}`;
      const off = `off${index}`;
      const bl = `bl${index}`;
      const cl = `cl${index}`;
      const fl = `fl${index}`;
      const sh = `sh${index}`;
      body.push(`<feComponentTransfer in="SourceAlpha" result="${inv}"><feFuncA type="table" tableValues="1 0" /></feComponentTransfer>`);
      body.push(`<feOffset in="${inv}" dx="${round2(effect.offsetX)}" dy="${round2(effect.offsetY)}" result="${off}" />`);
      body.push(`<feGaussianBlur in="${off}" stdDeviation="${round2(effect.blur / 2)}" result="${bl}" />`);
      body.push(`<feComposite in="${bl}" in2="SourceAlpha" operator="in" result="${cl}" />`);
      body.push(`<feFlood flood-color="${escapeXml(effect.color)}" flood-opacity="${effect.opacity}" result="${fl}" />`);
      body.push(`<feComposite in="${fl}" in2="${cl}" operator="in" result="${sh}" />`);
      body.push(`<feMerge result="${out}"><feMergeNode in="${prev}" /><feMergeNode in="${sh}" /></feMerge>`);
    } else if (effect.type === 'svgFilter') {
      if (effect.filterType === 'colorMatrix') {
        const values = typeof effect.params.matrix === 'string' ? effect.params.matrix : '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0';
        body.push(`<feColorMatrix in="${prev}" type="matrix" values="${escapeXml(values)}" result="${out}" />`);
      } else if (effect.filterType === 'turbulence') {
        const baseFrequency = typeof effect.params.baseFrequency === 'number' ? effect.params.baseFrequency : 0.05;
        const numOctaves = typeof effect.params.numOctaves === 'number' ? effect.params.numOctaves : 2;
        body.push(`<feTurbulence in="${prev}" baseFrequency="${baseFrequency}" numOctaves="${numOctaves}" result="${out}" />`);
      }
    }
    if (body.length === 0 || !body.some((line) => line.includes(`result="${out}"`))) {
      // Effect produced nothing (unsupported passthrough); keep chain alive.
      body.push(`<feOffset in="${prev}" dx="0" dy="0" result="${out}" />`);
    }
    prev = out;
    index += 1;
  }
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">${body.join('')}</filter>`;
}

const CLOSED_SHAPE_TYPES: readonly string[] = ['rectangle', 'ellipse', 'polygon', 'star', 'pie', 'ring', 'callout'];

function isClosedShape(obj: SceneObject): boolean {
  if (CLOSED_SHAPE_TYPES.includes(obj.type)) return true;
  return obj.type === 'path' && obj.closed;
}

/** Path data of the filled silhouette, used for stroke-align clip/mask defs. */
function buildShapePathData(obj: SceneObject): string | null {
  let target: SceneObject = obj;
  if (obj.type !== 'path') {
    const expanded = expandObject(obj);
    if (!expanded || expanded.type !== 'path') return null;
    target = expanded;
  }
  const path = target as PathObject;
  return pathDataFromNodes(path.nodes, path.closed, path.compoundChildren);
}

function pathDataFromNodes(nodes: readonly PathNode[], closed: boolean, compoundChildren?: readonly (readonly PathNode[])[]): string {
  const buildSubpath = (list: readonly PathNode[]): string[] => list.map((node, i) => {
    if (i === 0) return `M ${round2(node.point.x)} ${round2(node.point.y)}`;
    const prev = list[i - 1]!;
    const cp1 = prev.outHandle ?? prev.point;
    const cp2 = node.inHandle ?? node.point;
    return `C ${round2(cp1.x)} ${round2(cp1.y)}, ${round2(cp2.x)} ${round2(cp2.y)}, ${round2(node.point.x)} ${round2(node.point.y)}`;
  });
  const segments = buildSubpath(nodes);
  if (closed && nodes.length > 1) {
    const last = nodes[nodes.length - 1]!;
    const first = nodes[0]!;
    segments.push(`C ${round2(last.outHandle?.x ?? last.point.x)} ${round2(last.outHandle?.y ?? last.point.y)}, ${round2(first.inHandle?.x ?? first.point.x)} ${round2(first.inHandle?.y ?? first.point.y)}, ${round2(first.point.x)} ${round2(first.point.y)}`);
  }
  for (const child of compoundChildren ?? []) segments.push(...buildSubpath(child));
  return segments.join(' ') + (closed ? ' Z' : '');
}

/**
 * Render a brush path. Caligraphic brushes generate a real filled outline;
 * stamp/pattern brushes fall back to the plain stroke plus stamped motif
 * circles along the arc-length (documented simplification, ADR-009).
 */
function renderBrushBody(obj: PathObject, gradientMap: Map<FillStyle, string>): string | null {
  const brush = obj.brush!;
  const fillAttr = resolveFillAttr(obj.style.fill, gradientMap);
  const strokeColor = obj.style.stroke?.color ?? '#000000';
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';

  if (brush.kind === 'caligraphic') {
    const outline = buildCaligraphicOutline(obj.nodes, obj.closed, brush.angle, brush.thin, brush.thick);
    const d = pathDataFromNodes(outline, true);
    return `<path d="${d}" ${fillAttr} fill-rule="nonzero" transform="${transformAttr}"${opacityAttr} />`;
  }

  const baseStroke = obj.style.stroke;
  const strokeAttr = baseStroke ? buildStrokeAttr(baseStroke) : ` stroke="${escapeXml(strokeColor)}" stroke-width="1"`;
  const stamps: string[] = [];
  const samples = samplePath(obj.nodes, obj.closed, 8);
  const spacing = Math.max(brush.spacing, brush.size * 0.4);
  let nextAt = 0;
  for (const sample of samples) {
    if (sample.length < nextAt) continue;
    nextAt = sample.length + spacing;
    const size = brush.kind === 'stamp' ? brush.size * (brush.jitter > 0 ? 1 + jitterBrush(sample.length) * brush.jitter * 0.5 : 1) : brush.size * 0.35;
    stamps.push(`<circle cx="${round2(sample.point.x)}" cy="${round2(sample.point.y)}" r="${round2(size / 2)}" fill="${escapeXml(strokeColor)}" />`);
  }
  return `<g transform="${transformAttr}"${opacityAttr}><path d="${pathDataFromNodes(obj.nodes, obj.closed, obj.compoundChildren)}" fill="none"${strokeAttr} fill-opacity="0" stroke-opacity="${baseStroke?.opacity ?? 1}" />${stamps.join('')}</g>`;
}

function jitterBrush(seed: number): number {
  const x = Math.sin(seed * 91.7 + 47.3) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function renderBaseSceneObjectToSvg(
  obj: SceneObject,
  gradientMap: Map<FillStyle, string>,
  markerMap: Map<string, string>,
  markerDefs: string[],
  doc?: DocumentModel,
  filterDefs?: string[],
  clipDefs?: string[],
  symbolDefs?: Map<string, string>,
): string | null {
  switch (obj.type) {
    case 'rectangle':
      return renderRectangleToSvg(obj, gradientMap);
    case 'ellipse':
      return renderEllipseToSvg(obj, gradientMap);
    case 'line':
      return renderLineToSvg(obj, markerMap, markerDefs);
    case 'path':
      return renderPathToSvg(obj, gradientMap);
    case 'polygon':
    case 'star':
      return renderVertexPolygonToSvg(obj as PolygonObject | StarObject, gradientMap, obj.type === 'star');
    case 'polyline':
      return renderPolylineToSvg(obj as PolylineObject, markerMap, markerDefs);
    case 'arc':
    case 'pie':
    case 'spiral':
    case 'callout':
      return renderParametricPathToSvg(obj as ArcObject | PieObject | SpiralObject | CalloutObject, gradientMap);
    case 'ring':
      return renderRingToSvg(obj as RingObject, gradientMap);
    case 'text':
      return renderTextToSvg(obj as TextObject, gradientMap);
    case 'text-frame':
      return renderTextFrameToSvg(obj as TextFrameObject, gradientMap);
    case 'image':
      return renderImageToSvg(obj as ImageObject, filterDefs ?? [], clipDefs ?? []);
    case 'symbol-instance':
      return doc ? renderSymbolInstanceToSvg(obj as SymbolInstanceObject, doc, symbolDefs ?? new Map(), gradientMap, markerMap, markerDefs, filterDefs ?? [], clipDefs ?? []) : null;
    default:
      return null;
  }
}

function renderImageToSvg(
  obj: ImageObject,
  filterDefs: string[],
  clipDefs: string[],
): string {
  const transformAttr = transformAttrOf(obj);
  const href = obj.source.type === 'embed' ? obj.source.data : obj.source.url;
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';

  let filterAttr = '';
  if (obj.filters) {
    const filterId = `filter-${obj.id}`;
    let filterBody = '';
    if (obj.filters.grayscale) {
      filterBody += '<feColorMatrix type="matrix" values="0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0" />';
    }
    if (obj.filters.brightness !== undefined && obj.filters.brightness !== 0) {
      const slope = Math.max(0, (100 + obj.filters.brightness) / 100);
      filterBody += `<feComponentTransfer><feFuncR type="linear" slope="${slope}"/><feFuncG type="linear" slope="${slope}"/><feFuncB type="linear" slope="${slope}"/></feComponentTransfer>`;
    }
    if (obj.filters.contrast !== undefined && obj.filters.contrast !== 0) {
      const slope = Math.max(0, (100 + obj.filters.contrast) / 100);
      const intercept = (1 - slope) / 2;
      filterBody += `<feComponentTransfer><feFuncR type="linear" slope="${slope}" intercept="${intercept}"/><feFuncG type="linear" slope="${slope}" intercept="${intercept}"/><feFuncB type="linear" slope="${slope}" intercept="${intercept}"/></feComponentTransfer>`;
    }
    if (obj.filters.saturation !== undefined && obj.filters.saturation !== 100) {
      const s = obj.filters.saturation / 100;
      filterBody += `<feColorMatrix type="saturate" values="${s}" />`;
    }
    if (filterBody) {
      filterDefs.push(`<filter id="${filterId}">${filterBody}</filter>`);
      filterAttr = ` filter="url(#${filterId})"`;
    }
  }

  if (obj.crop) {
    const cropClipId = `clip-crop-${obj.id}`;
    const frame = obj.crop.frame ?? {
      x: 0,
      y: 0,
      width: obj.crop.width ?? obj.width,
      height: obj.crop.height ?? obj.height,
    };
    const offset = obj.crop.offset ?? {
      x: -(obj.crop.x ?? 0),
      y: -(obj.crop.y ?? 0),
    };
    const scale = obj.crop.scale ?? { x: 1, y: 1 };

    clipDefs.push(
      `<clipPath id="${cropClipId}"><rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" /></clipPath>`,
    );
    const imgX = frame.x + offset.x;
    const imgY = frame.y + offset.y;
    const imgW = obj.naturalWidth * (scale.x || 1);
    const imgH = obj.naturalHeight * (scale.y || 1);
    return `    <g transform="${transformAttr}" clip-path="url(#${cropClipId})"${opacityAttr}${filterAttr}${blendAttr(obj.style.blendMode)}><image href="${escapeXml(href)}" x="${imgX}" y="${imgY}" width="${imgW}" height="${imgH}" preserveAspectRatio="none" /></g>`;
  }

  return `    <image href="${escapeXml(href)}" x="0" y="0" width="${obj.width}" height="${obj.height}" transform="${transformAttr}"${opacityAttr}${filterAttr}${blendAttr(obj.style.blendMode)} preserveAspectRatio="none" />`;
}

function renderSymbolInstanceToSvg(
  obj: SymbolInstanceObject,
  doc: DocumentModel,
  symbolDefs: Map<string, string>,
  gradientMap: Map<FillStyle, string>,
  markerMap: Map<string, string>,
  markerDefs: string[],
  filterDefs: string[],
  clipDefs: string[],
): string {
  const transformAttr = transformAttrOf(obj);
  const symbol = doc.symbols?.[obj.symbolId];
  if (!symbol) return '';

  if (!symbolDefs.has(symbol.id)) {
    const childrenSvg: string[] = [];
    for (const childId of symbol.objectIds) {
      const child = symbol.objects[childId];
      if (child?.visible) {
        const svg = renderSceneObjectToSvg(child, gradientMap, markerMap, markerDefs, doc, filterDefs, clipDefs, symbolDefs);
        if (svg) childrenSvg.push(svg);
      }
    }
    symbolDefs.set(symbol.id, `<g id="symbol-${escapeXml(symbol.id)}">\n${childrenSvg.join('\n')}\n    </g>`);
  }

  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';
  return `    <use href="#symbol-${escapeXml(symbol.id)}" transform="${transformAttr}" width="${obj.width}" height="${obj.height}"${opacityAttr}${blendAttr(obj.style.blendMode)} />`;
}

function renderTextToSvg(obj: TextObject, gradientMap: Map<FillStyle, string>): string {
  const transformAttr = transformAttrOf(obj);
  const fillAttr = resolveFillAttr(obj.style.fill, gradientMap);
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';
  const textAnchor = obj.textAlign === 'center' ? 'middle' : obj.textAlign === 'right' ? 'end' : 'start';
  const letterSpacingAttr = obj.letterSpacing !== 0 ? ` letter-spacing="${obj.letterSpacing}px"` : '';

  if (obj.pathId) {
    return `    <text transform="${transformAttr}" font-family="${escapeXml(obj.fontFamily)}" font-size="${obj.fontSize}" font-weight="${obj.fontWeight}" font-style="${obj.fontStyle}"${letterSpacingAttr}${fillAttr}${strokeAttr}${opacityAttr}><textPath href="#${obj.pathId}">${escapeXml(obj.text)}</textPath></text>`;
  }

  const lines = obj.text.split('\n');
  const lineSpacing = obj.fontSize * (obj.lineHeight > 0 ? obj.lineHeight : 1.2);

  if (lines.length === 1) {
    return `    <text transform="${transformAttr}" y="${obj.fontSize}" font-family="${escapeXml(obj.fontFamily)}" font-size="${obj.fontSize}" font-weight="${obj.fontWeight}" font-style="${obj.fontStyle}" text-anchor="${textAnchor}"${letterSpacingAttr}${fillAttr}${strokeAttr}${opacityAttr}>${escapeXml(lines[0] || '')}</text>`;
  }

  const tspans = lines.map((line, idx) => `      <tspan x="0" y="${(idx + 1) * lineSpacing}">${escapeXml(line)}</tspan>`).join('\n');
  return `    <text transform="${transformAttr}" font-family="${escapeXml(obj.fontFamily)}" font-size="${obj.fontSize}" font-weight="${obj.fontWeight}" font-style="${obj.fontStyle}" text-anchor="${textAnchor}"${letterSpacingAttr}${fillAttr}${strokeAttr}${opacityAttr}>\n${tspans}\n    </text>`;
}

function renderTextFrameToSvg(obj: TextFrameObject, gradientMap: Map<FillStyle, string>): string {
  const transformAttr = transformAttrOf(obj);
  const fillAttr = resolveFillAttr(obj.style.fill, gradientMap);
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';
  const textAnchor = obj.textAlign === 'center' ? 'middle' : obj.textAlign === 'right' ? 'end' : 'start';
  const letterSpacingAttr = obj.letterSpacing !== 0 ? ` letter-spacing="${obj.letterSpacing}px"` : '';

  const layout = computeTextFrameLayout(obj);
  const tspans = layout.lines.map((line) => `      <tspan x="${line.x}" y="${line.baseline}">${escapeXml(line.text)}</tspan>`).join('\n');

  return `    <text transform="${transformAttr}" font-family="${escapeXml(obj.fontFamily)}" font-size="${obj.fontSize}" font-weight="${obj.fontWeight}" font-style="${obj.fontStyle}" text-anchor="${textAnchor}"${letterSpacingAttr}${fillAttr}${strokeAttr}${opacityAttr}>\n${tspans}\n    </text>`;
}

/** Shared transform attribute from the object's canonical matrix. */
function transformAttrOf(obj: SceneObject): string {
  const matrix = getTransformMatrix(obj.transform);
  return `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;
}

/** Regular polygon / star map to the native SVG <polygon points> element. */
function renderVertexPolygonToSvg(
  obj: PolygonObject | StarObject,
  gradientMap: Map<FillStyle, string>,
  isStar: boolean,
): string {
  const vertices = isStar
    ? getStarVertices((obj as StarObject).points, (obj as StarObject).outerRadius, (obj as StarObject).innerRadius)
    : getPolygonVertices((obj as PolygonObject).sides, (obj as PolygonObject).radius);
  const points = vertices.map((v) => `${v.x},${v.y}`).join(' ');
  const fillAttr = resolveFillAttr(obj.style.fill, gradientMap);
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';
  return `<polygon points="${points}" transform="${transformAttrOf(obj)}" ${fillAttr}${strokeAttr}${opacityAttr}${blendAttr(obj.style.blendMode)} />`;
}

/** Open vertex chains map to <polyline points>, keeping arrowhead markers. */
function renderPolylineToSvg(
  obj: PolylineObject,
  markerMap: Map<string, string>,
  markerDefs: string[],
): string {
  const points = obj.points.map((p) => `${p.x},${p.y}`).join(' ');
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke, obj.style.stroke.color, markerMap, markerDefs) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';
  return `<polyline points="${points}" fill="none" transform="${transformAttrOf(obj)}"${strokeAttr}${opacityAttr}${blendAttr(obj.style.blendMode)} />`;
}

/**
 * Arc, pie, spiral and callout flatten to a single <path d>; ring uses an
 * evenodd two-subpath path so the inner hole stays a hole.
 */
function renderParametricPathToSvg(
  obj: ArcObject | PieObject | SpiralObject | CalloutObject,
  gradientMap: Map<FillStyle, string>,
): string {
  let d: string;
  let closed = true;
  if (obj.type === 'spiral') {
    const pts = getSpiralVertices(obj.turns, obj.decay, obj.direction);
    d = 'M ' + pts.map((p) => `${round2(p.x)} ${round2(p.y)}`).join(' L ');
    closed = false;
  } else if (obj.type === 'callout') {
    const pts = getCalloutVertices(obj.width, obj.height, obj.cornerRadius, obj.tailTip, obj.tailBaseWidth);
    d = 'M ' + pts.map((p) => `${round2(p.x)} ${round2(p.y)}`).join(' L ') + ' Z';
  } else {
    const sweep = obj.endAngle - obj.startAngle;
    const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
    const sweepFlag = sweep >= 0 ? 1 : 0;
    const startX = obj.radiusX * Math.cos(obj.startAngle);
    const startY = obj.radiusY * Math.sin(obj.startAngle);
    const endX = obj.radiusX * Math.cos(obj.endAngle);
    const endY = obj.radiusY * Math.sin(obj.endAngle);
    const moveTo = obj.type === 'pie' ? `M 0 0 L ${round2(startX)} ${round2(startY)} ` : `M ${round2(startX)} ${round2(startY)} `;
    d = `${moveTo}A ${obj.radiusX} ${obj.radiusY} 0 ${largeArc} ${sweepFlag} ${round2(endX)} ${round2(endY)}${obj.type === 'pie' ? ' Z' : ''}`;
    closed = obj.type === 'pie' || (obj.type === 'arc' && obj.closed);
    if (obj.type === 'arc' && obj.closed) d += ' Z';
  }

  const fillable = obj.type !== 'spiral' && closed;
  const fillAttr = fillable ? resolveFillAttr(obj.style.fill, gradientMap) : 'fill="none"';
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';
  return `<path d="${d}" transform="${transformAttrOf(obj)}" ${fillAttr}${strokeAttr}${opacityAttr}${blendAttr(obj.style.blendMode)} />`;
}

/** Ring exports as outer + reversed inner subpaths with fill-rule="evenodd". */
function renderRingToSvg(obj: RingObject, gradientMap: Map<FillStyle, string>): string {
  const o = obj.outerRadius;
  const i = obj.innerRadius;
  const d = `M ${o} 0 A ${o} ${o} 0 1 0 ${-o} 0 A ${o} ${o} 0 1 0 ${o} 0 Z M ${i} 0 A ${i} ${i} 0 1 1 ${-i} 0 A ${i} ${i} 0 1 1 ${i} 0 Z`;
  const fillAttr = resolveFillAttr(obj.style.fill, gradientMap);
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';
  return `<path d="${d}" fill-rule="evenodd" transform="${transformAttrOf(obj)}" ${fillAttr}${strokeAttr}${opacityAttr}${blendAttr(obj.style.blendMode)} />`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function renderRectangleToSvg(obj: RectangleObject, gradientMap: Map<FillStyle, string>): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;

  const fillAttr = resolveFillAttr(obj.style.fill, gradientMap);
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';
  const radii = normalizeCornerRadii(obj.cornerRadius, obj.width, obj.height);
  const radiusAttr = radii.topLeft === radii.topRight && radii.topRight === radii.bottomRight && radii.bottomRight === radii.bottomLeft && radii.topLeft > 0
    ? ` rx="${radii.topLeft}" ry="${radii.topLeft}"`
    : '';
  if (radii.topLeft !== radii.topRight || radii.topRight !== radii.bottomRight || radii.bottomRight !== radii.bottomLeft) {
    const d = roundedRectanglePath(obj.width, obj.height, radii);
     return `<path d="${d}" transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr}${blendAttr(obj.style.blendMode)} />`;
  }

   return `<rect x="0" y="0" width="${obj.width}" height="${obj.height}" transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr}${blendAttr(obj.style.blendMode)}${radiusAttr} />`;
}

function roundedRectanglePath(width: number, height: number, radii: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number }): string {
  const { topLeft, topRight, bottomRight, bottomLeft } = radii;
  return `M ${topLeft} 0 H ${width - topRight} A ${topRight} ${topRight} 0 0 1 ${width} ${topRight} V ${height - bottomRight} A ${bottomRight} ${bottomRight} 0 0 1 ${width - bottomRight} ${height} H ${bottomLeft} A ${bottomLeft} ${bottomLeft} 0 0 1 0 ${height - bottomLeft} V ${topLeft} A ${topLeft} ${topLeft} 0 0 1 ${topLeft} 0 Z`;
}

function renderEllipseToSvg(obj: EllipseObject, gradientMap: Map<FillStyle, string>): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;
  const rx = obj.width / 2;
  const ry = obj.height / 2;

  const fillAttr = resolveFillAttr(obj.style.fill, gradientMap);
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';

  return `<ellipse cx="${rx}" cy="${ry}" rx="${rx}" ry="${ry}" transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr}${blendAttr(obj.style.blendMode)} />`;
}

function renderLineToSvg(obj: LineObject, markerMap: Map<string, string>, markerDefs: string[]): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;

  const fillAttr = 'fill="none"';
  const strokeColor = obj.style.stroke?.color ?? '#000000';
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke, strokeColor, markerMap, markerDefs) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';

  return `<line x1="0" y1="0" x2="${obj.endPoint.x}" y2="${obj.endPoint.y}" transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr}${blendAttr(obj.style.blendMode)} />`;
}

function renderPathToSvg(obj: PathObject, gradientMap: Map<FillStyle, string>): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;

  const buildSubpath = (nodes: readonly import('@vectoria/core').PathNode[]): string[] => nodes.map((node, i) => {
    if (i === 0) return `M ${node.point.x} ${node.point.y}`;
    const prev = nodes[i - 1]!;
    const cp1 = prev.outHandle ?? prev.point;
    const cp2 = node.inHandle ?? node.point;
    return `C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${node.point.x} ${node.point.y}`;
  });

  const segments = buildSubpath(obj.nodes);
  if (obj.closed && obj.nodes.length > 1) {
    const last = obj.nodes[obj.nodes.length - 1]!;
    const first = obj.nodes[0]!;
    segments.push(`C ${last.outHandle?.x ?? last.point.x} ${last.outHandle?.y ?? last.point.y}, ${first.inHandle?.x ?? first.point.x} ${first.inHandle?.y ?? first.point.y}, ${first.point.x} ${first.point.y}`);
  }
  // Compound children become extra subpaths; evenodd keeps their holes hollow.
  const isCompound = (obj.compoundChildren?.length ?? 0) > 0;
  for (const child of obj.compoundChildren ?? []) {
    const sub = buildSubpath(child);
    if (obj.closed && child.length > 1) {
      const last = child[child.length - 1]!;
      const first = child[0]!;
      sub.push(`C ${last.outHandle?.x ?? last.point.x} ${last.outHandle?.y ?? last.point.y}, ${first.inHandle?.x ?? first.point.x} ${first.inHandle?.y ?? first.point.y}, ${first.point.x} ${first.point.y}`);
    }
    segments.push(...sub);
  }
  let d = segments.join(' ') + (obj.closed ? ' Z' : '');
  if (isCompound) d += ' Z';

  const fillAttr = obj.closed ? resolveFillAttr(obj.style.fill, gradientMap) : 'fill="none"';
  const fillRuleAttr = isCompound ? ` fill-rule="${obj.fillRule ?? 'evenodd'}"` : '';
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';

   return `<path d="${d}"${fillRuleAttr} transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr}${blendAttr(obj.style.blendMode)} />`;
}

function blendAttr(mode: import('@vectoria/core').BlendMode | undefined): string {
  return !mode || mode === 'normal' ? '' : ` style="mix-blend-mode:${mode}"`;
}

function buildStrokeAttr(
  stroke: StrokeStyle,
  markerColor?: string,
  markerMap?: Map<string, string>,
  markerDefs?: string[],
): string {
  let attr = ` stroke="${escapeXml(stroke.color)}" stroke-width="${stroke.width}" stroke-linecap="${stroke.lineCap}" stroke-linejoin="${stroke.lineJoin}" stroke-miterlimit="${stroke.miterLimit}" data-vectoria-stroke-align="${stroke.align ?? 'center'}"`;
  if (stroke.dashArray.length > 0) {
    attr += ` stroke-dasharray="${stroke.dashArray.join(',')}"`;
  }
  if (stroke.opacity < 1) {
    attr += ` stroke-opacity="${stroke.opacity}"`;
  }
  if (markerColor && markerMap && markerDefs) {
    if (stroke.markerStart) attr += ` marker-start="url(#${markerIdFor(stroke.markerStart, markerColor, markerMap, markerDefs)})"`;
    if (stroke.markerEnd) attr += ` marker-end="url(#${markerIdFor(stroke.markerEnd, markerColor, markerMap, markerDefs)})"`;
  }
  return attr;
}

/** Register (once per type/size/color) and reference an SVG arrowhead marker. */
function markerIdFor(marker: ArrowheadStyle, color: string, markerMap: Map<string, string>, markerDefs: string[]): string {
  const key = `${marker.type}|${marker.size}|${color}`;
  const existing = markerMap.get(key);
  if (existing) return existing;

  const id = `marker-${markerMap.size}`;
  const s = marker.size;
  const fill = `fill="${escapeXml(color)}"`;
  let shape: string;
  switch (marker.type) {
    case 'triangle':
      shape = `<path d="M 0 0 L ${-s} ${-s * 0.5} L ${-s} ${s * 0.5} Z" ${fill} />`;
      break;
    case 'square':
      shape = `<rect x="${-s}" y="${-s * 0.5}" width="${s}" height="${s}" ${fill} />`;
      break;
    case 'circle':
      shape = `<circle cx="${-s / 2}" cy="0" r="${s / 2}" ${fill} />`;
      break;
    case 'arrow':
    default:
      shape = `<path d="M 0 0 L ${-s} ${-s * 0.5} L ${-s * 0.7} 0 L ${-s} ${s * 0.5} Z" ${fill} />`;
      break;
  }
  markerDefs.push(`<marker id="${id}" markerUnits="userSpaceOnUse" markerWidth="${s * 2}" markerHeight="${s * 2}" refX="0" refY="0" orient="auto">${shape}</marker>`);
  markerMap.set(key, id);
  return id;
}

/**
 * Initiates browser download of generated SVG content.
 */
export function downloadSvg(svgContent: string, filename = 'export.svg'): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** World-space outline loops of a mask shape; mirrors renderer compositing input. */
function maskGeometryLoopsForExport(maskObject: SceneObject | undefined): { x: number; y: number }[][] | null {
  if (!maskObject) return null;
  const toWorld = (object: SceneObject, points: readonly { x: number; y: number }[]): { x: number; y: number }[] => {
    const matrix = getTransformMatrix(object.transform);
    return points.map((point) => ({ x: matrix[0]! * point.x + matrix[3]! * point.y + matrix[6]!, y: matrix[1]! * point.x + matrix[4]! * point.y + matrix[7]! }));
  };
  if (maskObject.type === 'path') {
    const main = toWorld(maskObject, flattenPathLocal(maskObject));
    const children = (maskObject.compoundChildren ?? []).map((nodes) => toWorld(maskObject, nodes.map((node) => node.point)));
    return [main, ...children];
  }
  const expanded = expandObject(maskObject);
  if (expanded?.type === 'path' && expanded.nodes.length >= 2) return [toWorld(expanded, flattenPathLocal(expanded))];
  return null;
}

/** Local flatten without importing engine helpers (core flattenPath is local already). */
function flattenPathLocal(object: import('@vectoria/core').PathObject): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const segments = object.closed ? object.nodes.length : object.nodes.length - 1;
  for (let index = 0; index < segments; index += 1) {
    const segment = getCubicSegment(object.nodes, index, object.closed);
    if (!segment) continue;
    for (let step = index === 0 ? 0 : 1; step <= 12; step += 1) points.push(evaluateCubic(segment, step / 12));
  }
  return points;
}
