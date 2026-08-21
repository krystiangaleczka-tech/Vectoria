import type { DocumentModel, SceneObject, RectangleObject } from '@vectoria/core';
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

  const elements: string[] = [];

  // Render objects in global z-order
  for (const layerId of doc.layerIds) {
    const layer = doc.layers[layerId];
    if (!layer || !layer.visible) continue;

    for (const objectId of layer.objectIds) {
      const obj = doc.objects[objectId];
      if (!obj || !obj.visible) continue;

      const elementSvg = renderSceneObjectToSvg(obj);
      if (elementSvg) {
        elements.push(elementSvg);
      }
    }
  }

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${width} ${height}"
  width="${width}"
  height="${height}"
  overflow="hidden"
>
  <defs>
    <clipPath id="${clipId}">
      <rect x="0" y="0" width="${width}" height="${height}" />
    </clipPath>
  </defs>
  <g clip-path="url(#${clipId})">
${elements.map((el) => `    ${el}`).join('\n')}
  </g>
</svg>`;

  return svgContent;
}

function renderSceneObjectToSvg(obj: SceneObject): string | null {
  switch (obj.type) {
    case 'rectangle':
      return renderRectangleToSvg(obj);
    default:
      return null;
  }
}

function renderRectangleToSvg(obj: RectangleObject): string {
  const matrix = getTransformMatrix(obj.transform);
  const transformAttr = `matrix(${matrix[0]} ${matrix[1]} ${matrix[3]} ${matrix[4]} ${matrix[6]} ${matrix[7]})`;

  let fillAttr = 'fill="none"';
  if (obj.style.fill.type === 'solid') {
    fillAttr = `fill="${escapeXml(obj.style.fill.color)}"`;
  }

  let strokeAttr = '';
  if (obj.style.stroke) {
    strokeAttr = ` stroke="${escapeXml(obj.style.stroke.color)}" stroke-width="${obj.style.stroke.width}" stroke-linecap="${obj.style.stroke.lineCap}" stroke-linejoin="${obj.style.stroke.lineJoin}" stroke-miterlimit="${obj.style.stroke.miterLimit}"`;
    if (obj.style.stroke.dashArray.length > 0) {
      strokeAttr += ` stroke-dasharray="${obj.style.stroke.dashArray.join(' ')}"`;
    }
    if (obj.style.stroke.opacity < 1) {
      strokeAttr += ` stroke-opacity="${obj.style.stroke.opacity}"`;
    }
  }

  const opacityAttr = obj.style.opacity < 1 ? ` opacity="${obj.style.opacity}"` : '';
  const radiusAttr = obj.cornerRadius > 0 ? ` rx="${obj.cornerRadius}" ry="${obj.cornerRadius}"` : '';

  return `<rect x="0" y="0" width="${obj.width}" height="${obj.height}" transform="${transformAttr}" ${fillAttr}${strokeAttr}${opacityAttr}${radiusAttr} />`;
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
