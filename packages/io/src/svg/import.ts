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

export function parsePathData(data: string): PathNode[] {
  const tokens = data.match(/[MLCZHVmlczhv]|[-+]?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const nodes: PathNode[] = [];
  const closes = /z\s*$/i.test(data);
  let index = 0;
  let command = '';
  let current = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };
  const isCommand = (token: string): boolean => /^[MLCZHVmlczhv]$/.test(token);
  const readNumber = (): number | null => {
    const token = tokens[index];
    if (!token || isCommand(token)) return null;
    index += 1;
    const value = Number(token);
    return Number.isFinite(value) ? value : null;
  };
  const point = (x: number, y: number, relative: boolean): { x: number; y: number } => relative ? { x: current.x + x, y: current.y + y } : { x, y };

  while (index < tokens.length) {
    if (isCommand(tokens[index]!)) command = tokens[index++]!;
    if (!command) { index += 1; continue; }
    const relative = command === command.toLowerCase();
    const upper = command.toUpperCase();
    if (upper === 'Z') {
      current = start;
      command = '';
      continue;
    }
    if (upper === 'M' || upper === 'L') {
      const x = readNumber();
      const y = readNumber();
      if (x === null || y === null) { command = ''; continue; }
      const next = point(x, y, relative);
      nodes.push({ point: next, inHandle: null, outHandle: null, kind: 'corner' });
      current = next;
      if (upper === 'M') { start = next; command = relative ? 'l' : 'L'; }
      continue;
    }
    if (upper === 'H' || upper === 'V') {
      const value = readNumber();
      if (value === null) { command = ''; continue; }
      current = upper === 'H'
        ? { x: relative ? current.x + value : value, y: current.y }
        : { x: current.x, y: relative ? current.y + value : value };
      nodes.push({ point: current, inHandle: null, outHandle: null, kind: 'corner' });
      continue;
    }
    if (upper === 'C') {
      const values = Array.from({ length: 6 }, readNumber);
      if (values.some((value): value is null => value === null) || nodes.length === 0) { command = ''; continue; }
      const x1 = values[0]!;
      const y1 = values[1]!;
      const x2 = values[2]!;
      const y2 = values[3]!;
      const x = values[4]!;
      const y = values[5]!;
      const control1 = point(x1, y1, relative);
      const control2 = point(x2, y2, relative);
      const next = point(x, y, relative);
      const previous = nodes[nodes.length - 1]!;
      nodes[nodes.length - 1] = { ...previous, outHandle: control1 };
      if (closes && next.x === start.x && next.y === start.y) {
        nodes[0] = { ...nodes[0]!, inHandle: control2 };
      } else {
        nodes.push({ point: next, inHandle: control2, outHandle: null, kind: 'smooth' });
      }
      current = next;
      continue;
    }
    command = '';
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
    if (tag === 'path') { const data = element.getAttribute('d') || ''; const nodes = parsePathData(data).map((node, index) => ({ ...node, id: `${id}-node-${index + 1}` })); if (nodes.length >= 2) object = { ...base, type: 'path', transform: createTransform({ x: 0, y: 0 }), nodes, closed: /z\s*$/i.test(data) }; }
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
