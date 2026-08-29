import type { PathNode, PathObject } from '../model/types.js';
import { generateId } from '@vectoria/shared';
import { createTransform } from '../model/transform.js';
import { defaultObjectStyle } from '../model/factory.js';

export interface TraceOptions {
  readonly mode?: 'black-and-white' | 'color';
  readonly threshold?: number; // 0 - 255 (default 128)
  readonly colorCount?: number; // 2 - 16 (default 4 for color mode)
  readonly simplifyTolerance?: number; // 0.5 - 10 (default 1.5)
  readonly minArea?: number; // min bounding box area to keep contour (default 4)
}

export interface PixelBuffer {
  readonly data: Uint8ClampedArray | Uint8Array | readonly number[];
  readonly width: number;
  readonly height: number;
}

interface Point2D {
  x: number;
  y: number;
}

/**
 * Traces a pixel bitmap into scalable vector PathObjects.
 * Supports Black & White binary thresholding (ASSET-016) and
 * Multi-color quantization for logos (ASSET-017).
 */
export function traceImageToPaths(
  pixels: PixelBuffer,
  options: TraceOptions = {},
  shouldCancel?: () => boolean,
): PathObject[] {
  const width = pixels.width;
  const height = pixels.height;
  if (width <= 0 || height <= 0 || pixels.data.length < width * height * 4) {
    return [];
  }

  if (shouldCancel?.()) return [];

  const mode = options.mode ?? 'black-and-white';
  const threshold = options.threshold ?? 128;
  const colorCount = Math.max(2, Math.min(16, options.colorCount ?? 4));
  const tolerance = Math.max(0.5, options.simplifyTolerance ?? 1.5);
  const minArea = Math.max(1, options.minArea ?? 4);

  if (mode === 'black-and-white') {
    const binary = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = pixels.data[i * 4]!;
      const g = pixels.data[i * 4 + 1]!;
      const b = pixels.data[i * 4 + 2]!;
      const a = pixels.data[i * 4 + 3]!;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      binary[i] = a >= 128 && lum < threshold ? 1 : 0;
    }

    if (shouldCancel?.()) return [];

    const contours = extractContoursFromBinary(binary, width, height, minArea);
    if (contours.length === 0 || shouldCancel?.()) return [];

    return contours.map((contour, index) => {
      const simplified = simplifyPolylineRDP(contour, tolerance);
      const nodes = pointsToPathNodes(simplified);
      return {
        id: generateId(),
        name: `Trace Path ${index + 1}`,
        layerId: '',
        visible: true,
        locked: false,
        type: 'path',
        transform: createTransform({ x: 0, y: 0 }),
        style: {
          ...defaultObjectStyle,
          fill: { type: 'solid', color: '#000000' },
          stroke: null,
        },
        closed: true,
        nodes,
      };
    });
  }

  // Multi-color trace (quantization)
  const clusters = quantizeColors(pixels, colorCount);
  if (shouldCancel?.()) return [];
  const resultPaths: PathObject[] = [];

  for (let c = 0; c < clusters.length; c++) {
    if (shouldCancel?.()) return [];
    const cluster = clusters[c]!;
    const binary = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const a = pixels.data[i * 4 + 3]!;
      if (a < 128) {
        binary[i] = 0;
      } else {
        const assigned = findNearestCluster(
          pixels.data[i * 4]!,
          pixels.data[i * 4 + 1]!,
          pixels.data[i * 4 + 2]!,
          clusters,
        );
        binary[i] = assigned === c ? 1 : 0;
      }
    }

    const contours = extractContoursFromBinary(binary, width, height, minArea);
    for (let k = 0; k < contours.length; k++) {
      const simplified = simplifyPolylineRDP(contours[k]!, tolerance);
      const nodes = pointsToPathNodes(simplified);
      resultPaths.push({
        id: generateId(),
        name: `Logo Color ${c + 1} - Path ${k + 1}`,
        layerId: '',
        visible: true,
        locked: false,
        type: 'path',
        transform: createTransform({ x: 0, y: 0 }),
        style: {
          ...defaultObjectStyle,
          fill: { type: 'solid', color: cluster.hex },
          stroke: null,
        },
        closed: true,
        nodes,
      });
    }
  }

  return resultPaths;
}

interface ColorCluster {
  r: number;
  g: number;
  b: number;
  hex: string;
}

function quantizeColors(pixels: PixelBuffer, k: number): ColorCluster[] {
  const samples: [number, number, number][] = [];
  const totalPixels = pixels.width * pixels.height;
  const step = Math.max(1, Math.floor(totalPixels / 2000));

  for (let i = 0; i < totalPixels; i += step) {
    const a = pixels.data[i * 4 + 3]!;
    if (a >= 128) {
      samples.push([
        pixels.data[i * 4]!,
        pixels.data[i * 4 + 1]!,
        pixels.data[i * 4 + 2]!,
      ]);
    }
  }

  if (samples.length === 0) {
    return [{ r: 0, g: 0, b: 0, hex: '#000000' }];
  }

  // Initialize k centroids evenly across samples
  const centroids: [number, number, number][] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor((i * samples.length) / k);
    centroids.push([...samples[idx]!]);
  }

  // 4 iterations of k-means
  for (let iter = 0; iter < 4; iter++) {
    const sums = centroids.map(() => [0, 0, 0, 0]); // r, g, b, count
    for (const [r, g, b] of samples) {
      let bestDist = Infinity;
      let bestIdx = 0;
      for (let c = 0; c < centroids.length; c++) {
        const [cr, cg, cb] = centroids[c]!;
        const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = c;
        }
      }
      const sum = sums[bestIdx];
      if (sum) {
        sum[0] = (sum[0] ?? 0) + r;
        sum[1] = (sum[1] ?? 0) + g;
        sum[2] = (sum[2] ?? 0) + b;
        sum[3] = (sum[3] ?? 0) + 1;
      }
    }

    for (let c = 0; c < centroids.length; c++) {
      const count = sums[c]![3]!;
      if (count > 0) {
        centroids[c] = [
          Math.round(sums[c]![0]! / count),
          Math.round(sums[c]![1]! / count),
          Math.round(sums[c]![2]! / count),
        ];
      }
    }
  }

  return centroids.map(([r, g, b]) => ({
    r,
    g,
    b,
    hex: rgbToHex(r, g, b),
  }));
}

function findNearestCluster(r: number, g: number, b: number, clusters: ColorCluster[]): number {
  let bestDist = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i]!;
    const dist = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Extracts closed contour polylines from a 2D binary grid using Marching Squares.
 */
function extractContoursFromBinary(
  binary: Uint8Array,
  width: number,
  height: number,
  minArea: number,
): Point2D[][] {
  const visitedEdges = new Set<string>();
  const contours: Point2D[][] = [];

  const getCell = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    return binary[y * width + x] ?? 0;
  };

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const tl = getCell(x, y);
      const tr = getCell(x + 1, y);
      const br = getCell(x + 1, y + 1);
      const bl = getCell(x, y + 1);

      const cellIndex = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (cellIndex === 0 || cellIndex === 15) continue;

      const edgeKey = `${x},${y}`;
      if (visitedEdges.has(edgeKey)) continue;

      // Trace perimeter starting at (x, y)
      const contour = traceContourBoundary(binary, width, height, x, y, visitedEdges);
      if (contour.length >= 3) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const p of contour) {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        }
        if ((maxX - minX) * (maxY - minY) >= minArea) {
          contours.push(contour);
        }
      }
    }
  }

  return contours;
}

function traceContourBoundary(
  binary: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: Set<string>,
): Point2D[] {
  const points: Point2D[] = [];
  let currX = startX;
  let currY = startY;
  const maxSteps = width * height;
  let steps = 0;

  const dx = [1, 0, -1, 0];
  const dy = [0, 1, 0, -1];
  let dir = 0;

  const isSolid = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return binary[y * width + x] === 1;
  };

  while (steps++ < maxSteps) {
    visited.add(`${currX},${currY}`);
    points.push({ x: currX, y: currY });

    // Turn right and search clockwise for next boundary pixel
    let found = false;
    for (let i = 0; i < 4; i++) {
      const nextDir = (dir + 3 + i) % 4;
      const nx = currX + dx[nextDir]!;
      const ny = currY + dy[nextDir]!;
      if (isSolid(nx, ny)) {
        currX = nx;
        currY = ny;
        dir = nextDir;
        found = true;
        break;
      }
    }

    if (!found || (currX === startX && currY === startY && steps > 2)) {
      break;
    }
  }

  return points;
}

/**
 * Ramer-Douglas-Peucker polyline simplification.
 */
function simplifyPolylineRDP(points: Point2D[], tolerance: number): Point2D[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const start = points[0]!;
  const end = points[points.length - 1]!;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i]!, start, end);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPolylineRDP(points.slice(0, index + 1), tolerance);
    const right = simplifyPolylineRDP(points.slice(index), tolerance);
    return left.slice(0, -1).concat(right);
  }

  return [start, end];
}

function perpendicularDistance(p: Point2D, lineA: Point2D, lineB: Point2D): number {
  const dx = lineB.x - lineA.x;
  const dy = lineB.y - lineA.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x - lineA.x, p.y - lineA.y);
  const t = Math.max(0, Math.min(1, ((p.x - lineA.x) * dx + (p.y - lineA.y) * dy) / lengthSq));
  return Math.hypot(p.x - (lineA.x + t * dx), p.y - (lineA.y + t * dy));
}

function pointsToPathNodes(points: Point2D[]): PathNode[] {
  if (points.length === 0) return [];
  const nodes: PathNode[] = [];

  for (let i = 0; i < points.length; i++) {
    const curr = points[i]!;
    const prev = points[(i - 1 + points.length) % points.length]!;
    const next = points[(i + 1) % points.length]!;

    const tanX = (next.x - prev.x) / 6;
    const tanY = (next.y - prev.y) / 6;

    nodes.push({
      id: generateId(),
      point: { x: curr.x, y: curr.y },
      kind: 'smooth',
      inHandle: { x: curr.x - tanX, y: curr.y - tanY },
      outHandle: { x: curr.x + tanX, y: curr.y + tanY },
    });
  }

  return nodes;
}
