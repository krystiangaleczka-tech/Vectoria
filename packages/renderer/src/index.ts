import type { Camera } from '@vectoria/editor-engine';
import type { Vec2 } from '@vectoria/shared';
import type { DocumentModel, Artboard, RectangleObject, EllipseObject, LineObject, PathObject, ObjectId, Transform2D, LinearGradientFill, RadialGradientFill, AngularGradientFill, PatternFill, GeometryPreview, SceneObject } from '@vectoria/core';
import { getTransformMatrix, getObjectBounds, rectsIntersect, normalizeCornerRadii, flattenPath, widthAtT } from '@vectoria/core';
import { mat3TransformPoint } from '@vectoria/shared';
export interface GridSettings { visible: boolean; size: number; subdivisions: number }

// ─── Theme color cache (avoids per-frame getComputedStyle calls) ─────────────

const themeColorCache = new Map<string, string>();
let themeCacheGeneration = -1;

function themeColor(varName: string, fallback: string): string {
  // Invalidate cache when the stylesheet generation changes (theme switch).
  const root = document.documentElement;
  const generation = (root as unknown as { __themeGen?: number }).__themeGen ?? 0;
  if (generation !== themeCacheGeneration) {
    themeColorCache.clear();
    themeCacheGeneration = generation;
  }
  let value = themeColorCache.get(varName);
  if (value === undefined) {
    value = getComputedStyle(root).getPropertyValue(varName).trim() || fallback;
    themeColorCache.set(varName, value);
  }
  return value;
}

interface Line { start: Vec2; end: Vec2 }
function getGridLines(rect: { x: number; y: number; width: number; height: number }, settings: GridSettings): { major: Line[]; minor: Line[] } {
  const size = Number.isFinite(settings.size) && settings.size > 0 ? settings.size : 10;
  const subdivisions = Number.isInteger(settings.subdivisions) && settings.subdivisions >= 1 ? settings.subdivisions : 1;
  const spacing = size / subdivisions;
  const major: Line[] = [];
  const minor: Line[] = [];
  for (let x = Math.floor(rect.x / spacing) * spacing; x <= rect.x + rect.width; x += spacing) (Math.abs(x / size - Math.round(x / size)) < 1e-8 ? major : minor).push({ start: { x, y: rect.y }, end: { x, y: rect.y + rect.height } });
  for (let y = Math.floor(rect.y / spacing) * spacing; y <= rect.y + rect.height; y += spacing) (Math.abs(y / size - Math.round(y / size)) < 1e-8 ? major : minor).push({ start: { x: rect.x, y }, end: { x: rect.x + rect.width, y } });
  return { major, minor };
}

// ─── Render Loop ──────────────────────────────────────────────────────────────

export class RenderLoop {
  private rafId: number | null = null;
  private started = false;

  constructor(private readonly renderFn: () => void) {}

  /** Mark the scene as needing a re-render. */
  invalidate(): void {
    if (!this.started || this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.renderFn();
    });
  }

  /** Start the render loop. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.invalidate();
  }

  /** Stop the render loop. */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.started = false;
  }
}

// ─── Canvas Setup ─────────────────────────────────────────────────────────────

export interface CanvasLayers {
  background: HTMLCanvasElement;
  scene: HTMLCanvasElement;
  overlay: HTMLCanvasElement;
}

/**
 * Resize a canvas element to match its CSS size at the device pixel ratio.
 * Returns true if the size actually changed.
 */
export function resizeCanvas(canvas: HTMLCanvasElement): boolean {
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = Math.floor(canvas.clientWidth * dpr);
  const displayHeight = Math.floor(canvas.clientHeight * dpr);

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    return true;
  }
  return false;
}

// ─── Background Renderer ──────────────────────────────────────────────────────

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  artboard: Artboard,
  canvasWidth: number,
  canvasHeight: number,
  options?: { showGrid?: boolean; grid?: GridSettings },
): void {
  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Workspace background
  ctx.fillStyle = themeColor('--color-workspace', '#20201e');
  ctx.fillRect(0, 0, canvasWidth / dpr, canvasHeight / dpr);

  // Presentation-only workspace grid. It is drawn before the artboard and is
  // never part of the document scene or SVG export.
  if (options?.showGrid !== false) {
    const gridColor = themeColor('--color-workspace-grid', 'rgba(255, 255, 255, 0.035)');
    const visible = camera.getVisibleWorldRect({ x: canvasWidth / dpr, y: canvasHeight / dpr });
    const lines = getGridLines(visible, options?.grid ?? { visible: true, size: 10, subdivisions: 1 });
    const drawLines = (groups: Line[], alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const line of groups) {
        const start = camera.worldToScreen(line.start);
        const end = camera.worldToScreen(line.end);
        ctx.moveTo(Math.round(start.x) + 0.5, Math.round(start.y) + 0.5);
        ctx.lineTo(Math.round(end.x) + 0.5, Math.round(end.y) + 0.5);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    if (options?.grid?.visible !== false) {
      drawLines(lines.minor, 0.12);
      drawLines(lines.major, 0.24);
    }
  }

  // Artboard shadow
  const screenPos = camera.worldToScreen({ x: artboard.x, y: artboard.y });
  const screenW = artboard.width * camera.zoom;
  const screenH = artboard.height * camera.zoom;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.32)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  // Artboard fill
  const background = artboard.background;
  if (background.type === 'transparent') {
    const checker = 12;
    const left = Math.max(0, screenPos.x);
    const top = Math.max(0, screenPos.y);
    const right = Math.min(canvasWidth / dpr, screenPos.x + screenW);
    const bottom = Math.min(canvasHeight / dpr, screenPos.y + screenH);
    const checkerLight = themeColor('--color-artboard', '#ffffff');
    const checkerDark = themeColor('--color-workspace-deep', '#d8d8d2');
    if (right > left && bottom > top) {
      ctx.fillStyle = checkerLight;
      ctx.fillRect(left, top, right - left, bottom - top);
    }
    ctx.fillStyle = checkerDark;
    const startX = Math.floor((left - screenPos.x) / checker) * checker;
    const startY = Math.floor((top - screenPos.y) / checker) * checker;
    for (let y = startY; screenPos.y + y < bottom; y += checker) for (let x = startX; screenPos.x + x < right; x += checker) {
      if ((Math.floor(x / checker) + Math.floor(y / checker)) % 2 === 0) ctx.fillRect(Math.max(left, screenPos.x + x), Math.max(top, screenPos.y + y), Math.min(checker, right - screenPos.x - x), Math.min(checker, bottom - screenPos.y - y));
    }
  } else {
    ctx.fillStyle = background.color;
    ctx.fillRect(screenPos.x, screenPos.y, screenW, screenH);
  }

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Artboard border
  ctx.strokeStyle = themeColor('--color-border-subtle', '#33332f');
  ctx.lineWidth = 1;
  ctx.strokeRect(screenPos.x, screenPos.y, screenW, screenH);

  ctx.restore();
}

// ─── Scene Renderer ───────────────────────────────────────────────────────────

export function renderScene(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  doc: DocumentModel,
  canvasWidth: number,
  canvasHeight: number,
  options?: {
    previewTransforms?: Record<string, import('@vectoria/core').Transform2D>;
    showGrid?: boolean;
  }
): void {
  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasWidth / dpr, canvasHeight / dpr);

  // Apply camera transform
  ctx.translate(camera.pan.x, camera.pan.y);
  ctx.scale(camera.zoom, camera.zoom);

  // Clip to active artboard
  const artboard = doc.artboards[doc.activeArtboardId];
  if (artboard && artboard.visible !== false) {
    ctx.beginPath();
    ctx.rect(artboard.x, artboard.y, artboard.width, artboard.height);
    ctx.clip();
  }

  const visibleWorldRect = camera.getVisibleWorldRect({
    x: canvasWidth / dpr,
    y: canvasHeight / dpr,
  });

  // Render objects in z-order
  for (const layerId of doc.layerIds) {
    const layer = doc.layers[layerId];
    if (!layer?.visible || layer.opacity === 0) continue;

    for (const objectId of layer.objectIds) {
      let obj = doc.objects[objectId];
      if (!obj?.visible) continue;

      if (options?.previewTransforms?.[objectId]) {
        obj = { ...obj, transform: options.previewTransforms[objectId]! };
      }
      if (layer.opacity !== 1) {
        obj = { ...obj, style: { ...obj.style, opacity: obj.style.opacity * layer.opacity } };
      }

      if (!rectsIntersect(getObjectBounds(obj), visibleWorldRect)) continue;

      ctx.globalCompositeOperation = obj.style.blendMode === 'normal' || obj.style.blendMode === undefined ? 'source-over' : obj.style.blendMode;

      switch (obj.type) {
        case 'rectangle':
          renderRectangle(ctx, obj as RectangleObject);
          break;
        case 'ellipse':
          renderEllipse(ctx, obj as EllipseObject);
          break;
        case 'line':
          renderLine(ctx, obj as LineObject);
          break;
         case 'path':
           renderPath(ctx, obj as PathObject);
          break;
      }
    }
  }

  ctx.restore();
}


/**
 * Build a Canvas CanvasGradient from a LinearGradientFill.
 * Coordinates are in the object's local space (before transform).
 */
function buildLinearGradient(
  ctx: CanvasRenderingContext2D,
  fill: LinearGradientFill,
): CanvasGradient {
  const grad = ctx.createLinearGradient(fill.start.x, fill.start.y, fill.end.x, fill.end.y);
  for (const stop of fill.stops) {
    // Parse hex color and apply stop opacity via rgba
    const r = parseInt(stop.color.slice(1, 3), 16);
    const g = parseInt(stop.color.slice(3, 5), 16);
    const b = parseInt(stop.color.slice(5, 7), 16);
    grad.addColorStop(stop.offset, `rgba(${r}, ${g}, ${b}, ${stop.opacity})`);
  }
  return grad;
}

function buildRadialGradient(ctx: CanvasRenderingContext2D, fill: RadialGradientFill): CanvasGradient {
  const gradient = ctx.createRadialGradient(fill.center.x, fill.center.y, 0, fill.center.x, fill.center.y, fill.radius);
  for (const stop of fill.stops) gradient.addColorStop(stop.offset, `rgba(${parseInt(stop.color.slice(1, 3), 16)}, ${parseInt(stop.color.slice(3, 5), 16)}, ${parseInt(stop.color.slice(5, 7), 16)}, ${stop.opacity})`);
  return gradient;
}

function buildAngularGradient(ctx: CanvasRenderingContext2D, fill: AngularGradientFill): CanvasGradient | string {
  const context = ctx as unknown as { createConicGradient?: (angle: number, x: number, y: number) => CanvasGradient };
  const gradient = context.createConicGradient?.(fill.angle, fill.center.x, fill.center.y);
  if (!gradient) return fill.stops[0]?.color ?? 'transparent';
  for (const stop of fill.stops) gradient.addColorStop(stop.offset, `rgba(${parseInt(stop.color.slice(1, 3), 16)}, ${parseInt(stop.color.slice(3, 5), 16)}, ${parseInt(stop.color.slice(5, 7), 16)}, ${stop.opacity})`);
  return gradient;
}

function buildPattern(ctx: CanvasRenderingContext2D, fill: PatternFill): CanvasPattern | string {
  const size = Math.max(2, fill.size);
  const tile = document.createElement('canvas'); tile.width = size; tile.height = size;
  const tileCtx = tile.getContext('2d');
  if (!tileCtx) return fill.background;
  tileCtx.fillStyle = fill.background; tileCtx.fillRect(0, 0, size, size); tileCtx.strokeStyle = fill.foreground; tileCtx.fillStyle = fill.foreground; tileCtx.lineWidth = Math.max(1, size / 8);
  if (fill.kind === 'dots') {
    tileCtx.beginPath();
    tileCtx.arc(size / 2, size / 2, size / 6, 0, Math.PI * 2);
    tileCtx.fill();
  }
  if (fill.kind === 'grid') tileCtx.strokeRect(0, 0, size, size);
  if (fill.kind === 'hatch') {
    tileCtx.beginPath();
    tileCtx.moveTo(0, size);
    tileCtx.lineTo(size, 0);
    tileCtx.stroke();
  }
  return ctx.createPattern(tile, 'repeat') ?? fill.background;
}

/** Resolve fill style to a Canvas fill style (color string or gradient). */
function resolveFill(
  ctx: CanvasRenderingContext2D,
  fill: import('@vectoria/core').FillStyle,
): string | CanvasGradient | CanvasPattern {
  if (fill.type === 'solid') return fill.color;
  if (fill.type === 'linear-gradient') return buildLinearGradient(ctx, fill);
  if (fill.type === 'radial-gradient') return buildRadialGradient(ctx, fill);
  if (fill.type === 'angular-gradient') return buildAngularGradient(ctx, fill);
  if (fill.type === 'pattern') return buildPattern(ctx, fill);
  return 'transparent'; // 'none'
}

function renderRectangle(
  ctx: CanvasRenderingContext2D,
  obj: RectangleObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
  ctx.globalAlpha = obj.style.opacity;
  const radii = normalizeCornerRadii(obj.cornerRadius, obj.width, obj.height);
  const hasRoundedCorners = radii.topLeft > 0 || radii.topRight > 0 || radii.bottomRight > 0 || radii.bottomLeft > 0;

  // Fill
  if (obj.style.fill.type !== 'none') {
    ctx.fillStyle = resolveFill(ctx, obj.style.fill);
    if (hasRoundedCorners) {
      roundRect(ctx, 0, 0, obj.width, obj.height, radii);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, obj.width, obj.height);
    }
  }

  // Stroke
  if (obj.style.stroke) {
    ctx.strokeStyle = obj.style.stroke.color;
    ctx.lineWidth = obj.style.stroke.width;
    ctx.lineCap = obj.style.stroke.lineCap;
    ctx.lineJoin = obj.style.stroke.lineJoin;
    ctx.miterLimit = obj.style.stroke.miterLimit;
    if (obj.style.stroke.dashArray.length > 0) {
      ctx.setLineDash([...obj.style.stroke.dashArray]);
    }
    ctx.globalAlpha = obj.style.opacity * obj.style.stroke.opacity;

    if (hasRoundedCorners) {
      roundRect(ctx, 0, 0, obj.width, obj.height, radii);
      ctx.stroke();
    } else {
      ctx.strokeRect(0, 0, obj.width, obj.height);
    }
  }

  ctx.restore();
}

function renderEllipse(
  ctx: CanvasRenderingContext2D,
  obj: EllipseObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
  ctx.globalAlpha = obj.style.opacity;

  const rx = obj.width / 2;
  const ry = obj.height / 2;

  // Fill
  if (obj.style.fill.type !== 'none') {
    ctx.fillStyle = resolveFill(ctx, obj.style.fill);
    ctx.beginPath();
    ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stroke
  if (obj.style.stroke) {
    ctx.strokeStyle = obj.style.stroke.color;
    ctx.lineWidth = obj.style.stroke.width;
    ctx.lineCap = obj.style.stroke.lineCap;
    ctx.lineJoin = obj.style.stroke.lineJoin;
    ctx.miterLimit = obj.style.stroke.miterLimit;
    if (obj.style.stroke.dashArray.length > 0) {
      ctx.setLineDash([...obj.style.stroke.dashArray]);
    }
    ctx.globalAlpha = obj.style.opacity * obj.style.stroke.opacity;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function renderLine(
  ctx: CanvasRenderingContext2D,
  obj: LineObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);

  if (obj.style.stroke) {
    ctx.strokeStyle = obj.style.stroke.color;
    ctx.lineWidth = obj.style.stroke.width;
    ctx.lineCap = obj.style.stroke.lineCap;
    ctx.lineJoin = obj.style.stroke.lineJoin;
    ctx.miterLimit = obj.style.stroke.miterLimit;
    if (obj.style.stroke.dashArray.length > 0) {
      ctx.setLineDash([...obj.style.stroke.dashArray]);
    }
    ctx.globalAlpha = obj.style.opacity * obj.style.stroke.opacity;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(obj.endPoint.x, obj.endPoint.y);
    ctx.stroke();
  }

  ctx.restore();
}

function renderPath(
  ctx: CanvasRenderingContext2D,
  obj: PathObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
  ctx.globalAlpha = obj.style.opacity;

  ctx.beginPath();
  const drawSubpath = (nodes: PathObject['nodes']): void => {
    nodes.forEach((node, i) => {
    if (i === 0) {
      ctx.moveTo(node.point.x, node.point.y);
      return;
    }
    const prev = obj.nodes[i - 1]!;
    const cp1 = prev.outHandle ?? prev.point;
    const cp2 = node.inHandle ?? node.point;
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, node.point.x, node.point.y);
    });
    if (obj.closed && nodes.length > 1) {
    const last = nodes[nodes.length - 1]!;
    const first = nodes[0]!;
    ctx.bezierCurveTo(
      last.outHandle?.x ?? last.point.x,
      last.outHandle?.y ?? last.point.y,
      first.inHandle?.x ?? first.point.x,
      first.inHandle?.y ?? first.point.y,
      first.point.x,
      first.point.y,
    );
    ctx.closePath();
    }
  };
  drawSubpath(obj.nodes);
  obj.compoundChildren?.forEach((nodes) => drawSubpath(nodes));

  if (obj.style.fill.type !== 'none' && obj.closed) {
    ctx.fillStyle = resolveFill(ctx, obj.style.fill);
    ctx.fill(obj.fillRule ?? 'nonzero');
  }
  if (obj.style.stroke) {
    ctx.strokeStyle = obj.style.stroke.color;
    ctx.lineWidth = obj.style.stroke.width;
    ctx.lineCap = obj.style.stroke.lineCap;
    ctx.lineJoin = obj.style.stroke.lineJoin;
    ctx.miterLimit = obj.style.stroke.miterLimit;
    if (obj.style.stroke.dashArray.length > 0) {
      ctx.setLineDash([...obj.style.stroke.dashArray]);
    }
    ctx.globalAlpha = obj.style.opacity * obj.style.stroke.opacity;
    if (obj.widthProfile && obj.widthProfile.length > 1 && !obj.closed) renderVariableWidthStroke(ctx, obj);
    else ctx.stroke();
  }

  ctx.restore();
}

function renderVariableWidthStroke(ctx: CanvasRenderingContext2D, obj: PathObject): void {
  const points = flattenPath(obj);
  if (points.length < 2 || !obj.style.stroke) return;
  const profile = obj.widthProfile ?? [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const t = index / Math.max(1, points.length - 2);
    const start = points[index]!;
    const end = points[index + 1]!;
    ctx.lineWidth = widthAtT(profile, t);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  radii: ReturnType<typeof normalizeCornerRadii>,
): void {
  const { topLeft, topRight, bottomRight, bottomLeft } = radii;
  ctx.beginPath();
  ctx.moveTo(x + topLeft, y);
  ctx.lineTo(x + w - topRight, y);
  ctx.arcTo(x + w, y, x + w, y + topRight, topRight);
  ctx.lineTo(x + w, y + h - bottomRight);
  ctx.arcTo(x + w, y + h, x + w - bottomRight, y + h, bottomRight);
  ctx.lineTo(x + bottomLeft, y + h);
  ctx.arcTo(x, y + h, x, y + h - bottomLeft, bottomLeft);
  ctx.lineTo(x, y + topLeft);
  ctx.arcTo(x, y, x + topLeft, y, topLeft);
  ctx.closePath();
}

// ─── Overlay Renderer ─────────────────────────────────────────────────────────

export function renderOverlay(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  doc: DocumentModel,
  selectedIds: ReadonlySet<string>,
  canvasWidth: number,
  canvasHeight: number,
  options?: {
    previewTransforms?: ReadonlyMap<ObjectId, Transform2D>;
    pathPreviews?: ReadonlyMap<ObjectId, PathObject['nodes']>;
    nodeSelectionIds?: readonly string[];
    marquee?: { start: Vec2; end: Vec2 };
    geometryPreview?: GeometryPreview;
  },
): void {
  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasWidth / dpr, canvasHeight / dpr);

  if (options?.marquee) {
    const start = camera.worldToScreen(options.marquee.start);
    const end = camera.worldToScreen(options.marquee.end);
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    ctx.fillStyle = themeColor('--color-selection-fill', 'rgba(92, 174, 255, 0.13)');
    ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.fillRect(x, y, Math.abs(end.x - start.x), Math.abs(end.y - start.y));
    ctx.strokeRect(x + 0.5, y + 0.5, Math.abs(end.x - start.x), Math.abs(end.y - start.y));
    ctx.setLineDash([]);
  }

  if (options?.geometryPreview) {
    renderGeometryPreview(ctx, camera, options.geometryPreview);
  }

  if (selectedIds.size === 0) {
    ctx.restore();
    return;
  }

  if (selectedIds.size > 1) {
    const bounds = [...selectedIds].map((id) => doc.objects[id]).filter(Boolean).map((object) => getObjectBounds(object!));
    if (bounds.length > 0) {
      const minX = Math.min(...bounds.map((bound) => bound.x));
      const minY = Math.min(...bounds.map((bound) => bound.y));
      const maxX = Math.max(...bounds.map((bound) => bound.x + bound.width));
      const maxY = Math.max(...bounds.map((bound) => bound.y + bound.height));
      const topLeft = camera.worldToScreen({ x: minX, y: minY });
      const bottomRight = camera.worldToScreen({ x: maxX, y: maxY });
      ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
      ctx.fillStyle = themeColor('--color-selection-fill', 'rgba(92, 174, 255, 0.13)');
      ctx.lineWidth = 1.5;
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ctx.strokeRect(topLeft.x + 0.5, topLeft.y + 0.5, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      drawScreenHandles(ctx, camera, [topLeft, { x: bottomRight.x, y: topLeft.y }, bottomRight, { x: topLeft.x, y: bottomRight.y }]);
    }
  }

  if (options?.nodeSelectionIds && options.nodeSelectionIds.length > 0) {
    renderNodeSelection(ctx, camera, doc, options.nodeSelectionIds);
  }

  // Render selection outline for each selected object
  for (const objectId of selectedIds) {
    let obj = doc.objects[objectId];
    if (!obj?.visible) continue;

    // Apply preview transform if available
    if (options?.previewTransforms?.has(objectId)) {
      const previewTransform = options.previewTransforms.get(objectId)!;
      obj = { ...obj, transform: previewTransform };
    }

    switch (obj.type) {
      case 'rectangle':
        renderRectangleSelectionOutline(ctx, camera, obj as RectangleObject);
        break;
      case 'ellipse':
        renderEllipseSelectionOutline(ctx, camera, obj as EllipseObject);
        break;
      case 'line':
        renderLineSelectionOutline(ctx, camera, obj as LineObject);
        break;
      case 'path':
        renderPathSelectionOutline(ctx, camera, options?.pathPreviews?.get(objectId) ? { ...obj, nodes: options.pathPreviews.get(objectId)! } : obj as PathObject);
        break;
    }
  }

  ctx.restore();
}

function renderGeometryPreview(ctx: CanvasRenderingContext2D, camera: Camera, preview: GeometryPreview): void {
  const accent = themeColor('--color-accent', '#5caeff');
  const warning = themeColor('--color-warning', '#f0bd58');
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = preview.warnings.length > 0 ? warning : accent;
  ctx.lineWidth = 1.5;
  for (const object of preview.proposed) {
    renderPreviewObject(ctx, camera, object);
    const bound = getObjectBounds(object);
    const topLeft = camera.worldToScreen({ x: bound.x, y: bound.y });
    const bottomRight = camera.worldToScreen({ x: bound.x + bound.width, y: bound.y + bound.height });
    ctx.fillStyle = themeColor('--color-accent-subtle', 'rgba(92, 174, 255, .16)');
    ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    ctx.strokeRect(topLeft.x + 0.5, topLeft.y + 0.5, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  }
  ctx.setLineDash([]);
  const bounds = preview.proposed.map(getObjectBounds);
  if (bounds.length > 0) {
    const minX = Math.min(...bounds.map((bound) => bound.x));
    const minY = Math.min(...bounds.map((bound) => bound.y));
    const label = camera.worldToScreen({ x: minX, y: minY - 8 / camera.zoom });
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    ctx.fillStyle = preview.warnings.length > 0 ? warning : accent;
    ctx.font = '10px var(--font-mono)';
    ctx.fillText(`${preview.operation} preview`, label.x, label.y);
  }
  ctx.restore();
}

function renderPreviewObject(ctx: CanvasRenderingContext2D, camera: Camera, object: SceneObject): void {
  switch (object.type) {
    case 'rectangle':
      renderRectangleSelectionOutline(ctx, camera, object);
      break;
    case 'ellipse':
      renderEllipseSelectionOutline(ctx, camera, object);
      break;
    case 'line':
      renderLineSelectionOutline(ctx, camera, object);
      break;
    case 'path':
      renderPathSelectionOutline(ctx, camera, object);
      break;
  }
}

export interface FreehandOverlayOptions {
  readonly points?: readonly Vec2[];
  readonly strokeWidth?: number;
  readonly cutLine?: readonly Vec2[];
  readonly eraserCursor?: { point: Vec2; radiusPx: number };
  readonly widthPoints?: readonly { point: Vec2; width: number }[];
}

/** Draw transient drawing and destructive-tool feedback without touching scene canvas. */
export function renderFreehandOverlay(ctx: CanvasRenderingContext2D, camera: Camera, canvasWidth: number, canvasHeight: number, options: FreehandOverlayOptions): void {
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const drawWorldPolyline = (points: readonly Vec2[], color: string, width: number, dash: readonly number[] = []): void => {
    if (points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash([...dash]);
    ctx.beginPath();
    points.forEach((point, index) => {
      const screen = camera.worldToScreen(point);
      if (index === 0) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  };
  if (options.points && options.points.length > 0) drawWorldPolyline(options.points, themeColor('--color-accent', '#5caeff'), Math.max(1.5, (options.strokeWidth ?? 1) * camera.zoom), []);
  if (options.cutLine && options.cutLine.length > 1) drawWorldPolyline(options.cutLine, themeColor('--color-danger', '#f06a6a'), 1.5, [6, 4]);
  if (options.eraserCursor) {
    const center = camera.worldToScreen(options.eraserCursor.point);
    ctx.strokeStyle = themeColor('--color-danger', '#f06a6a');
    ctx.fillStyle = themeColor('--color-danger-subtle', 'rgba(240, 106, 106, .16)');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center.x, center.y, options.eraserCursor.radiusPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  for (const marker of options.widthPoints ?? []) {
    const center = camera.worldToScreen(marker.point);
    ctx.fillStyle = themeColor('--color-accent', '#5caeff');
    ctx.strokeStyle = themeColor('--color-node', '#ffffff');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  void canvasWidth;
  void canvasHeight;
}

function renderRectangleSelectionOutline(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  obj: RectangleObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();

  // Apply camera + object transform
  ctx.translate(camera.pan.x, camera.pan.y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);

  // Selection outline in screen space
  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.lineWidth = 1.5 / camera.zoom; // constant screen-space width
  ctx.setLineDash([]);

  ctx.strokeRect(0, 0, obj.width, obj.height);

  // Selection fill
  ctx.fillStyle = themeColor('--color-selection-fill', 'rgba(92, 174, 255, 0.13)');
  ctx.fillRect(0, 0, obj.width, obj.height);
  drawResizeHandles(ctx, camera, [{ x: 0, y: 0 }, { x: obj.width, y: 0 }, { x: obj.width, y: obj.height }, { x: 0, y: obj.height }]);
  drawRotationHandle(ctx, camera, obj.width / 2, 0);

  ctx.restore();
}

function renderEllipseSelectionOutline(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  obj: EllipseObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();

  ctx.translate(camera.pan.x, camera.pan.y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);

  const rx = obj.width / 2;
  const ry = obj.height / 2;

  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.lineWidth = 1.5 / camera.zoom;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  drawResizeHandles(ctx, camera, [{ x: 0, y: 0 }, { x: obj.width, y: 0 }, { x: obj.width, y: obj.height }, { x: 0, y: obj.height }]);
  drawRotationHandle(ctx, camera, obj.width / 2, 0);

  ctx.restore();
}

function renderLineSelectionOutline(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  obj: LineObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();

  ctx.translate(camera.pan.x, camera.pan.y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);

  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.lineWidth = 1.5 / camera.zoom;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(obj.endPoint.x, obj.endPoint.y);
  ctx.stroke();

  ctx.restore();
}

function renderPathSelectionOutline(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  obj: PathObject,
): void {
  const dpr = window.devicePixelRatio || 1;
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();

  ctx.translate(camera.pan.x, camera.pan.y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);

  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.lineWidth = 1.5 / camera.zoom;
  ctx.setLineDash([]);

  ctx.beginPath();
  obj.nodes.forEach((node, i) => {
    if (i === 0) {
      ctx.moveTo(node.point.x, node.point.y);
      return;
    }
    const prev = obj.nodes[i - 1]!;
    const cp1 = prev.outHandle ?? prev.point;
    const cp2 = node.inHandle ?? node.point;
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, node.point.x, node.point.y);
  });
  if (obj.closed && obj.nodes.length > 1) {
    const last = obj.nodes[obj.nodes.length - 1]!;
    const first = obj.nodes[0]!;
    ctx.bezierCurveTo(
      last.outHandle?.x ?? last.point.x,
      last.outHandle?.y ?? last.point.y,
      first.inHandle?.x ?? first.point.x,
      first.inHandle?.y ?? first.point.y,
      first.point.x,
      first.point.y,
    );
    ctx.closePath();
  }
  ctx.stroke();

  for (const node of obj.nodes) {
    const point = camera.worldToScreen(mat3TransformPoint(matrix, node.point));
    const size = 7;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = themeColor('--color-node', '#ffffff');
    ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
    ctx.lineWidth = 1;
    ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
    ctx.strokeRect(point.x - size / 2, point.y - size / 2, size, size);
    ctx.restore();
  }

  // Handles stay in screen space so their 6 px endpoints remain usable at any zoom.
  const handleColor = themeColor('--color-selection', '#5caeff');
  for (const node of obj.nodes) {
    const point = camera.worldToScreen(mat3TransformPoint(matrix, node.point));
    for (const handle of [node.inHandle, node.outHandle].filter((value): value is Vec2 => Boolean(value))) {
      const endpoint = camera.worldToScreen(mat3TransformPoint(matrix, handle));
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = handleColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(endpoint.x, endpoint.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = themeColor('--color-node', '#ffffff');
      ctx.beginPath();
      ctx.arc(endpoint.x, endpoint.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawResizeHandles(ctx: CanvasRenderingContext2D, camera: Camera, points: readonly { x: number; y: number }[]): void {
  const size = 8 / camera.zoom;
  ctx.fillStyle = themeColor('--color-node', '#ffffff');
  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.lineWidth = 1 / camera.zoom;
  for (const point of points) {
    ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
    ctx.strokeRect(point.x - size / 2, point.y - size / 2, size, size);
  }
}

function drawRotationHandle(ctx: CanvasRenderingContext2D, camera: Camera, x: number, y: number): void {
  const offset = 20 / camera.zoom;
  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.fillStyle = themeColor('--color-node', '#ffffff');
  ctx.lineWidth = 1 / camera.zoom;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - offset);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y - offset, 4 / camera.zoom, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawScreenHandles(ctx: CanvasRenderingContext2D, camera: Camera, points: readonly Vec2[]): void {
  const size = 8;
  ctx.fillStyle = themeColor('--color-node', '#ffffff');
  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.lineWidth = 1;
  for (const point of points) {
    ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
    ctx.strokeRect(point.x - size / 2, point.y - size / 2, size, size);
  }
  void camera;
}

function renderNodeSelection(ctx: CanvasRenderingContext2D, camera: Camera, doc: DocumentModel, nodeIds: readonly string[]): void {
  const selected = new Set(nodeIds);
  for (const object of Object.values(doc.objects)) {
    if (object.type !== 'path' || !object.visible) continue;
    const matrix = getTransformMatrix(object.transform);
    for (let index = 0; index < object.nodes.length; index += 1) {
      const node = object.nodes[index]!;
      const point = camera.worldToScreen(mat3TransformPoint(matrix, node.point));
      const selectedNode = selected.has(`${object.id}:${index}`);
      ctx.fillStyle = selectedNode
        ? themeColor('--color-node-selected', '#5caeff')
        : themeColor('--color-node', '#ffffff');
      ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
      ctx.lineWidth = 1;
      ctx.fillRect(point.x - 3.5, point.y - 3.5, 7, 7);
      ctx.strokeRect(point.x - 3.5, point.y - 3.5, 7, 7);
       if (selectedNode) {
         const handles = [node.inHandle, node.outHandle].filter((handle): handle is Vec2 => Boolean(handle));
         for (const handle of handles) {
           const endpoint = camera.worldToScreen(mat3TransformPoint(matrix, handle));
           ctx.globalAlpha = 0.7;
           ctx.beginPath(); ctx.moveTo(point.x, point.y); ctx.lineTo(endpoint.x, endpoint.y); ctx.stroke();
           ctx.globalAlpha = 1;
           ctx.fillStyle = themeColor('--color-node', '#ffffff');
           ctx.beginPath(); ctx.arc(endpoint.x, endpoint.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
         }
       }
    }
  }
}
