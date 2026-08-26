import type { DocumentModel, SceneObject, RectangleObject, EllipseObject, LineObject, PathObject, StrokeStyle, FillStyle, LinearGradientFill, RadialGradientFill, PatternFill, PolygonObject, StarObject, ArcObject, PieObject, RingObject, SpiralObject, CalloutObject, PolylineObject, ArrowheadStyle } from '@vectoria/core';
import { getTransformMatrix, normalizeCornerRadii, getPolygonVertices, getStarVertices, getSpiralVertices, getCalloutVertices } from '@vectoria/core';

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

  const elements: string[] = [];

  // Render objects in global z-order
  for (const layerId of doc.layerIds) {
    const layer = doc.layers[layerId];
    if (!layer || !layer.visible) continue;

    for (const objectId of layer.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj || !obj.visible) continue;

      // Register gradient if needed
      if (obj.style.fill.type === 'linear-gradient' || obj.style.fill.type === 'radial-gradient' || obj.style.fill.type === 'angular-gradient' || obj.style.fill.type === 'pattern') {
        const fill = obj.style.fill;
        if (!gradientMap.has(fill)) {
          const gradId = `grad-${gradientCounter++}`;
          gradientMap.set(fill, gradId);
          gradientDefs.push(fill.type === 'linear-gradient' ? buildLinearGradientDef(gradId, fill) : fill.type === 'radial-gradient' ? buildRadialGradientDef(gradId, fill) : fill.type === 'angular-gradient' ? buildAngularGradientDef(gradId, fill) : buildPatternDef(gradId, fill));
        }
      }

      const elementSvg = renderSceneObjectToSvg(obj, gradientMap, markerMap, markerDefs);
      if (elementSvg) {
        elements.push(elementSvg);
      }
    }
  }

  const defsContent = [
    `    <clipPath id="${clipId}">`,
    `      <rect x="0" y="0" width="${width}" height="${height}" />`,
    `    </clipPath>`,
    ...gradientDefs.map((d) => `    ${d}`),
    ...markerDefs.map((d) => `    ${d}`),
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
  const stops = fill.stops.map((stop) => `<stop offset="${stop.offset}" stop-color="${escapeXml(stop.color)}" stop-opacity="${stop.opacity}" />`).join('');
  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${fill.center.x}" cy="${fill.center.y}" r="${fill.radius}">${stops}</radialGradient>`;
}

function buildAngularGradientDef(id: string, fill: Extract<FillStyle, { type: 'angular-gradient' }>): string {
  const stops = fill.stops.map((stop) => `<stop offset="${stop.offset}" stop-color="${escapeXml(stop.color)}" stop-opacity="${stop.opacity}" />`).join('');
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${fill.center.x}" y1="${fill.center.y}" x2="${fill.center.x + Math.cos(fill.angle)}" y2="${fill.center.y + Math.sin(fill.angle)}">${stops}</linearGradient>`;
}

function buildPatternDef(id: string, fill: PatternFill): string {
  const size = Math.max(2, fill.size);
  const mark = fill.kind === 'dots' ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 6}" fill="${escapeXml(fill.foreground)}" />` : fill.kind === 'grid' ? `<path d="M 0 0 H ${size} V ${size} H 0 Z" fill="none" stroke="${escapeXml(fill.foreground)}" />` : `<path d="M 0 ${size} L ${size} 0" stroke="${escapeXml(fill.foreground)}" />`;
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="${escapeXml(fill.background)}" />${mark}</pattern>`;
}

/** Resolve fill to SVG fill attribute value. */
function resolveFillAttr(fill: FillStyle, gradientMap: Map<FillStyle, string>): string {
  if (fill.type === 'solid') return `fill="${escapeXml(fill.color)}"`;
  if (fill.type === 'linear-gradient') {
    const id = gradientMap.get(fill);
    return id ? `fill="url(#${id})"` : 'fill="none"';
  }
  if (fill.type === 'radial-gradient' || fill.type === 'angular-gradient' || fill.type === 'pattern') {
    const id = gradientMap.get(fill);
    return id ? `fill="url(#${id})"` : 'fill="none"';
  }
  return 'fill="none"';
}

function renderSceneObjectToSvg(
  obj: SceneObject,
  gradientMap: Map<FillStyle, string>,
  markerMap: Map<string, string>,
  markerDefs: string[],
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
    default:
      return null;
  }
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

  const segments = obj.nodes.map((node, i) => {
    if (i === 0) return `M ${node.point.x} ${node.point.y}`;
    const prev = obj.nodes[i - 1]!;
    const cp1 = prev.outHandle ?? prev.point;
    const cp2 = node.inHandle ?? node.point;
    return `C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${node.point.x} ${node.point.y}`;
  });
  if (obj.closed && obj.nodes.length > 1) {
    const last = obj.nodes[obj.nodes.length - 1]!;
    const first = obj.nodes[0]!;
    segments.push(`C ${last.outHandle?.x ?? last.point.x} ${last.outHandle?.y ?? last.point.y}, ${first.inHandle?.x ?? first.point.x} ${first.inHandle?.y ?? first.point.y}, ${first.point.x} ${first.point.y}`);
  }
  const d = segments.join(' ') + (obj.closed ? ' Z' : '');

  const fillAttr = obj.closed ? resolveFillAttr(obj.style.fill, gradientMap) : 'fill="none"';
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';

   return `<path d="${d}" transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr}${blendAttr(obj.style.blendMode)} />`;
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
  let attr = ` stroke="${escapeXml(stroke.color)}" stroke-width="${stroke.width}" stroke-linecap="${stroke.lineCap}" stroke-linejoin="${stroke.lineJoin}" stroke-miterlimit="${stroke.miterLimit}"`;
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
