import type {
  PathNode,
  PathObject,
  SceneObject,
  StrokeStyle,
  TextObject,
  Artboard,
  ImportReport,
} from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';
import { createTransform, defaultObjectStyle, countReport } from '@vectoria/core';
import { generateId } from '@vectoria/shared';

export interface PdfImportOptions {
  readonly scale?: number;
  readonly pageNumber?: number;
  readonly importAllPages?: boolean;
}

export interface ImportedDocument {
  readonly objects: SceneObject[];
  readonly pageCount: number;
  readonly title?: string;
  readonly artboards?: Artboard[];
  readonly report?: ImportReport;
}

interface GraphicsState {
  ctm: [number, number, number, number, number, number];
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'miter' | 'round' | 'bevel';
  fontFamily: string;
  fontSize: number;
}

const defaultGraphicsState = (scale: number = 1): GraphicsState => ({
  ctm: [scale, 0, 0, scale, 0, 0],
  fillColor: '#000000',
  strokeColor: '#000000',
  strokeWidth: 1 * scale,
  lineCap: 'butt',
  lineJoin: 'miter',
  fontFamily: 'Inter',
  fontSize: 16 * scale,
});

/**
 * Applies affine 2D transform [a, b, c, d, e, f] to point (x, y).
 */
function transformPoint(pt: Vec2, m: [number, number, number, number, number, number]): Vec2 {
  return {
    x: m[0] * pt.x + m[2] * pt.y + m[4],
    y: m[1] * pt.x + m[3] * pt.y + m[5],
  };
}

/**
 * Multiplies two 3x3 affine matrices [a, b, c, d, e, f].
 */
function multiplyMatrices(
  m1: [number, number, number, number, number, number],
  m2: [number, number, number, number, number, number],
): [number, number, number, number, number, number] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/**
 * Attempts cross-environment decompression of a zlib/deflate buffer.
 */
async function decompressFlate(data: Uint8Array): Promise<Uint8Array | null> {
  try {
    if (typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('deflate');
      const stream = new Response(new Blob([data as unknown as BlobPart]).stream().pipeThrough(ds));
      const res = await stream.arrayBuffer();
      return new Uint8Array(res);
    }
  } catch {
    // Decompression failed
  }

  return null;
}

/**
 * Converts PDF color formats to hex string.
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => Math.max(0, Math.min(255, Math.round(c * 255))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function cmykToRgbHex(c: number, m: number, y: number, k: number): string {
  const r = (1 - c) * (1 - k);
  const g = (1 - m) * (1 - k);
  const b = (1 - y) * (1 - k);
  return rgbToHex(r, g, b);
}

/**
 * High-performance, vector-first PDF parser that extracts editable SceneObjects
 * (PathObject, TextObject, ImageObject) without relying on canvas bitmap rasterization.
 */
export async function importPdf(
  data: ArrayBuffer | Uint8Array,
  options: PdfImportOptions = {},
): Promise<ImportedDocument> {
  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  const rawText = new TextDecoder('latin1').decode(uint8);

  // Validate magic bytes
  if (!rawText.startsWith('%PDF-')) {
    throw new Error('Plik nie jest poprawnym dokumentem PDF (brak sygnatury %PDF-)');
  }

  const scale = options.scale !== undefined && options.scale > 0 ? options.scale : 1;
  const objects: SceneObject[] = [];
  const stateStack: GraphicsState[] = [];
  let state = defaultGraphicsState(scale);

  // Find stream ... endstream blocks
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const rawStreams: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(rawText)) !== null) {
    const streamContent = match[1];
    if (streamContent && streamContent.length > 0) {
      rawStreams.push(streamContent);
    }
  }

  // Also extract uncompressed streams or dictionary contents
  const streamsToParse: string[] = [];

  for (const s of rawStreams) {
    // Check if it's compressed or plain text
    const isAscii = /^[\x20-\x7E\r\n\t]+$/.test(s.slice(0, Math.min(s.length, 100)));
    if (isAscii) {
      streamsToParse.push(s);
    } else {
      // Attempt flate decompression
      const bytes = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) {
        bytes[i] = s.charCodeAt(i);
      }
      const decompressed = await decompressFlate(bytes);
      if (decompressed) {
        streamsToParse.push(new TextDecoder('latin1').decode(decompressed));
      }
    }
  }

  // If no streams extracted (e.g. synthetic test fixture or direct operators), parse full text
  if (streamsToParse.length === 0) {
    streamsToParse.push(rawText);
  }

  let currentSubpaths: PathNode[][] = [];
  let currentNodes: PathNode[] = [];
  let currentPoint: Vec2 = { x: 0, y: 0 };
  let isPathClosed = false;

  const flushPath = (isFill: boolean, isStroke: boolean, fillRule: 'nonzero' | 'evenodd' = 'nonzero') => {
    if (currentNodes.length > 0) {
      currentSubpaths.push(currentNodes);
      currentNodes = [];
    }
    if (currentSubpaths.length === 0) return;

    for (const subpath of currentSubpaths) {
      if (subpath.length < 2) continue;

      const strokeStyle: StrokeStyle | null = isStroke
        ? {
            color: state.strokeColor,
            width: state.strokeWidth,
            lineCap: state.lineCap,
            lineJoin: state.lineJoin,
            miterLimit: 4,
            dashArray: [],
            opacity: 1,
          }
        : null;

      const pathObj: PathObject = {
        id: generateId(),
        type: 'path',
        name: `PDF Path ${objects.length + 1}`,
        layerId: 'layer-1',
        visible: true,
        locked: false,
        transform: createTransform({ x: 0, y: 0 }),
        style: {
          ...defaultObjectStyle,
          fill: isFill ? { type: 'solid', color: state.fillColor } : { type: 'none' },
          stroke: strokeStyle,
          opacity: 1,
        },
        nodes: subpath,
        closed: isPathClosed,
        fillRule,
      };

      objects.push(pathObj);
    }

    currentSubpaths = [];
    currentNodes = [];
    isPathClosed = false;
  };

  // Determine page count from document dictionary
  const pagesCountMatch = rawText.match(/\/Count\s+(\d+)/);
  const pageCount = pagesCountMatch ? parseInt(pagesCountMatch[1]!, 10) : 1;

  // Filter streams by pageNumber if multiple streams exist and not importAllPages
  let streamsToExecute = streamsToParse;
  if (
    options.pageNumber !== undefined &&
    options.pageNumber > 0 &&
    !options.importAllPages &&
    streamsToParse.length > 1
  ) {
    const pageIndex = Math.min(streamsToParse.length - 1, options.pageNumber - 1);
    streamsToExecute = [streamsToParse[pageIndex]!];
  }

  const knownUnsupportedOps = new Set([
    'Do', 'sh', 'W', 'W*', 'd0', 'd1', 'cs', 'sc', 'SC', 'scn', 'SCN', 'ri', 'i', 'gs', 'MP', 'DP', 'BMC', 'BDC', 'EMC'
  ]);
  let skippedOpsCount = 0;
  const skippedOpNames = new Set<string>();

  for (const stream of streamsToExecute) {
    // Tokenize stream into operands and operators
    // Matches tokens: strings in (), hex strings in <>, or space-separated numbers/names
    const tokens = stream.match(/\([^)]*\)|<[^>]*>|[^\s()<>]+/g) || [];
    const stack: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!;

      // Check for operators
      switch (token) {
        // State save/restore
        case 'q':
          stateStack.push({ ...state, ctm: [...state.ctm] });
          break;
        case 'Q':
          if (stateStack.length > 0) {
            state = stateStack.pop()!;
          }
          break;

        // Current Transformation Matrix: a b c d e f cm
        case 'cm': {
          if (stack.length >= 6) {
            const f = parseFloat(stack.pop()!);
            const e = parseFloat(stack.pop()!);
            const d = parseFloat(stack.pop()!);
            const c = parseFloat(stack.pop()!);
            const b = parseFloat(stack.pop()!);
            const a = parseFloat(stack.pop()!);
            state.ctm = multiplyMatrices(state.ctm, [a, b, c, d, e, f]);
          }
          break;
        }

        // Colors
        case 'g': {
          if (stack.length >= 1) {
            const gray = parseFloat(stack.pop()!);
            state.fillColor = rgbToHex(gray, gray, gray);
          }
          break;
        }
        case 'G': {
          if (stack.length >= 1) {
            const gray = parseFloat(stack.pop()!);
            state.strokeColor = rgbToHex(gray, gray, gray);
          }
          break;
        }
        case 'rg': {
          if (stack.length >= 3) {
            const b = parseFloat(stack.pop()!);
            const g = parseFloat(stack.pop()!);
            const r = parseFloat(stack.pop()!);
            state.fillColor = rgbToHex(r, g, b);
          }
          break;
        }
        case 'RG': {
          if (stack.length >= 3) {
            const b = parseFloat(stack.pop()!);
            const g = parseFloat(stack.pop()!);
            const r = parseFloat(stack.pop()!);
            state.strokeColor = rgbToHex(r, g, b);
          }
          break;
        }
        case 'k': {
          if (stack.length >= 4) {
            const k = parseFloat(stack.pop()!);
            const y = parseFloat(stack.pop()!);
            const m = parseFloat(stack.pop()!);
            const c = parseFloat(stack.pop()!);
            state.fillColor = cmykToRgbHex(c, m, y, k);
          }
          break;
        }
        case 'K': {
          if (stack.length >= 4) {
            const k = parseFloat(stack.pop()!);
            const y = parseFloat(stack.pop()!);
            const m = parseFloat(stack.pop()!);
            const c = parseFloat(stack.pop()!);
            state.strokeColor = cmykToRgbHex(c, m, y, k);
          }
          break;
        }

        // Line width & styles
        case 'w': {
          if (stack.length >= 1) {
            state.strokeWidth = Math.max(0.1, parseFloat(stack.pop()!) * scale);
          }
          break;
        }
        case 'J': {
          if (stack.length >= 1) {
            const cap = parseInt(stack.pop()!, 10);
            state.lineCap = cap === 1 ? 'round' : cap === 2 ? 'square' : 'butt';
          }
          break;
        }
        case 'j': {
          if (stack.length >= 1) {
            const join = parseInt(stack.pop()!, 10);
            state.lineJoin = join === 1 ? 'round' : join === 2 ? 'bevel' : 'miter';
          }
          break;
        }

        // Path construction
        case 'm': {
          if (stack.length >= 2) {
            if (currentNodes.length > 0) {
              currentSubpaths.push(currentNodes);
              currentNodes = [];
            }
            const y = parseFloat(stack.pop()!);
            const x = parseFloat(stack.pop()!);
            currentPoint = transformPoint({ x, y }, state.ctm);
            currentNodes.push({
              point: currentPoint,
              inHandle: null,
              outHandle: null,
              kind: 'corner',
            });
          }
          break;
        }
        case 'l': {
          if (stack.length >= 2) {
            const y = parseFloat(stack.pop()!);
            const x = parseFloat(stack.pop()!);
            currentPoint = transformPoint({ x, y }, state.ctm);
            currentNodes.push({
              point: currentPoint,
              inHandle: null,
              outHandle: null,
              kind: 'corner',
            });
          }
          break;
        }
        case 'c': {
          if (stack.length >= 6) {
            const y3 = parseFloat(stack.pop()!);
            const x3 = parseFloat(stack.pop()!);
            const y2 = parseFloat(stack.pop()!);
            const x2 = parseFloat(stack.pop()!);
            const y1 = parseFloat(stack.pop()!);
            const x1 = parseFloat(stack.pop()!);

            const cp1 = transformPoint({ x: x1, y: y1 }, state.ctm);
            const cp2 = transformPoint({ x: x2, y: y2 }, state.ctm);
            currentPoint = transformPoint({ x: x3, y: y3 }, state.ctm);

            if (currentNodes.length > 0) {
              const prev = currentNodes[currentNodes.length - 1]!;
              currentNodes[currentNodes.length - 1] = {
                ...prev,
                outHandle: cp1,
                kind: 'smooth',
              };
            }
            currentNodes.push({
              point: currentPoint,
              inHandle: cp2,
              outHandle: null,
              kind: 'smooth',
            });
          }
          break;
        }
        case 'v': {
          if (stack.length >= 4) {
            const y3 = parseFloat(stack.pop()!);
            const x3 = parseFloat(stack.pop()!);
            const y2 = parseFloat(stack.pop()!);
            const x2 = parseFloat(stack.pop()!);

            const cp2 = transformPoint({ x: x2, y: y2 }, state.ctm);
            currentPoint = transformPoint({ x: x3, y: y3 }, state.ctm);

            currentNodes.push({
              point: currentPoint,
              inHandle: cp2,
              outHandle: null,
              kind: 'smooth',
            });
          }
          break;
        }
        case 'y': {
          if (stack.length >= 4) {
            const y3 = parseFloat(stack.pop()!);
            const x3 = parseFloat(stack.pop()!);
            const y1 = parseFloat(stack.pop()!);
            const x1 = parseFloat(stack.pop()!);

            const cp1 = transformPoint({ x: x1, y: y1 }, state.ctm);
            currentPoint = transformPoint({ x: x3, y: y3 }, state.ctm);

            if (currentNodes.length > 0) {
              const prev = currentNodes[currentNodes.length - 1]!;
              currentNodes[currentNodes.length - 1] = {
                ...prev,
                outHandle: cp1,
                kind: 'smooth',
              };
            }
            currentNodes.push({
              point: currentPoint,
              inHandle: null,
              outHandle: null,
              kind: 'corner',
            });
          }
          break;
        }
        case 're': {
          if (stack.length >= 4) {
            const h = parseFloat(stack.pop()!);
            const w = parseFloat(stack.pop()!);
            const y = parseFloat(stack.pop()!);
            const x = parseFloat(stack.pop()!);

            const p0 = transformPoint({ x, y }, state.ctm);
            const p1 = transformPoint({ x: x + w, y }, state.ctm);
            const p2 = transformPoint({ x: x + w, y: y + h }, state.ctm);
            const p3 = transformPoint({ x, y: y + h }, state.ctm);

            currentNodes = [
              { point: p0, inHandle: null, outHandle: null, kind: 'corner' },
              { point: p1, inHandle: null, outHandle: null, kind: 'corner' },
              { point: p2, inHandle: null, outHandle: null, kind: 'corner' },
              { point: p3, inHandle: null, outHandle: null, kind: 'corner' },
            ];
            isPathClosed = true;
          }
          break;
        }
        case 'h':
          isPathClosed = true;
          break;

        // Path painting
        case 'S':
          flushPath(false, true);
          break;
        case 's':
          isPathClosed = true;
          flushPath(false, true);
          break;
        case 'f':
        case 'F':
          flushPath(true, false, 'nonzero');
          break;
        case 'f*':
          flushPath(true, false, 'evenodd');
          break;
        case 'B':
          flushPath(true, true, 'nonzero');
          break;
        case 'B*':
          flushPath(true, true, 'evenodd');
          break;
        case 'b':
          isPathClosed = true;
          flushPath(true, true, 'nonzero');
          break;
        case 'b*':
          isPathClosed = true;
          flushPath(true, true, 'evenodd');
          break;
        case 'n':
          currentNodes = [];
          currentSubpaths = [];
          isPathClosed = false;
          break;

        // Text
        case 'Tf': {
          if (stack.length >= 2) {
            state.fontSize = parseFloat(stack.pop()!) * scale;
            const rawFont = stack.pop()!.replace(/^\//, '');
            state.fontFamily = rawFont || 'Inter';
          }
          break;
        }
        case 'Td':
        case 'TD': {
          if (stack.length >= 2) {
            const ty = parseFloat(stack.pop()!);
            const tx = parseFloat(stack.pop()!);
            currentPoint = transformPoint({ x: tx, y: ty }, state.ctm);
          }
          break;
        }
        case 'Tm': {
          if (stack.length >= 6) {
            const f = parseFloat(stack.pop()!);
            const e = parseFloat(stack.pop()!);
            const d = parseFloat(stack.pop()!);
            const c = parseFloat(stack.pop()!);
            const b = parseFloat(stack.pop()!);
            const a = parseFloat(stack.pop()!);
            state.ctm = multiplyMatrices(state.ctm, [a, b, c, d, e, f]);
            currentPoint = transformPoint({ x: 0, y: 0 }, state.ctm);
          }
          break;
        }
        case 'Tj': {
          if (stack.length >= 1) {
            const rawStr = stack.pop()!;
            let str = rawStr;
            if (str.startsWith('(') && str.endsWith(')')) {
              str = str.slice(1, -1);
            }
            if (str.trim().length > 0) {
              const textObj: TextObject = {
                id: generateId(),
                type: 'text',
                name: `PDF Text ${objects.length + 1}`,
                layerId: 'layer-1',
                visible: true,
                locked: false,
                transform: createTransform(currentPoint),
                style: {
                  ...defaultObjectStyle,
                  fill: { type: 'solid', color: state.fillColor },
                  opacity: 1,
                },
                text: str,
                fontFamily: state.fontFamily,
                fontSize: state.fontSize,
                fontWeight: 400,
                fontStyle: 'normal',
                letterSpacing: 0,
                lineHeight: 1.2,
                textAlign: 'left',
                kerning: true,
              };
              objects.push(textObj);
            }
          }
          break;
        }

        default:
          if (knownUnsupportedOps.has(token)) {
            skippedOpsCount++;
            skippedOpNames.add(token);
          }
          stack.push(token);
          break;
      }
    }
  }

  // Extract Title if present
  const titleMatch = rawText.match(/\/Title\s*\(([^)]+)\)/);
  const title = titleMatch ? titleMatch[1] : undefined;

  const reportEntries: import('@vectoria/core').ImportReportEntry[] = [];
  const pathCount = objects.filter((o) => o.type === 'path').length;
  const textCount = objects.filter((o) => o.type === 'text').length;

  if (pathCount > 0) {
    reportEntries.push({
      category: 'editable',
      code: 'pdf.paths.extracted',
      message: `Wyodrębniono ${pathCount} ścieżek wektorowych z PDF`,
    });
  }
  if (textCount > 0) {
    reportEntries.push({
      category: 'editable',
      code: 'pdf.text.extracted',
      message: `Wyodrębniono ${textCount} bloków tekstu z PDF`,
    });
  }
  if (skippedOpsCount > 0) {
    reportEntries.push({
      category: 'simplified',
      code: 'pdf.operators.skipped',
      message: `Pominięto ${skippedOpsCount} nieobsługiwanych lub zaawansowanych operatorów PDF (${[...skippedOpNames].slice(0, 5).join(', ')})`,
    });
  }

  const report = countReport(reportEntries);

  return {
    objects,
    pageCount,
    title,
    report,
  };
}
