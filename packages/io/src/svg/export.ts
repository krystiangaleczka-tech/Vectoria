import type { DocumentModel, SceneObject, RectangleObject, EllipseObject, LineObject, PathObject, StrokeStyle, FillStyle, LinearGradientFill } from '@vectoria/core';
import { getTransformMatrix } from '@vectoria/core';

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
  const gradientMap = new Map<LinearGradientFill, string>();
  let gradientCounter = 0;

  const elements: string[] = [];

  // Render objects in global z-order
  for (const layerId of doc.layerIds) {
    const layer = doc.layers[layerId];
    if (!layer || !layer.visible) continue;

    for (const objectId of layer.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj || !obj.visible) continue;

      // Register gradient if needed
      if (obj.style.fill.type === 'linear-gradient') {
        const fill = obj.style.fill;
        if (!gradientMap.has(fill)) {
          const gradId = `grad-${gradientCounter++}`;
          gradientMap.set(fill, gradId);
          gradientDefs.push(buildLinearGradientDef(gradId, fill));
        }
      }

      const elementSvg = renderSceneObjectToSvg(obj, gradientMap);
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

/** Resolve fill to SVG fill attribute value. */
function resolveFillAttr(fill: FillStyle, gradientMap: Map<LinearGradientFill, string>): string {
  if (fill.type === 'solid') return `fill="${escapeXml(fill.color)}"`;
  if (fill.type === 'linear-gradient') {
    const id = gradientMap.get(fill);
    return id ? `fill="url(#${id})"` : 'fill="none"';
  }
  return 'fill="none"';
}

function renderSceneObjectToSvg(
  obj: SceneObject,
  gradientMap: Map<LinearGradientFill, string>,
): string | null {
  switch (obj.type) {
    case 'rectangle':
      return renderRectangleToSvg(obj, gradientMap);
    case 'ellipse':
      return renderEllipseToSvg(obj, gradientMap);
    case 'line':
      return renderLineToSvg(obj, gradientMap);
    case 'path':
      return renderPathToSvg(obj, gradientMap);
    default:
      return null;
  }
}

function renderRectangleToSvg(obj: RectangleObject, gradientMap: Map<LinearGradientFill, string>): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;

  const fillAttr = resolveFillAttr(obj.style.fill, gradientMap);
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';
  const radiusAttr = obj.cornerRadius > 0 ? ` rx="${obj.cornerRadius}" ry="${obj.cornerRadius}"` : '';

  return `<rect x="0" y="0" width="${obj.width}" height="${obj.height}" transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr}${radiusAttr} />`;
}

function renderEllipseToSvg(obj: EllipseObject, gradientMap: Map<LinearGradientFill, string>): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;
  const rx = obj.width / 2;
  const ry = obj.height / 2;

  const fillAttr = resolveFillAttr(obj.style.fill, gradientMap);
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';

  return `<ellipse cx="${rx}" cy="${ry}" rx="${rx}" ry="${ry}" transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr} />`;
}

function renderLineToSvg(obj: LineObject, _gradientMap: Map<LinearGradientFill, string>): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;

  const fillAttr = 'fill="none"';
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';

  return `<line x1="0" y1="0" x2="${obj.endPoint.x}" y2="${obj.endPoint.y}" transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr} />`;
}

function renderPathToSvg(obj: PathObject, gradientMap: Map<LinearGradientFill, string>): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;

  const d = obj.nodes.map((node, i) => {
    if (i === 0) return `M ${node.point.x} ${node.point.y}`;
    const prev = obj.nodes[i - 1]!;
    const cp1 = prev.outHandle ?? prev.point;
    const cp2 = node.inHandle ?? node.point;
    return `C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${node.point.x} ${node.point.y}`;
  }).join(' ') + (obj.closed ? ' Z' : '');

  const fillAttr = obj.closed ? resolveFillAttr(obj.style.fill, gradientMap) : 'fill="none"';
  const strokeAttr = obj.style.stroke ? buildStrokeAttr(obj.style.stroke) : '';
  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';

  return `<path d="${d}" transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr} />`;
}

function buildStrokeAttr(stroke: StrokeStyle): string {
  let attr = ` stroke="${escapeXml(stroke.color)}" stroke-width="${stroke.width}" stroke-linecap="${stroke.lineCap}" stroke-linejoin="${stroke.lineJoin}" stroke-miterlimit="${stroke.miterLimit}"`;
  if (stroke.dashArray.length > 0) {
    attr += ` stroke-dasharray="${stroke.dashArray.join(',')}"`;
  }
  if (stroke.opacity < 1) {
    attr += ` stroke-opacity="${stroke.opacity}"`;
  }
  return attr;
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
