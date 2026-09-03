import type {
  PathNode,
  PathObject,
  SceneObject,
  StrokeStyle,
  TextObject,
} from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';
import { createTransform, defaultObjectStyle, countReport, type ImportReport } from '@vectoria/core';
import { generateId } from '@vectoria/shared';

interface PsGraphicsState {
  fillColor: string;
  strokeColor: string;
  lineWidth: number;
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'miter' | 'round' | 'bevel';
  transform: [number, number, number, number, number, number]; // 2D affine
}

function defaultPsState(): PsGraphicsState {
  return {
    fillColor: '#000000',
    strokeColor: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    transform: [1, 0, 0, 1, 0, 0],
  };
}

function transformPoint(pt: Vec2, m: [number, number, number, number, number, number]): Vec2 {
  return {
    x: m[0] * pt.x + m[2] * pt.y + m[4],
    y: m[1] * pt.x + m[3] * pt.y + m[5],
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => Math.max(0, Math.min(255, Math.round(c * 255))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Robust PostScript / EPS vector parser.
 * Extracts vector paths, curves, text, and strokes from Encapsulated PostScript streams.
 */
export function parseEps(content: string | ArrayBuffer | Uint8Array): { objects: SceneObject[]; report: ImportReport } {
  const text =
    typeof content === 'string'
      ? content
      : new TextDecoder('latin1').decode(content instanceof Uint8Array ? content : new Uint8Array(content));

  if (!text.includes('%!PS')) {
    throw new Error('Plik nie jest poprawnym dokumentem PostScript/EPS (brak nagłówka %!PS)');
  }

  const objects: SceneObject[] = [];
  const stateStack: PsGraphicsState[] = [];
  let state = defaultPsState();

  let currentSubpaths: PathNode[][] = [];
  let currentNodes: PathNode[] = [];
  let currentPoint: Vec2 = { x: 0, y: 0 };
  let isPathClosed = false;

  const flushPath = (isFill: boolean, isStroke: boolean) => {
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
            width: state.lineWidth,
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
        name: `EPS Path ${objects.length + 1}`,
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
      };

      objects.push(pathObj);
    }

    currentSubpaths = [];
    currentNodes = [];
    isPathClosed = false;
  };

  // Tokenize PostScript tokens
  const tokens = text.match(/\([^)]*\)|<[^>]*>|[^\s()<>]+/g) || [];
  const stack: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;

    switch (token) {
      case 'gsave':
        stateStack.push({ ...state, transform: [...state.transform] });
        break;
      case 'grestore':
        if (stateStack.length > 0) {
          state = stateStack.pop()!;
        }
        break;

      // Color operators
      case 'setgray':
      case 'g':
      case 'G': {
        if (stack.length >= 1) {
          const val = parseFloat(stack.pop()!);
          const hex = rgbToHex(val, val, val);
          state.fillColor = hex;
          state.strokeColor = hex;
        }
        break;
      }
      case 'setrgbcolor':
      case 'rg':
      case 'RG': {
        if (stack.length >= 3) {
          const b = parseFloat(stack.pop()!);
          const g = parseFloat(stack.pop()!);
          const r = parseFloat(stack.pop()!);
          const hex = rgbToHex(r, g, b);
          state.fillColor = hex;
          state.strokeColor = hex;
        }
        break;
      }

      // Line width
      case 'setlinewidth':
      case 'w': {
        if (stack.length >= 1) {
          state.lineWidth = Math.max(0.1, parseFloat(stack.pop()!));
        }
        break;
      }

      // Path construction
      case 'moveto':
      case 'm': {
        if (stack.length >= 2) {
          if (currentNodes.length > 0) {
            currentSubpaths.push(currentNodes);
            currentNodes = [];
          }
          const y = parseFloat(stack.pop()!);
          const x = parseFloat(stack.pop()!);
          currentPoint = transformPoint({ x, y }, state.transform);
          currentNodes.push({
            point: currentPoint,
            inHandle: null,
            outHandle: null,
            kind: 'corner',
          });
        }
        break;
      }
      case 'lineto':
      case 'l': {
        if (stack.length >= 2) {
          const y = parseFloat(stack.pop()!);
          const x = parseFloat(stack.pop()!);
          currentPoint = transformPoint({ x, y }, state.transform);
          currentNodes.push({
            point: currentPoint,
            inHandle: null,
            outHandle: null,
            kind: 'corner',
          });
        }
        break;
      }
      case 'curveto':
      case 'c': {
        if (stack.length >= 6) {
          const y3 = parseFloat(stack.pop()!);
          const x3 = parseFloat(stack.pop()!);
          const y2 = parseFloat(stack.pop()!);
          const x2 = parseFloat(stack.pop()!);
          const y1 = parseFloat(stack.pop()!);
          const x1 = parseFloat(stack.pop()!);

          const cp1 = transformPoint({ x: x1, y: y1 }, state.transform);
          const cp2 = transformPoint({ x: x2, y: y2 }, state.transform);
          currentPoint = transformPoint({ x: x3, y: y3 }, state.transform);

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
      case 'closepath':
      case 'h':
        isPathClosed = true;
        break;

      // Painting
      case 'stroke':
      case 'S':
        flushPath(false, true);
        break;
      case 'fill':
      case 'f':
      case 'F':
        flushPath(true, false);
        break;
      case 'fillstroke':
      case 'B':
      case 'b':
        flushPath(true, true);
        break;
      case 'newpath':
      case 'n':
        currentNodes = [];
        currentSubpaths = [];
        isPathClosed = false;
        break;

      // Text
      case 'show': {
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
              name: `EPS Text ${objects.length + 1}`,
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
              fontFamily: 'Helvetica',
              fontSize: 14,
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
        stack.push(token);
        break;
    }
  }

  const report = countReport(
    objects.map((o) => ({
      category: 'editable' as const,
      code: 'eps.vector.extracted',
      message: `Wyodrębniono obiekt wektorowy ${o.type}`,
    })),
  );

  return { objects, report };
}
