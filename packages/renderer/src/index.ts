import type { Camera } from '@vectoria/editor-engine';
import type { Vec2 } from '@vectoria/shared';
import type { DocumentModel, Artboard, RectangleObject, EllipseObject, LineObject, PathObject, ObjectId, Transform2D, LinearGradientFill, RadialGradientFill, AngularGradientFill, PatternFill, GeometryPreview, SceneObject, PolygonObject, StarObject, ArcObject, PieObject, RingObject, SpiralObject, CalloutObject, PolylineObject, StrokeStyle, ArrowheadStyle, FillStyle, TextObject, TextFrameObject, ImageObject, SymbolInstanceObject } from '@vectoria/core';
import type { SnapResult } from '@vectoria/editor-engine';
import { getTransformMatrix, getObjectBounds, rectsIntersect, normalizeCornerRadii, flattenPath, widthAtT, getPolygonVertices, getStarVertices, getSpiralVertices, getCalloutVertices, getArrowheadVertices, expandObject, computeArtisticTextLayout, computeTextFrameLayout, computeTextOnPathLayout, effectiveGeometry, hasGeometryEffects, buildCaligraphicOutline, samplePath, composeTransform2D, BLEND_MODES } from '@vectoria/core';
import { mat3TransformPoint } from '@vectoria/shared';
import { RenderMetrics } from './metrics.js';
import { drawObjectWithEffects, effectWorldMargin, repeatInstances, hasActiveRepeats, activeExtrude, buildMeshTile, meshAverageColor } from './effects.js';
export { RenderQualityPolicy, type RenderQuality } from './quality.js';
export { RenderMetrics, type RenderMetricsSnapshot } from './metrics.js';
export { FRAME_BUDGET_MS, INPUT_TO_RENDER_BUDGET_MS, evaluatePerformanceBudget, type PerformanceBudgetResult } from './performance.js';
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
  readonly metrics = new RenderMetrics();

  constructor(private readonly renderFn: () => void) {}

  /** Mark the scene as needing a re-render. */
  invalidate(): void {
    if (!this.started || this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      const startedAt = performance.now();
      this.renderFn();
      this.metrics.recordFrame(performance.now() - startedAt);
    });
  }

  markInput(timestamp = performance.now()): void { this.metrics.markInput(timestamp); }

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
  options?: { showGrid?: boolean; grid?: GridSettings; guides?: readonly import('@vectoria/core').Guide[] },
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

  for (const guide of options?.guides ?? []) {
    if (!guide.visible) continue;
    ctx.strokeStyle = themeColor('--color-guide', '#52cdf6');
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (guide.axis === 'vertical') {
      const x = camera.worldToScreen({ x: guide.position, y: 0 }).x;
      ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, canvasHeight / dpr);
    } else {
      const y = camera.worldToScreen({ x: 0, y: guide.position }).y;
      ctx.moveTo(0, y + 0.5); ctx.lineTo(canvasWidth / dpr, y + 0.5);
    }
    ctx.stroke();
  }

  // Artboard bounds
  const screenPos = camera.worldToScreen({ x: artboard.x, y: artboard.y });
  const screenW = artboard.width * camera.zoom;
  const screenH = artboard.height * camera.zoom;

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
    previewStyles?: Record<string, import('@vectoria/core').ObjectStyle>;
    previewTexts?: Record<string, string>;
    showGrid?: boolean;
    quality?: import('./quality.js').RenderQuality;
    outlineMode?: boolean;
    soloLayerId?: string | null;
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

  // Masked content renders through offscreen compositing below; the mask shape
  // itself is only drawn as the clip/alpha source, never as a plain object.
  const masks = Object.values(doc.maskGroups ?? {});
  const maskedIds = new Set<ObjectId>();
  for (const group of masks) {
    maskedIds.add(group.maskId);
    for (const id of group.contentIds) maskedIds.add(id);
  }

  // Render objects in z-order
  for (const layerId of doc.layerIds) {
    if (options?.soloLayerId && layerId !== options.soloLayerId) continue;
    const layer = doc.layers[layerId];
    if (!layer?.visible || layer.opacity === 0) continue;

    const layerOpacity = layer.isTemplate ? (layer.opacity ?? 1) * 0.5 : layer.opacity;

    for (const objectId of layer.objectIds) {
      let obj = doc.objects[objectId];
      if (!obj?.visible) continue;
      if (maskedIds.has(objectId)) continue;

      if (options?.previewTransforms?.[objectId]) {
        obj = { ...obj, transform: options.previewTransforms[objectId]! };
      }
      if (options?.previewStyles?.[objectId]) {
        obj = { ...obj, style: options.previewStyles[objectId]! };
      }
      if (options?.previewTexts?.[objectId] !== undefined && (obj.type === 'text' || obj.type === 'text-frame')) {
        obj = { ...obj, text: options.previewTexts[objectId]! };
      }
      if (layerOpacity !== 1) {
        obj = { ...obj, style: { ...obj.style, opacity: obj.style.opacity * layerOpacity } };
      }
      if (options?.outlineMode) {
        obj = {
          ...obj,
          style: {
            ...obj.style,
            fill: { type: 'none' },
            effects: undefined,
            stroke: {
              color: '#3b82f6',
              width: 1 / camera.zoom,
              align: 'center',
              lineCap: 'butt',
              lineJoin: 'miter',
              miterLimit: 4,
              dashArray: [],
              opacity: 1,
            },
          },
        };
      }

       // Effect-aware culling: shadows, blur, glow, extrusion and repeats
       // extend the drawn footprint beyond the geometric bounds.
       const margin = effectWorldMargin(obj);
       const cullBounds = getObjectBounds(obj, doc);
       const expanded = margin > 0
         ? { x: cullBounds.x - margin, y: cullBounds.y - margin, width: cullBounds.width + margin * 2, height: cullBounds.height + margin * 2 }
         : cullBounds;
       if (!rectsIntersect(expanded, visibleWorldRect)) continue;

      const blendMode = obj.style.blendMode;
      ctx.globalCompositeOperation = !blendMode || blendMode === 'normal' ? 'source-over' : (BLEND_MODES as readonly string[]).includes(blendMode) ? blendMode : 'source-over';

       if (options?.quality === 'interactive' && getObjectBounds(obj, doc).width * camera.zoom < 2 && getObjectBounds(obj, doc).height * camera.zoom < 2) continue;

      // Live geometry effects (FX-004/019/020/022) reshape the drawn geometry
      // without mutating the document model.
      if (hasGeometryEffects(obj.style.effects)) {
        const baked = effectiveGeometry(obj, expandObject);
        if (baked) obj = { ...baked, id: objectId, brush: obj.type === 'path' ? obj.brush : undefined };
      }

      const objectBounds = getObjectBounds(obj, doc);
      const drawCurrent = (target: CanvasRenderingContext2D): void => {
        switch (obj.type) {
         case 'rectangle':
           renderRectangle(target, obj as RectangleObject);
           break;
         case 'ellipse':
           renderEllipse(target, obj as EllipseObject);
           break;
         case 'line':
           renderLine(target, obj as LineObject);
           break;
          case 'path':
             renderPath(target, obj as PathObject);
            break;
         case 'polygon':
           renderParametric(target, obj as PolygonObject);
           break;
         case 'star':
           renderParametric(target, obj as StarObject);
           break;
         case 'arc':
           renderParametric(target, obj as ArcObject);
           break;
         case 'pie':
           renderParametric(target, obj as PieObject);
           break;
         case 'ring':
           renderParametric(target, obj as RingObject);
           break;
         case 'spiral':
           renderParametric(target, obj as SpiralObject);
           break;
         case 'callout':
           renderParametric(target, obj as CalloutObject);
           break;
         case 'polyline':
           renderParametric(target, obj as PolylineObject);
           break;
         case 'image':
           renderImage(target, obj as ImageObject);
           break;
         case 'symbol-instance':
           renderSymbolInstance(target, obj as SymbolInstanceObject, doc);
           break;
         case 'group':
           for (const childId of obj.childIds) {
             const child = doc.objects[childId];
             if (child?.visible && !maskedIds.has(childId)) renderSceneObject(target, child, doc);
           }
           break;
        }
      };

      // Repeats (FX-024/025/026): draw every non-identity instance copy.
      if (hasActiveRepeats(obj.style)) {
        for (const instance of repeatInstances(obj)) {
          if (instance.position.x === 0 && instance.position.y === 0 && instance.rotation === 0 && instance.scale.x === 1 && instance.scale.y === 1) continue;
          const copy = { ...obj, transform: composeTransform2D(obj.transform, instance) };
          const copyBounds = getObjectBounds(copy, doc);
          drawObjectWithEffects(ctx, copy, copyBounds, { dpr, zoom: camera.zoom, panX: camera.pan.x, panY: camera.pan.y }, options?.quality ?? 'final', (target) => renderSceneObject(target, copy, doc));
        }
      }

      // Extrude (FX-023): shaded back copies behind the front face.
      const extrude = activeExtrude(obj.style);
      if (extrude) {
        const dir = { x: Math.cos(extrude.angle), y: Math.sin(extrude.angle) };
        const stepDepth = extrude.depth / extrude.steps;
        for (let step = extrude.steps; step >= 1; step -= 1) {
          const back = { ...obj, transform: composeTransform2D(obj.transform, { position: { x: dir.x * stepDepth * step, y: dir.y * stepDepth * step }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } }) };
          const shaded = back.style.fill.type === 'solid'
            ? { ...back, style: { ...back.style, fill: { type: 'solid' as const, color: shadeColor(back.style.fill.color, 0.5 + 0.5 * (step / extrude.steps)) } } }
            : back;
          renderSceneObject(ctx, shaded, doc);
        }
      }

      drawObjectWithEffects(ctx, obj, objectBounds, { dpr, zoom: camera.zoom, panX: camera.pan.x, panY: camera.pan.y }, options?.quality ?? 'final', drawCurrent);
    }
  }

  if (masks.length > 0) compositeMasks(ctx, camera, doc, masks, canvasWidth, canvasHeight, options?.previewTransforms);

  ctx.restore();
}

/**
 * Render each mask group through an offscreen canvas: clip mode clips content
 * with the mask shape's world geometry; opacity mode multiplies content alpha
 * (directly, or via luminance for `luminance` mode). Offscreen isolation keeps
 * the scene loop free of per-object compositing state.
 */
function compositeMasks(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  doc: DocumentModel,
  masks: readonly import('@vectoria/core').MaskGroup[],
  canvasWidth: number,
  canvasHeight: number,
  previewTransforms?: Record<string, import('@vectoria/core').Transform2D>,
): void {
  const dpr = window.devicePixelRatio || 1;
  for (const group of masks) {
    const maskObject = doc.objects[group.maskId];
    if (!maskObject?.visible) continue;
    const loops = maskGeometryLoops(maskObject);
    if (!loops || loops.length === 0) continue;

    const offscreen = createOffscreen(canvasWidth, canvasHeight);
    if (!offscreen) continue;
    const octx = offscreen.getContext('2d');
    if (!octx) continue;

    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.translate(camera.pan.x, camera.pan.y);
    octx.scale(camera.zoom, camera.zoom);

    if (group.mode === 'clip') {
      octx.save();
      octx.clip(buildMaskPath2D(loops));
      for (const id of group.contentIds) drawMaskContent(octx, doc, id, camera, previewTransforms);
      octx.restore();
    } else {
      for (const id of group.contentIds) drawMaskContent(octx, doc, id, camera, previewTransforms);
      const maskCanvas = createOffscreen(canvasWidth, canvasHeight);
      if (maskCanvas) {
        const mctx = maskCanvas.getContext('2d');
        if (mctx) {
          mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          mctx.translate(camera.pan.x, camera.pan.y);
          mctx.scale(camera.zoom, camera.zoom);
          mctx.fillStyle = '#ffffff';
          mctx.strokeStyle = '#ffffff';
          mctx.fill(buildMaskPath2D(loops), 'evenodd');
          if (group.opacityMode === 'alpha') applyAlphaMask(offscreen, maskCanvas, canvasWidth, canvasHeight, dpr);
          else applyLuminanceMask(offscreen, maskCanvas, canvasWidth, canvasHeight, dpr);
        }
      }
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();
  }
}

function createOffscreen(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Draw one masked object honouring its layer opacity and any drag preview. */
function drawMaskContent(
  ctx: CanvasRenderingContext2D,
  doc: DocumentModel,
  objectId: ObjectId,
  camera: Camera,
  previewTransforms?: Record<string, Transform2D>,
): void {
  let object = doc.objects[objectId];
  if (!object?.visible) return;
  const layer = Object.values(doc.layers).find((candidate) => candidate.objectIds.includes(objectId));
  if (!layer || !layer.visible || layer.opacity === 0) return;
  if (previewTransforms?.[objectId]) object = { ...object, transform: previewTransforms[objectId]! };
  if (layer.opacity !== 1) object = { ...object, style: { ...object.style, opacity: object.style.opacity * layer.opacity } };
  if (!rectsIntersect(getObjectBounds(object, doc), camera.getVisibleWorldRect({ x: ctx.canvas.width / (window.devicePixelRatio || 1), y: ctx.canvas.height / (window.devicePixelRatio || 1) }))) return;
  renderSceneObject(ctx, object, doc);
}

/** World-space outline loops of the mask shape; null when unsupported. */
function maskGeometryLoops(maskObject: SceneObject): Vec2[][] | null {
  const toWorld = (object: SceneObject, points: readonly Vec2[]): Vec2[] => {
    const matrix = getTransformMatrix(object.transform);
    return points.map((point) => ({
      x: matrix[0]! * point.x + matrix[3]! * point.y + matrix[6]!,
      y: matrix[1]! * point.x + matrix[4]! * point.y + matrix[7]!,
    }));
  };
  if (maskObject.type === 'path') {
    const main = toWorld(maskObject, flattenPath(maskObject));
    const children = (maskObject.compoundChildren ?? []).map((nodes) => toWorld(maskObject, nodes.map((node) => node.point)));
    return [main, ...children];
  }
  const expanded = expandObject(maskObject);
  if (expanded?.type === 'path' && expanded.nodes.length >= 2) return [toWorld(expanded, flattenPath(expanded))];
  return null;
}

/** Clip/alpha source as a single evenodd Path2D covering every mask loop. */
function buildMaskPath2D(loops: readonly Vec2[][]): Path2D {
  const path = new Path2D();
  for (const loop of loops) {
    loop.forEach((point, index) => {
      if (index === 0) path.moveTo(point.x, point.y);
      else path.lineTo(point.x, point.y);
    });
    path.closePath();
  }
  return path;
}

/** Keep content pixels only where the mask canvas is opaque. */
function applyAlphaMask(content: HTMLCanvasElement, mask: HTMLCanvasElement, width: number, height: number, dpr: number): void {
  const cctx = content.getContext('2d');
  if (!cctx) return;
  cctx.save();
  cctx.setTransform(1, 0, 0, 1, 0, 0);
  cctx.globalCompositeOperation = 'destination-in';
  cctx.drawImage(mask, 0, 0, width / dpr, height / dpr);
  cctx.restore();
}

/** Convert the mask canvas to a luminance map, then multiply into content alpha. */
function applyLuminanceMask(content: HTMLCanvasElement, mask: HTMLCanvasElement, width: number, height: number, dpr: number): void {
  const mctx = mask.getContext('2d');
  const cctx = content.getContext('2d');
  if (!mctx || !cctx) return;
  try {
    const image = mctx.getImageData(0, 0, mask.width, mask.height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]!;
      if (alpha === 0) continue;
      const luminance = (0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!) / 255;
      data[i + 3] = alpha * luminance;
    }
    mctx.putImageData(image, 0, 0);
  } catch {
    // Tainted canvas (foreign content) cannot be read; fall back to alpha-only.
  }
  applyAlphaMask(content, mask, width, height, dpr);
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
  bounds?: { width: number; height: number },
): string | CanvasGradient | CanvasPattern {
  if (fill.type === 'solid') return fill.color;
  if (fill.type === 'linear-gradient') return buildLinearGradient(ctx, fill);
  if (fill.type === 'radial-gradient') return buildRadialGradient(ctx, fill);
  if (fill.type === 'angular-gradient') return buildAngularGradient(ctx, fill);
  if (fill.type === 'pattern') {
    const pattern = buildPattern(ctx, fill);
    if (typeof pattern === 'object') applyPatternTransform(pattern, fill.transform);
    return pattern;
  }
  if (fill.type === 'texture') {
    const src = fill.source.type === 'embed' ? fill.source.data : fill.source.url;
    const img = getOrLoadImage(src);
    if (!img || typeof DOMMatrix === 'undefined') return 'transparent';
    const pattern = ctx.createPattern(img, 'repeat');
    if (!pattern) return 'transparent';
    applyPatternTransform(pattern, fill.transform);
    return pattern;
  }
  if (fill.type === 'mesh-gradient') {
    if (!bounds) return meshAverageColor(fill.colors);
    const tile = buildMeshTile(fill.colors, Math.max(1, bounds.width), Math.max(1, bounds.height));
    return tile ? (ctx.createPattern(tile, 'no-repeat') ?? meshAverageColor(fill.colors)) : meshAverageColor(fill.colors);
  }
  return 'transparent'; // 'none'
}

/** Apply the pattern's own placement transform, independent of the object's. */
function applyPatternTransform(pattern: CanvasPattern, transform: { offsetX: number; offsetY: number; scale: number; rotation: number } | undefined): void {
  if (!transform || typeof DOMMatrix === 'undefined') return;
  const matrix = new DOMMatrix()
    .translateSelf(transform.offsetX, transform.offsetY)
    .rotateSelf((transform.rotation * 180) / Math.PI)
    .scaleSelf(transform.scale, transform.scale);
  pattern.setTransform(matrix);
}

/** Local-space footprint of a path's nodes, used for mesh gradient tiling. */
function pathNodeBounds(obj: PathObject): { width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of obj.nodes) {
    minX = Math.min(minX, node.point.x, (node.inHandle?.x ?? node.point.x), (node.outHandle?.x ?? node.point.x));
    minY = Math.min(minY, node.point.y, (node.inHandle?.y ?? node.point.y), (node.outHandle?.y ?? node.point.y));
    maxX = Math.max(maxX, node.point.x, (node.inHandle?.x ?? node.point.x), (node.outHandle?.x ?? node.point.x));
    maxY = Math.max(maxY, node.point.y, (node.inHandle?.y ?? node.point.y), (node.outHandle?.y ?? node.point.y));
  }
  if (!Number.isFinite(minX)) return { width: 1, height: 1 };
  return { width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

/**
 * Render a brush path (FX-016/017/018). Caligraphic brushes draw a real filled
 * outline whose width depends on the stroke direction relative to the nib;
 * stamp/pattern brushes draw the plain stroke plus stamps along the arc-length.
 */
function renderBrushedPath(ctx: CanvasRenderingContext2D, obj: PathObject, drawPath: () => void): void {
  const brush = obj.brush!;
  if (brush.kind === 'caligraphic') {
    const outline = buildCaligraphicOutline(obj.nodes, obj.closed, brush.angle, brush.thin, brush.thick);
    ctx.beginPath();
    outline.forEach((node, index) => {
      if (index === 0) ctx.moveTo(node.point.x, node.point.y);
      else ctx.lineTo(node.point.x, node.point.y);
    });
    ctx.closePath();
    if (obj.style.fill.type !== 'none') {
      ctx.fillStyle = resolveFill(ctx, obj.style.fill, pathNodeBounds(obj));
      ctx.fill();
    }
    return;
  }

  if (obj.style.stroke) {
    applyLocalStroke(ctx, obj.style.stroke, obj.style.opacity);
    ctx.beginPath();
    drawPath();
    ctx.stroke();
  } else {
    ctx.globalAlpha = obj.style.opacity;
  }
  const strokeColor = obj.style.stroke?.color ?? '#000000';
  const samples = samplePath(obj.nodes, obj.closed, 8);
  const spacing = Math.max(brush.spacing, brush.size * 0.4);
  let nextAt = 0;
  ctx.fillStyle = strokeColor;
  for (const sample of samples) {
    if (sample.length < nextAt) continue;
    nextAt = sample.length + spacing;
    const jitterScale = brush.kind === 'stamp' && brush.jitter > 0 ? 1 + jitterBrush(sample.length) * brush.jitter * 0.5 : 1;
    const size = brush.kind === 'stamp' ? brush.size * jitterScale : brush.size * 0.35;
    ctx.beginPath();
    ctx.arc(sample.point.x, sample.point.y, Math.max(0.5, size / 2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function jitterBrush(seed: number): number {
  const x = Math.sin(seed * 91.7 + 47.3) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** Local-space size of any object, for mesh gradient tile alignment. */
function parametricFillBounds(obj: import('@vectoria/core').SceneObject): { width: number; height: number } | undefined {
  if ('width' in obj && 'height' in obj && typeof obj.width === 'number' && typeof obj.height === 'number') return { width: obj.width, height: obj.height };
  if ('radius' in obj && typeof obj.radius === 'number') return { width: obj.radius * 2, height: obj.radius * 2 };
  if ('outerRadius' in obj && typeof obj.outerRadius === 'number') return { width: obj.outerRadius * 2, height: obj.outerRadius * 2 };
  if ('radiusX' in obj && 'radiusY' in obj) return { width: obj.radiusX * 2, height: obj.radiusY * 2 };
  return undefined;
}

/** Darken a solid hex color by the given factor (0 = black, 1 = unchanged). */
function shadeColor(color: string, factor: number): string {
  const clean = color.replace('#', '');
  if (clean.length !== 6) return color;
  const to = (value: string): string => Math.max(0, Math.min(255, Math.round(parseInt(value, 16) * factor))).toString(16).padStart(2, '0');
  return `#${to(clean.slice(0, 2))}${to(clean.slice(2, 4))}${to(clean.slice(4, 6))}`;
}

function renderSceneObject(ctx: CanvasRenderingContext2D, obj: SceneObject, doc?: DocumentModel): void {
  switch (obj.type) {
    case 'rectangle': renderRectangle(ctx, obj); break;
    case 'ellipse': renderEllipse(ctx, obj); break;
    case 'line': renderLine(ctx, obj); break;
    case 'path': renderPath(ctx, obj); break;
    case 'polygon':
    case 'star':
    case 'arc':
    case 'pie':
    case 'ring':
    case 'spiral':
    case 'callout':
    case 'polyline':
      renderParametric(ctx, obj);
      break;
    case 'text':
      renderText(ctx, obj, doc);
      break;
    case 'text-frame':
      renderTextFrame(ctx, obj, doc);
      break;
    case 'image':
      renderImage(ctx, obj);
      break;
    case 'symbol-instance':
      renderSymbolInstance(ctx, obj, doc);
      break;
    case 'group': obj.childIds.forEach((childId) => { const child = doc?.objects[childId]; if (child?.visible) renderSceneObject(ctx, child, doc); }); break;
  }
}

const imageElementCache = new Map<string, HTMLImageElement>();

export function getOrLoadImage(src: string): HTMLImageElement | null {
  if (typeof Image === 'undefined' || !src) return null;
  const cached = imageElementCache.get(src);
  if (cached) {
    return cached.complete && cached.naturalWidth > 0 ? cached : null;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  imageElementCache.set(src, img);
  return null;
}

function buildCanvasFilter(filters?: import('@vectoria/core').ImageFilters): string {
  if (!filters) return 'none';
  const parts: string[] = [];
  if (filters.brightness !== undefined && filters.brightness !== 0) {
    const val = Math.max(0, 100 + filters.brightness);
    parts.push(`brightness(${val}%)`);
  }
  if (filters.contrast !== undefined && filters.contrast !== 0) {
    const val = Math.max(0, 100 + filters.contrast);
    parts.push(`contrast(${val}%)`);
  }
  if (filters.saturation !== undefined && filters.saturation !== 100) {
    parts.push(`saturate(${filters.saturation}%)`);
  }
  if (filters.grayscale) {
    parts.push('grayscale(100%)');
  }
  return parts.length > 0 ? parts.join(' ') : 'none';
}

function renderImage(ctx: CanvasRenderingContext2D, obj: ImageObject): void {
  const matrix = getTransformMatrix(obj.transform);
  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
  ctx.globalAlpha = obj.style.opacity;

  const src = obj.source.type === 'embed' ? obj.source.data : obj.source.url;
  const img = getOrLoadImage(src);

  if (obj.isMissing || !img) {
    ctx.fillStyle = obj.isMissing ? 'rgba(239, 68, 68, 0.12)' : 'rgba(100, 116, 139, 0.12)';
    ctx.strokeStyle = obj.isMissing ? '#ef4444' : '#64748b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.fillRect(0, 0, obj.width, obj.height);
    ctx.strokeRect(0.5, 0.5, obj.width - 1, obj.height - 1);
    ctx.setLineDash([]);

    ctx.fillStyle = obj.isMissing ? '#ef4444' : '#94a3b8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = obj.isMissing ? '⚠️ Missing Asset' : 'Loading Image...';
    ctx.fillText(label, obj.width / 2, obj.height / 2);
    ctx.restore();
    return;
  }

  const filterStr = buildCanvasFilter(obj.filters);
  if (filterStr !== 'none') {
    ctx.filter = filterStr;
  }

  if (obj.crop) {
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

    ctx.save();
    ctx.beginPath();
    ctx.rect(frame.x, frame.y, frame.width, frame.height);
    ctx.clip();

    const drawW = obj.naturalWidth * (scale.x || 1);
    const drawH = obj.naturalHeight * (scale.y || 1);
    const drawX = frame.x + offset.x;
    const drawY = frame.y + offset.y;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  } else {
    ctx.drawImage(img, 0, 0, obj.width, obj.height);
  }

  ctx.filter = 'none';
  ctx.restore();
}

function renderSymbolInstance(ctx: CanvasRenderingContext2D, obj: SymbolInstanceObject, doc?: DocumentModel): void {
  if (!doc?.symbols) return;
  const symbol = doc.symbols[obj.symbolId];
  if (!symbol) return;

  const matrix = getTransformMatrix(obj.transform);
  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
  ctx.globalAlpha = obj.style.opacity;

  for (const childId of symbol.objectIds) {
    const child = symbol.objects[childId];
    if (child?.visible) {
      renderSceneObject(ctx, child, doc);
    }
  }

  ctx.restore();
}

function renderText(ctx: CanvasRenderingContext2D, obj: TextObject, doc?: DocumentModel): void {
  const matrix = getTransformMatrix(obj.transform);
  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
  ctx.globalAlpha = obj.style.opacity;

  // Text on Path support
  if (obj.pathId && doc?.objects[obj.pathId]?.type === 'path') {
    const pathObj = doc.objects[obj.pathId] as PathObject;
    const pathLayout = computeTextOnPathLayout(obj, pathObj.nodes, pathObj.closed);
    ctx.font = `${obj.fontStyle !== 'normal' ? obj.fontStyle + ' ' : ''}${obj.fontWeight} ${obj.fontSize}px ${obj.fontFamily}`;
    ctx.textBaseline = 'alphabetic';

    for (const line of pathLayout.lines) {
      for (const glyph of line.glyphs) {
        ctx.save();
        ctx.translate(glyph.x, glyph.y);
        if (glyph.rotation) ctx.rotate(glyph.rotation);
        if (obj.style.fill.type !== 'none') {
          ctx.fillStyle = resolveFill(ctx, obj.style.fill);
          ctx.fillText(glyph.char, -glyph.width / 2, 0);
        }
        if (obj.style.stroke) {
          ctx.strokeStyle = obj.style.stroke.color;
          ctx.lineWidth = obj.style.stroke.width;
          ctx.strokeText(glyph.char, -glyph.width / 2, 0);
        }
        ctx.restore();
      }
    }
    ctx.restore();
    return;
  }

  const layout = computeArtisticTextLayout(obj);
  ctx.font = `${obj.fontStyle !== 'normal' ? obj.fontStyle + ' ' : ''}${obj.fontWeight} ${obj.fontSize}px ${obj.fontFamily}`;
  ctx.textBaseline = 'alphabetic';

  for (const line of layout.lines) {
    if (obj.style.fill.type !== 'none') {
      ctx.fillStyle = resolveFill(ctx, obj.style.fill);
      ctx.fillText(line.text, line.x, line.baseline);
    }
    if (obj.style.stroke) {
      ctx.strokeStyle = obj.style.stroke.color;
      ctx.lineWidth = obj.style.stroke.width;
      ctx.strokeText(line.text, line.x, line.baseline);
    }
  }

  ctx.restore();
}

function renderTextFrame(ctx: CanvasRenderingContext2D, obj: TextFrameObject, _doc?: DocumentModel): void {
  const matrix = getTransformMatrix(obj.transform);
  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
  ctx.globalAlpha = obj.style.opacity;

  const layout = computeTextFrameLayout(obj);
  ctx.font = `${obj.fontStyle !== 'normal' ? obj.fontStyle + ' ' : ''}${obj.fontWeight} ${obj.fontSize}px ${obj.fontFamily}`;
  ctx.textBaseline = 'alphabetic';

  for (const line of layout.lines) {
    if (line.listMarker) {
      if (obj.style.fill.type !== 'none') {
        ctx.fillStyle = resolveFill(ctx, obj.style.fill);
        ctx.fillText(line.listMarker.text, line.listMarker.x, line.listMarker.y);
      }
    }

    if (obj.textAlign === 'justify' && !line.isLastLineOfParagraph) {
      for (const glyph of line.glyphs) {
        if (obj.style.fill.type !== 'none') {
          ctx.fillStyle = resolveFill(ctx, obj.style.fill);
          ctx.fillText(glyph.char, glyph.x, line.baseline);
        }
        if (obj.style.stroke) {
          ctx.strokeStyle = obj.style.stroke.color;
          ctx.lineWidth = obj.style.stroke.width;
          ctx.strokeText(glyph.char, glyph.x, line.baseline);
        }
      }
    } else {
      if (obj.style.fill.type !== 'none') {
        ctx.fillStyle = resolveFill(ctx, obj.style.fill);
        ctx.fillText(line.text, line.x, line.baseline);
      }
      if (obj.style.stroke) {
        ctx.strokeStyle = obj.style.stroke.color;
        ctx.lineWidth = obj.style.stroke.width;
        ctx.strokeText(line.text, line.x, line.baseline);
      }
    }
  }

  ctx.restore();
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

   const drawPath = (): void => {
     if (hasRoundedCorners) roundRect(ctx, 0, 0, obj.width, obj.height, radii);
     else ctx.rect(0, 0, obj.width, obj.height);
   };

   // Fill
   if (obj.style.fill.type !== 'none') {
     ctx.fillStyle = resolveFill(ctx, obj.style.fill, parametricFillBounds(obj));
     ctx.beginPath();
     drawPath();
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

     strokeClosedPath(ctx, obj.style.stroke, drawPath);
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
   const drawPath = (): void => { ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2); };

   if (obj.style.fill.type !== 'none') {
     ctx.fillStyle = resolveFill(ctx, obj.style.fill, parametricFillBounds(obj));
     ctx.beginPath();
     drawPath();
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
     strokeClosedPath(ctx, obj.style.stroke, drawPath);
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
    const stroke = obj.style.stroke;
    const alpha = obj.style.opacity * stroke.opacity;
    if (stroke.markerStart) {
      drawArrowMarker(ctx, stroke.markerStart, { x: 0, y: 0 }, { x: -obj.endPoint.x, y: -obj.endPoint.y }, stroke.color, alpha);
    }
    if (stroke.markerEnd) {
      drawArrowMarker(ctx, stroke.markerEnd, obj.endPoint, { x: obj.endPoint.x, y: obj.endPoint.y }, stroke.color, alpha);
    }
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
  const drawPath = (): void => {
    drawSubpath(obj.nodes);
    obj.compoundChildren?.forEach((nodes) => drawSubpath(nodes));
  };

  if (obj.brush) {
    renderBrushedPath(ctx, obj, drawPath);
    ctx.restore();
    return;
  }

  if (obj.style.fill.type !== 'none' && obj.closed) {
    ctx.beginPath();
    drawPath();
    ctx.fillStyle = resolveFill(ctx, obj.style.fill, pathNodeBounds(obj));
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
    if (obj.widthProfile && obj.widthProfile.length > 1 && !obj.closed) {
      renderVariableWidthStroke(ctx, obj);
    } else if (obj.closed) {
      strokeClosedPath(ctx, obj.style.stroke, drawPath);
    } else {
      ctx.beginPath();
      drawPath();
      ctx.stroke();
    }
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

// ─── Parametric Shapes ────────────────────────────────────────────────────────

type ParametricObject = PolygonObject | StarObject | ArcObject | PieObject | RingObject | SpiralObject | CalloutObject | PolylineObject;

/**
 * Render any parametric shape (polygon, star, arc, pie, ring, spiral, callout,
 * polyline). Fill and stroke share one traced path so the canvas output matches
 * hit-testing and SVG export, which reuse the same core geometry helpers.
 */
function renderParametric(ctx: CanvasRenderingContext2D, obj: ParametricObject): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);

  const fillable =
    obj.type === 'polygon' || obj.type === 'star' || obj.type === 'pie' ||
    obj.type === 'ring' || obj.type === 'callout' || (obj.type === 'arc' && obj.closed);

   const drawPath = (): void => { traceParametricPath(ctx, obj); };

   if (obj.style.fill.type !== 'none' && fillable) {
     ctx.beginPath();
     drawPath();
     ctx.fillStyle = resolveFill(ctx, obj.style.fill, parametricFillBounds(obj));
    if (obj.type === 'ring') ctx.fill('evenodd');
    else ctx.fill();
  }

   if (obj.style.stroke) {
     applyLocalStroke(ctx, obj.style.stroke, obj.style.opacity);
      if (fillable) strokeClosedPath(ctx, obj.style.stroke, drawPath);
      else { ctx.beginPath(); drawPath(); ctx.stroke(); }
  }

  if (obj.style.stroke && obj.type === 'polyline') {
    drawPolyArrowheads(ctx, obj.style.stroke, obj.style.opacity * obj.style.stroke.opacity, obj.points);
  }

  ctx.restore();
}

/** Apply dash/cap/join state for a local-space stroke without touching fills. */
function applyLocalStroke(ctx: CanvasRenderingContext2D, stroke: StrokeStyle, baseOpacity: number): void {
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = stroke.lineCap;
  ctx.lineJoin = stroke.lineJoin;
  ctx.miterLimit = stroke.miterLimit;
  if (stroke.dashArray.length > 0) ctx.setLineDash([...stroke.dashArray]);
  ctx.globalAlpha = baseOpacity * stroke.opacity;
}

/** Render closed geometry inside, outside or centered without changing document geometry. */
function strokeClosedPath(ctx: CanvasRenderingContext2D, stroke: StrokeStyle, drawPath: () => void): void {
  const align = stroke.align ?? 'center';
  if (align === 'center') {
    ctx.beginPath();
    drawPath();
    ctx.stroke();
    return;
  }
  ctx.save();
  ctx.beginPath();
  if (align === 'outside') ctx.rect(-1e9, -1e9, 2e9, 2e9);
  drawPath();
  ctx.clip('evenodd');
  ctx.beginPath();
  drawPath();
  ctx.stroke();
  ctx.restore();
}

/**
 * Trace the object outline in its local space onto the current path.
 * The caller begins and consumes the path.
 */
function traceParametricPath(ctx: CanvasRenderingContext2D, obj: ParametricObject): void {
  switch (obj.type) {
    case 'polygon':
      traceVertexLoop(ctx, getPolygonVertices(obj.sides, obj.radius), true);
      break;
    case 'star':
      traceVertexLoop(ctx, getStarVertices(obj.points, obj.outerRadius, obj.innerRadius), true);
      break;
    case 'callout':
      traceVertexLoop(ctx, getCalloutVertices(obj.width, obj.height, obj.cornerRadius, obj.tailTip, obj.tailBaseWidth), true);
      break;
    case 'arc': {
      const sweep = obj.endAngle - obj.startAngle;
      ctx.ellipse(0, 0, obj.radiusX, obj.radiusY, 0, obj.startAngle, obj.endAngle, sweep < 0);
      if (obj.closed) ctx.closePath();
      break;
    }
    case 'pie': {
      const sweep = obj.endAngle - obj.startAngle;
      ctx.moveTo(0, 0);
      ctx.ellipse(0, 0, obj.radiusX, obj.radiusY, 0, obj.startAngle, obj.endAngle, sweep < 0);
      ctx.closePath();
      break;
    }
    case 'ring': {
      ctx.arc(0, 0, obj.outerRadius, 0, Math.PI * 2);
      ctx.moveTo(obj.innerRadius, 0);
      ctx.arc(0, 0, obj.innerRadius, 0, Math.PI * 2, true);
      break;
    }
    case 'spiral':
      traceVertexLoop(ctx, getSpiralVertices(obj.turns, obj.decay, obj.direction), false);
      break;
    case 'polyline':
      traceVertexLoop(ctx, [...obj.points], false);
      break;
  }
}

function traceVertexLoop(ctx: CanvasRenderingContext2D, points: readonly Vec2[], closed: boolean): void {
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  if (closed && points.length > 2) ctx.closePath();
}

/**
 * Draw markerStart/markerEnd arrowheads for an open vertex chain. Orientation
 * comes from the tangent of the adjacent segment; nothing is persisted in state.
 */
function drawPolyArrowheads(
  ctx: CanvasRenderingContext2D,
  stroke: StrokeStyle,
  alpha: number,
  points: readonly Vec2[],
): void {
  if (points.length < 2) return;
  const first = points[0]!;
  const second = points[1]!;
  const penultimate = points[points.length - 2]!;
  const last = points[points.length - 1]!;
  if (stroke.markerStart) {
    drawArrowMarker(ctx, stroke.markerStart, first, { x: first.x - second.x, y: first.y - second.y }, stroke.color, alpha);
  }
  if (stroke.markerEnd) {
    drawArrowMarker(ctx, stroke.markerEnd, last, { x: last.x - penultimate.x, y: last.y - penultimate.y }, stroke.color, alpha);
  }
}

/** Draw one filled arrowhead at `tip`, pointing along the normalized tangent. */
function drawArrowMarker(
  ctx: CanvasRenderingContext2D,
  marker: ArrowheadStyle,
  tip: Vec2,
  outDirection: Vec2,
  color: string,
  alpha: number,
): void {
  const length = Math.hypot(outDirection.x, outDirection.y);
  if (!Number.isFinite(length) || length === 0) return;
  const tangent = { x: outDirection.x / length, y: outDirection.y / length };

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  if (marker.type === 'circle') {
    ctx.translate(tip.x, tip.y);
    ctx.rotate(Math.atan2(tangent.y, tangent.x));
    ctx.beginPath();
    ctx.arc(-marker.size / 2, 0, marker.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const vertices = getArrowheadVertices(marker.type, marker.size, tip, tangent);
    ctx.beginPath();
    vertices.forEach((vertex, index) => {
      if (index === 0) ctx.moveTo(vertex.x, vertex.y);
      else ctx.lineTo(vertex.x, vertex.y);
    });
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  radii: ReturnType<typeof normalizeCornerRadii>,
): void {
  const { topLeft, topRight, bottomRight, bottomLeft } = radii;
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
    lasso?: readonly Vec2[];
    snap?: SnapResult;
    smartDistance?: { 
      point: Vec2; dx: number; dy: number;
      hover?: {
        selectionBounds: { x: number; y: number; width: number; height: number };
        hoverBounds: { x: number; y: number; width: number; height: number };
      }
    };
    objectSnap?: {
      guides: { axis: 'horizontal' | 'vertical'; position: number; targetId: string }[];
    };
    geometryPreview?: GeometryPreview;
    gradientHandles?: readonly GradientHandleOverlay[];
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

  if (options?.lasso && options.lasso.length > 1) {
    ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
    ctx.fillStyle = themeColor('--color-selection-fill', 'rgba(92, 174, 255, 0.13)');
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    options.lasso.forEach((point, index) => {
      const screen = camera.worldToScreen(point);
      if (index === 0) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (options?.snap?.snapped) {
    const point = camera.worldToScreen(options.snap.worldPoint);
    ctx.strokeStyle = themeColor('--color-snap', '#ed61da');
    ctx.fillStyle = themeColor('--color-snap', '#ed61da');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(point.x - 6, point.y); ctx.lineTo(point.x + 6, point.y);
    ctx.moveTo(point.x, point.y - 6); ctx.lineTo(point.x, point.y + 6);
    ctx.stroke();
    ctx.font = '10px var(--font-mono)';
    ctx.fillText(options.snap.candidate?.label ?? 'Snap', point.x + 8, point.y - 8);
  }

  if (options?.smartDistance) {
    const point = camera.worldToScreen(options.smartDistance.point);
    ctx.fillStyle = themeColor('--color-smart-distance', '#5acc9a');
    ctx.strokeStyle = themeColor('--color-smart-distance', '#5acc9a');
    ctx.font = '10px var(--font-mono)';
    if (options.smartDistance.hover) {
      ctx.fillText(`ΔX ${options.smartDistance.dx.toFixed(1)} · ΔY ${options.smartDistance.dy.toFixed(1)}`, point.x + 8, point.y + 16);
    }
    
    if (options.smartDistance.hover) {
      const { selectionBounds: sb, hoverBounds: hb } = options.smartDistance.hover;
      ctx.lineWidth = 1;
      
      const drawDist = (p1: Vec2, p2: Vec2, label: string) => {
        const s1 = camera.worldToScreen(p1);
        const s2 = camera.worldToScreen(p2);
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();
        const mid = { x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 };
        ctx.fillText(label, mid.x + 4, mid.y - 4);
      };

      if (sb.x + sb.width < hb.x) drawDist({ x: sb.x + sb.width, y: sb.y + sb.height / 2 }, { x: hb.x, y: sb.y + sb.height / 2 }, (hb.x - (sb.x + sb.width)).toFixed(1));
      if (hb.x + hb.width < sb.x) drawDist({ x: hb.x + hb.width, y: hb.y + hb.height / 2 }, { x: sb.x, y: hb.y + hb.height / 2 }, (sb.x - (hb.x + hb.width)).toFixed(1));
      if (sb.y + sb.height < hb.y) drawDist({ x: sb.x + sb.width / 2, y: sb.y + sb.height }, { x: sb.x + sb.width / 2, y: hb.y }, (hb.y - (sb.y + sb.height)).toFixed(1));
      if (hb.y + hb.height < sb.y) drawDist({ x: hb.x + hb.width / 2, y: hb.y + hb.height }, { x: hb.x + hb.width / 2, y: sb.y }, (sb.y - (hb.y + hb.height)).toFixed(1));
    }
  }

  if (options?.geometryPreview) {
    renderGeometryPreview(ctx, camera, options.geometryPreview);
  }

  if (options?.gradientHandles) {
    renderGradientHandles(ctx, camera, options.gradientHandles);
  }

  if (options?.objectSnap && options.objectSnap.guides.length > 0) {
    ctx.strokeStyle = themeColor('--color-snap', '#ed61da');
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const guide of options.objectSnap.guides) {
      if (guide.axis === 'vertical') {
        const x = camera.worldToScreen({ x: guide.position, y: 0 }).x;
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, canvasHeight / dpr);
      } else {
        const y = camera.worldToScreen({ x: 0, y: guide.position }).y;
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(canvasWidth / dpr, y + 0.5);
      }
    }
    ctx.stroke();
  }

  if (selectedIds.size === 0) {
    ctx.restore();
    return;
  }

  if (selectedIds.size > 1) {
     const bounds = [...selectedIds].map((id) => doc.objects[id]).filter(Boolean).map((object) => getObjectBounds(object!, doc));
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
        renderBoundsSelectionOutline(ctx, camera, getObjectBounds(obj, doc));
        break;
       case 'group': {
         const bound = getObjectBounds(obj, doc);
         renderBoundsSelectionOutline(ctx, camera, bound);
         break;
       }
       default: {
         // Parametric shapes share the group-style bounds outline; their scene
         // geometry is already drawn on the scene canvas.
         const bound = getObjectBounds(obj, doc);
         renderBoundsSelectionOutline(ctx, camera, bound);
         break;
       }
    }
  }

  ctx.restore();
}

export interface GradientHandleOverlay {
  readonly objectId: ObjectId;
  readonly fill: Extract<FillStyle, { type: 'linear-gradient' | 'radial-gradient' | 'angular-gradient' }>;
  readonly transform: Transform2D;
}

function renderGradientHandles(ctx: CanvasRenderingContext2D, camera: Camera, handles: readonly GradientHandleOverlay[]): void {
  const accent = themeColor('--color-accent', '#5caeff');
  const node = themeColor('--color-node', '#ffffff');
  for (const handle of handles) {
    const matrix = getTransformMatrix(handle.transform);
    const world = (point: Vec2): Vec2 => mat3TransformPoint(matrix, point);
    const points: Vec2[] = [];
    if (handle.fill.type === 'linear-gradient') points.push(world(handle.fill.start), world(handle.fill.end));
    if (handle.fill.type === 'radial-gradient') points.push(world(handle.fill.center), world({ x: handle.fill.center.x + handle.fill.radius, y: handle.fill.center.y }));
    if (handle.fill.type === 'angular-gradient') points.push(world(handle.fill.center), world({ x: handle.fill.center.x + 24, y: handle.fill.center.y }));
    if (points.length < 2) continue;
    const screen = points.map((point) => camera.worldToScreen(point));
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.fillStyle = node;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(screen[0]!.x, screen[0]!.y);
    ctx.lineTo(screen[1]!.x, screen[1]!.y);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const point of screen) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(point.x, point.y, 9, 0, Math.PI * 2);
      ctx.strokeStyle = `${accent}66`;
      ctx.stroke();
      ctx.strokeStyle = accent;
    }
    ctx.restore();
  }
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
   const bounds = preview.proposed.map((object) => getObjectBounds(object));
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
    default:
      renderBoundsSelectionOutline(ctx, camera, getObjectBounds(object));
      break;
  }
}

/** Screen-space dashed bounds outline with handles, shared by groups and parametric shapes. */
function renderBoundsSelectionOutline(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  bound: { x: number; y: number; width: number; height: number },
): void {
  const topLeft = camera.worldToScreen({ x: bound.x, y: bound.y });
  const bottomRight = camera.worldToScreen({ x: bound.x + bound.width, y: bound.y + bound.height });
  const width = bottomRight.x - topLeft.x;
  const height = bottomRight.y - topLeft.y;
  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.fillStyle = themeColor('--color-selection-fill', 'rgba(92, 174, 255, 0.13)');
  ctx.lineWidth = 1.5;
  ctx.strokeRect(topLeft.x, topLeft.y, width, height);
  ctx.fillRect(topLeft.x, topLeft.y, width, height);

  const midX = topLeft.x + width / 2;
  const midY = topLeft.y + height / 2;
  const handles: Vec2[] = [
    topLeft,
    { x: midX, y: topLeft.y },
    { x: bottomRight.x, y: topLeft.y },
    { x: bottomRight.x, y: midY },
    bottomRight,
    { x: midX, y: bottomRight.y },
    { x: topLeft.x, y: bottomRight.y },
    { x: topLeft.x, y: midY },
  ];
  drawScreenHandles(ctx, camera, handles);

  // Rotation handle above top center
  ctx.save();
  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.fillStyle = themeColor('--color-node', '#ffffff');
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(midX, topLeft.y);
  ctx.lineTo(midX, topLeft.y - 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(midX, topLeft.y - 20, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
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
  drawResizeHandles(ctx, camera, [
    { x: 0, y: 0 },
    { x: obj.width / 2, y: 0 },
    { x: obj.width, y: 0 },
    { x: obj.width, y: obj.height / 2 },
    { x: obj.width, y: obj.height },
    { x: obj.width / 2, y: obj.height },
    { x: 0, y: obj.height },
    { x: 0, y: obj.height / 2 },
  ], obj.transform.scale);
  drawRotationHandle(ctx, camera, obj.width / 2, 0, obj.transform.scale);

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
  drawResizeHandles(ctx, camera, [
    { x: 0, y: 0 },
    { x: obj.width / 2, y: 0 },
    { x: obj.width, y: 0 },
    { x: obj.width, y: obj.height / 2 },
    { x: obj.width, y: obj.height },
    { x: obj.width / 2, y: obj.height },
    { x: 0, y: obj.height },
    { x: 0, y: obj.height / 2 },
  ], obj.transform.scale);
  drawRotationHandle(ctx, camera, obj.width / 2, 0, obj.transform.scale);

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

function drawResizeHandles(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  points: readonly { x: number; y: number }[],
  scale: { x: number; y: number } = { x: 1, y: 1 },
): void {
  const sx = Math.abs(scale.x || 1) || 1;
  const sy = Math.abs(scale.y || 1) || 1;
  const sizeX = 8 / (camera.zoom * sx);
  const sizeY = 8 / (camera.zoom * sy);
  ctx.fillStyle = themeColor('--color-node', '#ffffff');
  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.lineWidth = 1 / camera.zoom;
  for (const point of points) {
    ctx.fillRect(point.x - sizeX / 2, point.y - sizeY / 2, sizeX, sizeY);
    ctx.strokeRect(point.x - sizeX / 2, point.y - sizeY / 2, sizeX, sizeY);
  }
}

function drawRotationHandle(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  x: number,
  y: number,
  scale: { x: number; y: number } = { x: 1, y: 1 },
): void {
  const sx = Math.abs(scale.x || 1) || 1;
  const sy = Math.abs(scale.y || 1) || 1;
  const offset = 20 / (camera.zoom * sy);
  const radius = 4 / (camera.zoom * Math.sqrt(sx * sy));
  ctx.strokeStyle = themeColor('--color-selection', '#5caeff');
  ctx.fillStyle = themeColor('--color-node', '#ffffff');
  ctx.lineWidth = 1 / camera.zoom;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - offset);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y - offset, radius, 0, Math.PI * 2);
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
