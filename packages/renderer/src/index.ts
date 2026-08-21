import type { Camera } from '@vectoria/editor-engine';
import type { DocumentModel, Artboard, RectangleObject, EllipseObject, LineObject, PathObject, ObjectId, Transform2D } from '@vectoria/core';
import { getTransformMatrix } from '@vectoria/core';

// ─── Render Loop ──────────────────────────────────────────────────────────────

export class RenderLoop {
  private rafId: number | null = null;
  private dirty = true;

  constructor(private readonly renderFn: () => void) {}

  /** Mark the scene as needing a re-render. */
  invalidate(): void {
    this.dirty = true;
  }

  /** Start the render loop. */
  start(): void {
    const tick = () => {
      if (this.dirty) {
        this.dirty = false;
        this.renderFn();
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  /** Stop the render loop. */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
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
): void {
  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Workspace background
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-workspace').trim() || '#20201e';
  ctx.fillRect(0, 0, canvasWidth / dpr, canvasHeight / dpr);

  // Artboard shadow
  const screenPos = camera.worldToScreen({ x: artboard.x, y: artboard.y });
  const screenW = artboard.width * camera.zoom;
  const screenH = artboard.height * camera.zoom;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.32)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  // Artboard fill
  ctx.fillStyle = artboard.background ?? '#ffffff';
  ctx.fillRect(screenPos.x, screenPos.y, screenW, screenH);

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Artboard border
  ctx.strokeStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-border-subtle').trim() || '#33332f';
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
  if (artboard) {
    ctx.beginPath();
    ctx.rect(artboard.x, artboard.y, artboard.width, artboard.height);
    ctx.clip();
  }

  // Render objects in z-order
  for (const layerId of doc.layerIds) {
    const layer = doc.layers[layerId];
    if (!layer?.visible) continue;

    for (const objectId of layer.objectIds) {
      let obj = doc.objects[objectId];
      if (!obj?.visible) continue;

      if (options?.previewTransforms?.[objectId]) {
        obj = { ...obj, transform: options.previewTransforms[objectId]! };
      }

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

function renderRectangle(
  ctx: CanvasRenderingContext2D,
  obj: RectangleObject,
): void {
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
  ctx.globalAlpha = obj.style.opacity;

  // Fill
  if (obj.style.fill.type === 'solid') {
    ctx.fillStyle = obj.style.fill.color;
    if (obj.cornerRadius > 0) {
      roundRect(ctx, 0, 0, obj.width, obj.height, obj.cornerRadius);
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

    if (obj.cornerRadius > 0) {
      roundRect(ctx, 0, 0, obj.width, obj.height, obj.cornerRadius);
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
  if (obj.style.fill.type === 'solid') {
    ctx.fillStyle = obj.style.fill.color;
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
  if (obj.closed) ctx.closePath();

  if (obj.style.fill.type === 'solid' && obj.closed) {
    ctx.fillStyle = obj.style.fill.color;
    ctx.fill();
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
    ctx.stroke();
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
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
  },
): void {
  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasWidth / dpr, canvasHeight / dpr);

  if (selectedIds.size === 0) {
    ctx.restore();
    return;
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
        renderPathSelectionOutline(ctx, camera, obj as PathObject);
        break;
    }
  }

  ctx.restore();
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
  ctx.strokeStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-selection').trim() || '#5caeff';
  ctx.lineWidth = 1.5 / camera.zoom; // constant screen-space width
  ctx.setLineDash([]);

  ctx.strokeRect(0, 0, obj.width, obj.height);

  // Selection fill
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-selection-fill').trim() || 'rgba(92, 174, 255, 0.13)';
  ctx.fillRect(0, 0, obj.width, obj.height);

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

  ctx.strokeStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-selection').trim() || '#5caeff';
  ctx.lineWidth = 1.5 / camera.zoom;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

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

  ctx.strokeStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-selection').trim() || '#5caeff';
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
  const matrix = getTransformMatrix(obj.transform);

  ctx.save();

  ctx.translate(camera.pan.x, camera.pan.y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);

  ctx.strokeStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-selection').trim() || '#5caeff';
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
  if (obj.closed) ctx.closePath();
  ctx.stroke();

  ctx.restore();
}
