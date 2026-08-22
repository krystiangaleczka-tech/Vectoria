import { createDefaultDocument, createTransform, defaultObjectStyle, defaultStroke, type DocumentModel, type SceneObject, type PathNode } from '@vectoria/core';
import { generateId } from '@vectoria/shared';

const number = (element: Element, name: string, fallback = 0) => {
  const value = Number(element.getAttribute(name));
  return Number.isFinite(value) ? value : fallback;
};

const fill = (element: Element) => {
  const value = element.getAttribute('fill');
  return value === 'none' ? { type: 'none' as const } : { type: 'solid' as const, color: value || '#cccccc' };
};

const stroke = (element: Element) => {
  const color = element.getAttribute('stroke');
  if (!color || color === 'none') return null;
  return { ...defaultStroke, color, width: Math.max(0.01, number(element, 'stroke-width', 1)) };
};

const styleFor = (element: Element) => ({ ...defaultObjectStyle, fill: fill(element), stroke: stroke(element), opacity: Math.max(0, Math.min(1, number(element, 'opacity', 1))) });

function parsePathData(data: string): PathNode[] {
  const tokens = data.match(/[MLZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const nodes: PathNode[] = [];
  let index = 0;
  let command = '';
  while (index < tokens.length) {
    if (/^[MLZ]$/i.test(tokens[index]!)) {
      command = tokens[index]!.toUpperCase();
      index += 1;
    }
    if (command === 'Z') break;
    if ((command === 'M' || command === 'L') && index + 1 < tokens.length) {
      const x = Number(tokens[index++]);
      const y = Number(tokens[index++]);
      if (Number.isFinite(x) && Number.isFinite(y)) nodes.push({ point: { x, y }, inHandle: null, outHandle: null, kind: 'corner' });
    } else index += 1;
    if (command === 'M') command = 'L';
  }
  return nodes;
}

/** Import basic SVG geometry without coupling core to DOM or browser APIs. */
export function importSvgToDocument(svgText: string, name = 'Imported SVG'): DocumentModel {
  if (typeof DOMParser === 'undefined') throw new Error('SVG import requires DOMParser');
  const root = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement;
  if (!root || root.nodeName.toLowerCase() === 'parsererror') throw new Error('Invalid SVG document');
  const viewBox = (root.getAttribute('viewBox') || '').trim().split(/[ ,]+/).map(Number);
  const width = Number(root.getAttribute('width')) || viewBox[2] || 1920;
  const height = Number(root.getAttribute('height')) || viewBox[3] || 1080;
  const doc = createDefaultDocument({ name, width: Math.max(1, width), height: Math.max(1, height) });
  const layerId = doc.activeLayerId;
  const objects: Record<string, SceneObject> = {};
  const objectIds: string[] = [];
  const elements = Array.from(root.querySelectorAll('rect, ellipse, line, path'));
  for (const element of elements) {
    const id = generateId();
    const base = { id, name: element.getAttribute('id') || `${element.nodeName} ${objectIds.length + 1}`, layerId, visible: true, locked: false, style: styleFor(element) };
    const tag = element.nodeName.toLowerCase();
    let object: SceneObject | null = null;
    if (tag === 'rect') object = { ...base, type: 'rectangle', transform: createTransform({ x: number(element, 'x'), y: number(element, 'y') }), width: Math.max(0.01, number(element, 'width', 1)), height: Math.max(0.01, number(element, 'height', 1)), cornerRadius: Math.max(0, number(element, 'rx')) };
    if (tag === 'ellipse') object = { ...base, type: 'ellipse', transform: createTransform({ x: number(element, 'cx') - number(element, 'rx', 1), y: number(element, 'cy') - number(element, 'ry', 1) }), width: Math.max(0.01, number(element, 'rx', 1) * 2), height: Math.max(0.01, number(element, 'ry', 1) * 2) };
    if (tag === 'line') object = { ...base, type: 'line', transform: createTransform({ x: number(element, 'x1'), y: number(element, 'y1') }), endPoint: { x: number(element, 'x2') - number(element, 'x1'), y: number(element, 'y2') - number(element, 'y1') }, style: { ...styleFor(element), fill: { type: 'none' }, stroke: stroke(element) ?? defaultStroke } };
    if (tag === 'path') { const data = element.getAttribute('d') || ''; const nodes = parsePathData(data); if (nodes.length >= 2) object = { ...base, type: 'path', transform: createTransform({ x: 0, y: 0 }), nodes, closed: /z\s*$/i.test(data) }; }
    if (object) {
      objects[id] = object;
      objectIds.push(id);
    }
  }
  return { ...doc, objects, layers: { ...doc.layers, [layerId]: { ...doc.layers[layerId]!, objectIds } }, updatedAt: new Date().toISOString() };
}

export async function rasterizeSvgToPng(svg: string, width: number, height: number): Promise<Blob> {
  if (typeof Image === 'undefined' || typeof document === 'undefined') throw new Error('PNG export requires browser canvas');
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Unable to rasterize SVG')); image.src = url; });
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.ceil(width)); canvas.height = Math.max(1, Math.ceil(height));
    const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas 2D context unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}
