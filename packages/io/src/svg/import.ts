import { createDefaultDocument, createTransform, defaultObjectStyle, defaultStroke, type DocumentModel, type SceneObject, type PathNode, type ArrowheadStyle, type StrokeStyle } from '@vectoria/core';
import { generateId } from '@vectoria/shared';

const number = (element: Element, name: string, fallback = 0) => {
  const value = Number(element.getAttribute(name));
  return Number.isFinite(value) ? value : fallback;
};

/** Parse an SVG points list ("x,y x,y …") into vertices; odd trailing values are dropped. */
export function parsePointsData(data: string): { x: number; y: number }[] {
  const values = (data || '').trim().split(/[ ,]+/).filter(Boolean).map(Number).filter((value) => Number.isFinite(value));
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < values.length; i += 2) points.push({ x: values[i]!, y: values[i + 1]! });
  return points;
}

const fill = (element: Element, definitions: ReadonlyMap<string, import('@vectoria/core').FillStyle>) => {
  const value = element.getAttribute('fill');
  if (value === 'none') return { type: 'none' as const };
  const reference = value?.match(/^url\(#(.+)\)$/)?.[1];
  const definition = reference ? definitions.get(reference) : undefined;
  return definition ?? { type: 'solid' as const, color: value || '#cccccc' };
};

const stroke = (element: Element, markers?: ReadonlyMap<string, ArrowheadStyle>): StrokeStyle | null => {
  const color = element.getAttribute('stroke');
  if (!color || color === 'none') return null;
  const align = element.getAttribute('data-vectoria-stroke-align');
  const strokeAlign: StrokeStyle['align'] = align === 'inside' || align === 'outside' ? align : 'center';
  const base: StrokeStyle = { ...defaultStroke, color, width: Math.max(0.01, number(element, 'stroke-width', 1)), align: strokeAlign };
  if (!markers) return base;
  const resolveMarker = (attributeName: string): ArrowheadStyle | undefined => {
    const reference = element.getAttribute(attributeName)?.match(/^url\(#(.+)\)$/)?.[1];
    return reference ? markers.get(reference) : undefined;
  };
  const markerStart = resolveMarker('marker-start');
  const markerEnd = resolveMarker('marker-end');
  return markerStart || markerEnd ? { ...base, markerStart, markerEnd } : base;
};

const styleFor = (element: Element, definitions: ReadonlyMap<string, import('@vectoria/core').FillStyle>) => ({ ...defaultObjectStyle, fill: fill(element, definitions), stroke: stroke(element), opacity: Math.max(0, Math.min(1, number(element, 'opacity', 1))) });

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
  const definitions = new Map<string, import('@vectoria/core').FillStyle>();
  for (const gradient of Array.from(root.querySelectorAll('linearGradient, radialGradient'))) {
    const stops = Array.from(gradient.querySelectorAll('stop')).map((stop) => ({ id: generateId(), offset: Math.max(0, Math.min(1, Number.parseFloat(stop.getAttribute('offset') ?? '0'))), color: stop.getAttribute('stop-color') ?? '#000000', opacity: Math.max(0, Math.min(1, number(stop, 'stop-opacity', 1))) }));
    if (stops.length < 2) continue;
    const id = gradient.getAttribute('id');
    if (!id) continue;
    definitions.set(id, gradient.nodeName.toLowerCase() === 'radialgradient' ? { type: 'radial-gradient', center: { x: number(gradient, 'cx'), y: number(gradient, 'cy') }, radius: Math.max(0.01, number(gradient, 'r', 1)), stops } : { type: 'linear-gradient', start: { x: number(gradient, 'x1'), y: number(gradient, 'y1') }, end: { x: number(gradient, 'x2', 1), y: number(gradient, 'y2') }, stops });
  }
  for (const pattern of Array.from(root.querySelectorAll('pattern'))) {
    const id = pattern.getAttribute('id');
    const background = pattern.querySelector('rect')?.getAttribute('fill');
    const foreground = pattern.querySelector('circle')?.getAttribute('fill') ?? pattern.querySelector('path')?.getAttribute('stroke');
    if (id && background && foreground) definitions.set(id, { type: 'pattern', kind: pattern.querySelector('circle') ? 'dots' : pattern.querySelector('path')?.getAttribute('d')?.includes('H') ? 'grid' : 'hatch', foreground, background, size: Math.max(2, number(pattern, 'width', 12)) });
  }
  const elements = Array.from(root.querySelectorAll('rect, ellipse, circle, line, polygon, polyline, path, text')).filter((element) => !element.closest('defs'));
  // Arrowhead markers: type inferred from the child shape, size from markerWidth/2.
  const markers = new Map<string, ArrowheadStyle>();
  for (const marker of Array.from(root.querySelectorAll('marker'))) {
    const id = marker.getAttribute('id');
    if (!id) continue;
    const child = marker.querySelector('path, rect, circle, polygon');
    if (!child) continue;
    const childTag = child.nodeName.toLowerCase();
    const size = Math.max(1, number(marker, 'markerWidth', 10) / 2);
    const type: ArrowheadStyle['type'] = childTag === 'circle' ? 'circle' : childTag === 'rect' ? 'square' : / Z\s*$/i.test(child.getAttribute('d') ?? '') && (child.getAttribute('d') ?? '').match(/L/g)?.length === 2 ? 'triangle' : 'arrow';
    markers.set(id, { type, size });
  }
  for (const element of elements) {
    const id = generateId();
    const base = { id, name: element.getAttribute('id') || `${element.nodeName} ${objectIds.length + 1}`, layerId, visible: true, locked: false, style: styleFor(element, definitions) };
    const tag = element.nodeName.toLowerCase();
    let object: SceneObject | null = null;
    if (tag === 'rect') object = { ...base, type: 'rectangle', transform: createTransform({ x: number(element, 'x'), y: number(element, 'y') }), width: Math.max(0.01, number(element, 'width', 1)), height: Math.max(0.01, number(element, 'height', 1)), cornerRadius: Math.max(0, number(element, 'rx')) };
    if (tag === 'ellipse') object = { ...base, type: 'ellipse', transform: createTransform({ x: number(element, 'cx') - number(element, 'rx', 1), y: number(element, 'cy') - number(element, 'ry', 1) }), width: Math.max(0.01, number(element, 'rx', 1) * 2), height: Math.max(0.01, number(element, 'ry', 1) * 2) };
    if (tag === 'circle') { const r = Math.max(0.01, number(element, 'r', 1)); object = { ...base, type: 'ellipse', transform: createTransform({ x: number(element, 'cx') - r, y: number(element, 'cy') - r }), width: r * 2, height: r * 2 }; }
    if (tag === 'line') object = { ...base, type: 'line', transform: createTransform({ x: number(element, 'x1'), y: number(element, 'y1') }), endPoint: { x: number(element, 'x2') - number(element, 'x1'), y: number(element, 'y2') - number(element, 'y1') }, style: { ...styleFor(element, definitions), fill: { type: 'none' }, stroke: stroke(element, markers) ?? defaultStroke } };
    if (tag === 'polyline') {
      const points = parsePointsData(element.getAttribute('points') || '');
      if (points.length >= 2) {
        const origin = points[0]!;
        object = { ...base, type: 'polyline', transform: createTransform(origin), points: points.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y })), style: { ...styleFor(element, definitions), fill: { type: 'none' }, stroke: stroke(element, markers) ?? defaultStroke } };
      }
    }
    if (tag === 'polygon') {
      const points = parsePointsData(element.getAttribute('points') || '');
      if (points.length >= 3) {
        const nodes = points.map((point, index) => ({ id: `${id}-node-${index + 1}`, point, inHandle: null, outHandle: null, kind: 'corner' as const }));
        object = { ...base, type: 'path', transform: createTransform({ x: 0, y: 0 }), nodes, closed: true };
      }
    }
    if (tag === 'path') { const data = element.getAttribute('d') || ''; const nodes = parsePathData(data).map((node, index) => ({ ...node, id: `${id}-node-${index + 1}` })); if (nodes.length >= 2) object = { ...base, type: 'path', transform: createTransform({ x: 0, y: 0 }), nodes, closed: /z\s*$/i.test(data) }; }
    if (tag === 'text') {
      const textContent = element.textContent || '';
      const textPath = element.querySelector('textPath');
      const pathHref = textPath?.getAttribute('href') || textPath?.getAttribute('xlink:href');
      const pathId = pathHref ? pathHref.replace(/^#/, '') : undefined;
      const actualText = textPath ? (textPath.textContent || '') : textContent;
      const x = number(element, 'x', 0);
      const y = number(element, 'y', 0);
      const fontSize = number(element, 'font-size', 16);
      const fontFamily = element.getAttribute('font-family') || 'Inter, sans-serif';
      const fontWeight = element.getAttribute('font-weight') || 400;
      const fontStyle = element.getAttribute('font-style') || 'normal';
      const letterSpacing = number(element, 'letter-spacing', 0);
      const parsedWeight = Number(fontWeight);
      const validWeight: import('@vectoria/core').FontWeight = Number.isFinite(parsedWeight)
        ? (parsedWeight as import('@vectoria/core').FontWeight)
        : (fontWeight === 'bold' || fontWeight === 'bolder' || fontWeight === 'lighter' ? fontWeight : 400);

      object = {
        ...base,
        type: 'text',
        transform: createTransform({ x, y }),
        text: actualText.trim(),
        fontFamily,
        fontSize,
        fontWeight: validWeight,
        fontStyle: fontStyle === 'italic' || fontStyle === 'oblique' ? fontStyle : 'normal',
        letterSpacing,
        lineHeight: 1.2,
        textAlign: 'left',
        kerning: true,
        pathId,
      };
    }
    if (object) {
      objects[id] = object;
      objectIds.push(id);
    }
  }

  // Clip paths and masks become MaskGroups: the first shape inside the def is
  // the mask geometry, elements referencing it via clip-path/mask are content.
  const defShapes = Array.from(root.querySelectorAll('clipPath, mask')).filter((def) => !def.closest('clipPath, mask'));
  const referenced = new Map<string, string[]>();
  for (const element of elements) {
    for (const attributeName of ['clip-path', 'mask']) {
      const reference = element.getAttribute(attributeName)?.match(/^url\(#(.+)\)$/)?.[1];
      if (reference) referenced.set(reference, [...(referenced.get(reference) ?? []), element.getAttribute('id') ?? '']);
    }
  }
  const importedMasks: import('@vectoria/core').MaskGroup[] = [];
  for (const def of defShapes) {
    const defId = def.getAttribute('id');
    if (!defId) continue;
    const memberNames = new Set(referenced.get(defId) ?? []);
    if (memberNames.size === 0) continue;
    const firstShape = def.querySelector('path, rect, circle, ellipse, polygon');
    if (!firstShape) continue;
    const points = parseDefShapeGeometry(firstShape);
    if (!points || points.length < 3) continue;
    const maskNodeId = generateId();
    objects[maskNodeId] = {
      id: maskNodeId,
      name: `${def.nodeName} ${objectIds.length + 1}`,
      layerId,
      visible: true,
      locked: false,
      type: 'path',
      transform: createTransform({ x: 0, y: 0 }),
      nodes: points.map((point, index) => ({ id: `${maskNodeId}-node-${index + 1}`, point, inHandle: null, outHandle: null, kind: 'corner' as const })),
      closed: true,
      style: { ...defaultObjectStyle, fill: { type: 'none' }, stroke: defaultStroke },
    };
    objectIds.push(maskNodeId);
    const isAlpha = def.nodeName.toLowerCase() === 'mask' && (def.getAttribute('style') ?? '').includes('alpha');
    importedMasks.push({
      id: generateId(),
      mode: def.nodeName.toLowerCase() === 'clippath' ? 'clip' : 'opacity',
      maskId: maskNodeId,
      contentIds: objectIds.filter((id) => id !== maskNodeId && memberNames.has(objects[id]?.name ?? '')),
      ...(isAlpha ? { opacityMode: 'alpha' as const } : {}),
    });
  }
  const usableMasks = importedMasks.filter((group) => group.contentIds.length > 0);
  const maskMap = Object.fromEntries(usableMasks.map((group) => [group.id, group]));

  return { ...doc, objects, layers: { ...doc.layers, [layerId]: { ...doc.layers[layerId]!, objectIds } }, ...(usableMasks.length > 0 ? { maskGroups: maskMap } : {}), updatedAt: new Date().toISOString() };
}

/** Minimal geometry reader for shapes nested inside clipPath/mask defs. */
function parseDefShapeGeometry(element: Element): { x: number; y: number }[] | null {
  const tag = element.nodeName.toLowerCase();
  if (tag === 'circle') {
    const cx = number(element, 'cx');
    const cy = number(element, 'cy');
    const r = Math.max(0.01, number(element, 'r', 1));
    return Array.from({ length: 24 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 24;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
  }
  if (tag === 'ellipse') {
    const cx = number(element, 'cx');
    const cy = number(element, 'cy');
    const rx = Math.max(0.01, number(element, 'rx', 1));
    const ry = Math.max(0.01, number(element, 'ry', 1));
    return Array.from({ length: 24 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 24;
      return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
    });
  }
  if (tag === 'rect') {
    const x = number(element, 'x');
    const y = number(element, 'y');
    const width = Math.max(0.01, number(element, 'width', 1));
    const height = Math.max(0.01, number(element, 'height', 1));
    return [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }];
  }
  if (tag === 'polygon' || tag === 'polyline') return parsePointsData(element.getAttribute('points') || '');
  if (tag === 'path') return parsePathData(element.getAttribute('d') || '').map((node) => node.point);
  return null;
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
