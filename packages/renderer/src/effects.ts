import type { ExtrudeEffect, LiveEffect, ObjectStyle, SceneObject, Transform2D } from '@vectoria/core';
import { composeTransform2D, gridRepeatTransforms, mirrorRepeatTransforms, radialRepeatTransforms } from '@vectoria/core';
import type { RenderQuality } from './quality.js';

const RASTER_TYPES: readonly string[] = ['dropShadow', 'blur', 'innerShadow', 'glow', 'svgFilter', 'extrude'];
const REPEAT_TYPES: readonly string[] = ['radialRepeat', 'mirrorRepeat', 'gridRepeat'];

const MAX_OFFSCREEN_EDGE = 8192;
const MAX_OFFSCREEN_AREA = 16_000_000;

export function visibleEffects(style: ObjectStyle): LiveEffect[] {
  return (style.effects ?? []).filter((effect) => effect.visible);
}

export function hasActiveRasterEffects(style: ObjectStyle): boolean {
  return visibleEffects(style).some((effect) => RASTER_TYPES.includes(effect.type));
}

/**
 * Extra world-space margin the object's drawn footprint can extend beyond its
 * geometric bounds (shadows, glow, blur, extrusion, repeats). Used for culling.
 */
export function effectWorldMargin(obj: SceneObject): number {
  let margin = 0;
  for (const effect of visibleEffects(obj.style)) {
    switch (effect.type) {
      case 'dropShadow':
      case 'innerShadow':
        margin = Math.max(margin, Math.abs(effect.offsetX) + Math.abs(effect.offsetY) + effect.blur * 2);
        break;
      case 'blur':
        margin = Math.max(margin, effect.radius * 2);
        break;
      case 'glow':
        margin = Math.max(margin, effect.blur * 2);
        break;
      case 'extrude':
        margin = Math.max(margin, effect.depth);
        break;
      case 'radialRepeat': {
        const diag = Math.hypot(obj.type === 'path' ? 1 : ('width' in obj ? obj.width : 1), obj.type === 'path' ? 1 : ('height' in obj ? obj.height : 1));
        margin = Math.max(margin, effect.radius + diag);
        break;
      }
      case 'gridRepeat':
        margin = Math.max(margin, (effect.rows - 1) * effect.spacingY, (effect.columns - 1) * effect.spacingX);
        break;
      default:
        break;
    }
  }
  return margin;
}

function identityTransform(): Transform2D {
  return { position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 } };
}

/** All repeat instance transforms (index 0 is the identity). */
export function repeatInstances(obj: SceneObject): Transform2D[] {
  let current: Transform2D[] = [identityTransform()];
  for (const effect of visibleEffects(obj.style)) {
    let list: Transform2D[];
    if (effect.type === 'radialRepeat') {
      const b = localBounds(obj);
      list = radialRepeatTransforms(b, effect.count, effect.radius, effect.startAngle);
    } else if (effect.type === 'mirrorRepeat') {
      list = mirrorRepeatTransforms(localBounds(obj), effect.axis, effect.offset);
    } else if (effect.type === 'gridRepeat') {
      list = gridRepeatTransforms(effect.rows, effect.columns, effect.spacingX, effect.spacingY);
    } else continue;
    const next: Transform2D[] = [];
    for (const outer of current) for (const inner of list) next.push(composeTransform2D(outer, inner));
    if (next.length > 4096) { current = next.slice(0, 4096); break; }
    current = next;
  }
  return current;
}

export function hasActiveRepeats(style: ObjectStyle): boolean {
  return visibleEffects(style).some((effect) => REPEAT_TYPES.includes(effect.type));
}

export function activeExtrude(style: ObjectStyle): ExtrudeEffect | null {
  const effect = visibleEffects(style).find((candidate): candidate is ExtrudeEffect => candidate.type === 'extrude');
  return effect ?? null;
}

function localBounds(obj: SceneObject): { minX: number; minY: number; maxX: number; maxY: number } {
  if (obj.type === 'path') {
    const xs = obj.nodes.map((node) => node.point.x);
    const ys = obj.nodes.map((node) => node.point.y);
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  }
  if ('width' in obj && 'height' in obj) return { minX: 0, minY: 0, maxX: obj.width, maxY: obj.height };
  return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
}

function hexToRgba(color: string, opacity: number): string {
  const clean = color.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}

function makeOffscreen(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  return ctx ? { canvas, ctx } : null;
}

export interface CompositingParams {
  readonly dpr: number;
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

/**
 * Draw one object through the live-effect compositing pipeline. In
 * `interactive` quality or without raster effects the object is drawn
 * directly; otherwise it is rastered into a bounded offscreen canvas, the
 * visible raster effects are applied in stack order and the result is
 * composited back in device space.
 */
export function drawObjectWithEffects(
  ctx: CanvasRenderingContext2D,
  obj: SceneObject,
  worldBounds: { x: number; y: number; width: number; height: number },
  params: CompositingParams,
  quality: RenderQuality,
  drawFn: (target: CanvasRenderingContext2D) => void,
): void {
  if (quality === 'interactive') {
    drawFn(ctx);
    return;
  }
  const raster = visibleEffects(obj.style).filter((effect) => RASTER_TYPES.includes(effect.type));
  if (raster.length === 0) {
    drawFn(ctx);
    return;
  }

  let margin = 0;
  for (const effect of raster) {
    if (effect.type === 'dropShadow' || effect.type === 'innerShadow') margin = Math.max(margin, Math.abs(effect.offsetX) + Math.abs(effect.offsetY) + effect.blur * 2);
    else if (effect.type === 'blur') margin = Math.max(margin, effect.radius * 2);
    else if (effect.type === 'glow') margin = Math.max(margin, effect.blur * 2);
    else if (effect.type === 'extrude') margin = Math.max(margin, effect.depth);
  }
  const rect = { x: worldBounds.x - margin, y: worldBounds.y - margin, width: worldBounds.width + margin * 2, height: worldBounds.height + margin * 2 };
  const deviceW = Math.ceil(rect.width * params.zoom * params.dpr);
  const deviceH = Math.ceil(rect.height * params.zoom * params.dpr);
  if (deviceW < 1 || deviceH < 1 || deviceW > MAX_OFFSCREEN_EDGE || deviceH > MAX_OFFSCREEN_EDGE || deviceW * deviceH > MAX_OFFSCREEN_AREA) {
    drawFn(ctx);
    return;
  }
  const deviceX = (rect.x * params.zoom + params.panX) * params.dpr;
  const deviceY = (rect.y * params.zoom + params.panY) * params.dpr;

  const base = makeOffscreen(deviceW, deviceH);
  if (!base) {
    drawFn(ctx);
    return;
  }
  base.ctx.setTransform(params.zoom * params.dpr, 0, 0, params.zoom * params.dpr, -deviceX, -deviceY);
  drawFn(base.ctx);
  base.ctx.setTransform(1, 0, 0, 1, 0, 0);

  let acc: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } = base;
  for (const effect of raster) {
    const next = applyRasterEffect(acc, effect, params);
    if (next) acc = next;
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(acc.canvas, deviceX, deviceY);
  ctx.restore();
}

function applyRasterEffect(
  acc: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D },
  effect: LiveEffect,
  params: CompositingParams,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const px = params.dpr * params.zoom;
  if (effect.type === 'blur') {
    const radius = effect.radius * px;
    if (radius < 0.5) return null;
    const out = makeOffscreen(acc.canvas.width, acc.canvas.height);
    if (!out) return null;
    out.ctx.filter = `blur(${radius}px)`;
    out.ctx.drawImage(acc.canvas, 0, 0);
    out.ctx.filter = 'none';
    return out;
  }
  if (effect.type === 'dropShadow') {
    const out = makeOffscreen(acc.canvas.width, acc.canvas.height);
    if (!out) return null;
    out.ctx.shadowColor = hexToRgba(effect.color, effect.opacity);
    out.ctx.shadowOffsetX = effect.offsetX * px;
    out.ctx.shadowOffsetY = effect.offsetY * px;
    out.ctx.shadowBlur = effect.blur * px;
    out.ctx.drawImage(acc.canvas, 0, 0);
    out.ctx.shadowColor = 'transparent';
    out.ctx.shadowBlur = 0;
    out.ctx.shadowOffsetX = 0;
    out.ctx.shadowOffsetY = 0;
    out.ctx.drawImage(acc.canvas, 0, 0);
    return out;
  }
  if (effect.type === 'glow') {
    const tint = makeOffscreen(acc.canvas.width, acc.canvas.height);
    if (!tint) return null;
    tint.ctx.drawImage(acc.canvas, 0, 0);
    tint.ctx.globalCompositeOperation = 'source-in';
    tint.ctx.fillStyle = effect.color;
    tint.ctx.fillRect(0, 0, tint.canvas.width, tint.canvas.height);
    const out = makeOffscreen(acc.canvas.width, acc.canvas.height);
    if (!out) return null;
    out.ctx.globalAlpha = effect.opacity;
    out.ctx.filter = effect.blur * px < 0.5 ? 'none' : `blur(${effect.blur * px}px)`;
    out.ctx.drawImage(tint.canvas, 0, 0);
    out.ctx.filter = 'none';
    out.ctx.globalAlpha = 1;
    out.ctx.drawImage(acc.canvas, 0, 0);
    return out;
  }
  if (effect.type === 'innerShadow') {
    const shadowOnly = makeOffscreen(acc.canvas.width, acc.canvas.height);
    if (!shadowOnly) return null;
    shadowOnly.ctx.shadowColor = hexToRgba(effect.color, effect.opacity);
    shadowOnly.ctx.shadowOffsetX = effect.offsetX * px;
    shadowOnly.ctx.shadowOffsetY = effect.offsetY * px;
    shadowOnly.ctx.shadowBlur = effect.blur * px;
    shadowOnly.ctx.drawImage(acc.canvas, 0, 0);
    shadowOnly.ctx.shadowColor = 'transparent';
    shadowOnly.ctx.shadowBlur = 0;
    shadowOnly.ctx.shadowOffsetX = 0;
    shadowOnly.ctx.shadowOffsetY = 0;
    shadowOnly.ctx.globalCompositeOperation = 'destination-out';
    shadowOnly.ctx.drawImage(acc.canvas, 0, 0);
    const out = makeOffscreen(acc.canvas.width, acc.canvas.height);
    if (!out) return null;
    out.ctx.drawImage(acc.canvas, 0, 0);
    out.ctx.globalCompositeOperation = 'source-atop';
    out.ctx.drawImage(shadowOnly.canvas, 0, 0);
    out.ctx.globalCompositeOperation = 'source-over';
    return out;
  }
  if (effect.type === 'extrude') {
    const out = makeOffscreen(acc.canvas.width, acc.canvas.height);
    if (!out) return null;
    const dir = { x: Math.cos(effect.angle), y: Math.sin(effect.angle) };
    const stepDepth = (effect.depth / effect.steps) * px;
    for (let step = effect.steps; step >= 1; step -= 1) {
      out.ctx.drawImage(acc.canvas, dir.x * stepDepth * step, dir.y * stepDepth * step);
      out.ctx.globalCompositeOperation = 'source-atop';
      const shade = 0.15 + 0.45 * ((step - 1) / Math.max(1, effect.steps - 1));
      out.ctx.fillStyle = `rgba(0, 0, 0, ${shade.toFixed(3)})`;
      out.ctx.fillRect(0, 0, out.canvas.width, out.canvas.height);
      out.ctx.globalCompositeOperation = 'source-over';
    }
    out.ctx.drawImage(acc.canvas, 0, 0);
    return out;
  }
  if (effect.type === 'svgFilter' && effect.filterType === 'colorMatrix') {
    const values = typeof effect.params.matrix === 'string' ? effect.params.matrix.split(/[\s,]+/).map(Number) : [];
    if (values.length !== 20 || values.some((v) => !Number.isFinite(v))) return null;
    const image = acc.ctx.getImageData(0, 0, acc.canvas.width, acc.canvas.height);
    const data = image.data;
    const src = new Uint8ClampedArray(data);
    for (let i = 0; i < data.length; i += 4) {
      const r = src[i]! / 255, g = src[i + 1]! / 255, b = src[i + 2]! / 255, a = src[i + 3]! / 255;
      data[i] = (values[0]! * r + values[1]! * g + values[2]! * b + values[3]! * a + values[4]!) * 255;
      data[i + 1] = (values[5]! * r + values[6]! * g + values[7]! * b + values[8]! * a + values[9]!) * 255;
      data[i + 2] = (values[10]! * r + values[11]! * g + values[12]! * b + values[13]! * a + values[14]!) * 255;
      data[i + 3] = (values[15]! * r + values[16]! * g + values[17]! * b + values[18]! * a + values[19]!) * 255;
    }
    acc.ctx.putImageData(image, 0, 0);
    return null;
  }
  // turbulence has no Canvas equivalent — skipped (ADR-009).
  return null;
}

// ─── Mesh gradient fill (FX-021, limited variant per ADR-009) ─────────────────

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [0, 0, 0];
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Bilinear interpolation across the 3×3 color grid at normalized (u, v). */
function meshColorAt(colors: readonly (readonly string[])[], u: number, v: number): string {
  const gu = u * 2;
  const gv = v * 2;
  const x0 = Math.min(1, Math.floor(gu));
  const y0 = Math.min(1, Math.floor(gv));
  const tx = gu - x0;
  const ty = gv - y0;
  const c00 = parseHex(colors[y0]![x0]!);
  const c10 = parseHex(colors[y0]![Math.min(2, x0 + 1)]!);
  const c01 = parseHex(colors[Math.min(2, y0 + 1)]![x0]!);
  const c11 = parseHex(colors[Math.min(2, y0 + 1)]![Math.min(2, x0 + 1)]!);
  const rgb = [0, 1, 2].map((channel) => Math.round(lerp(lerp(c00[channel]!, c10[channel]!, tx), lerp(c01[channel]!, c11[channel]!, tx), ty)));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function meshAverageColor(colors: readonly (readonly string[])[]): string {
  return meshColorAt(colors, 0.5, 0.5);
}

const meshTileCache = new Map<string, HTMLCanvasElement>();

/**
 * Render the mesh gradient into a tile canvas matching the object's local
 * bounding box; used through createPattern so it aligns with object space.
 */
export function buildMeshTile(colors: readonly (readonly string[])[], width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const key = `${colors.map((row) => row.join(',')).join('|')}|${Math.round(width)}x${Math.round(height)}`;
  const cached = meshTileCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.min(512, Math.ceil(width)));
  canvas.height = Math.max(1, Math.min(512, Math.ceil(height)));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const cells = 24;
  const cellW = canvas.width / cells;
  const cellH = canvas.height / cells;
  for (let cy = 0; cy < cells; cy += 1) {
    for (let cx = 0; cx < cells; cx += 1) {
      ctx.fillStyle = meshColorAt(colors, (cx + 0.5) / cells, (cy + 0.5) / cells);
      ctx.fillRect(cx * cellW, cy * cellH, cellW + 1, cellH + 1);
    }
  }
  meshTileCache.set(key, canvas);
  return canvas;
}

/** First visible effect of the given type, or null. */
export function effectOf<T extends LiveEffect['type']>(style: ObjectStyle, type: T): Extract<LiveEffect, { type: T }> | null {
  const found = visibleEffects(style).find((effect) => effect.type === type);
  return (found as Extract<LiveEffect, { type: T }> | undefined) ?? null;
}
