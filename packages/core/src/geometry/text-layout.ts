import type { Vec2 } from '@vectoria/shared';
import type { TextObject, TextFrameObject, PathNode } from '../model/types.js';

export interface LayoutGlyph {
  readonly char: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly rotation?: number;
  readonly codePointIndex: number;
}

export interface LayoutLine {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly baseline: number;
  readonly columnIndex: number;
  readonly isLastLineOfParagraph: boolean;
  readonly glyphs: readonly LayoutGlyph[];
  readonly listMarker?: {
    readonly text: string;
    readonly x: number;
    readonly y: number;
  };
}

export interface TextLayoutResult {
  readonly width: number;
  readonly height: number;
  readonly lines: readonly LayoutLine[];
  readonly totalCodePoints: number;
}

/**
 * Returns an array of Unicode code points (properly handling surrogate pairs & emoji).
 */
export function getCodePoints(text: string): string[] {
  return Array.from(text);
}

/**
 * Estimate or measure text width using Canvas API or deterministic fallback for headless tests.
 */
export function measureTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string = 'Inter, sans-serif',
  letterSpacing: number = 0,
): number {
  if (text.length === 0) return 0;
  const codePoints = getCodePoints(text);
  const cpCount = codePoints.length;

  let width = 0;
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = `${fontSize}px ${fontFamily}`;
        width = ctx.measureText(text).width;
      }
    } catch {
      width = 0;
    }
  }

  // Fallback for Node / Vitest / headless environment
  if (width === 0) {
    let charWidthSum = 0;
    for (const char of codePoints) {
      if (char === ' ' || char === '\t') charWidthSum += fontSize * 0.28;
      else if (char === 'i' || char === 'l' || char === '.' || char === ',' || char === '!' || char === ':') charWidthSum += fontSize * 0.25;
      else if (char === 'm' || char === 'w' || char === 'M' || char === 'W' || char === '@' || char === '%') charWidthSum += fontSize * 0.85;
      else if (char.charCodeAt(0) > 255) charWidthSum += fontSize * 0.9; // CJK / Emoji
      else if (char >= 'A' && char <= 'Z') charWidthSum += fontSize * 0.65;
      else charWidthSum += fontSize * 0.52;
    }
    width = charWidthSum;
  }

  if (letterSpacing !== 0 && cpCount > 1) {
    width += (cpCount - 1) * letterSpacing;
  }

  return width;
}

/**
 * Compute layout for single-line / free-flow Artistic Text.
 */
export function computeArtisticTextLayout(object: TextObject): TextLayoutResult {
  const codePoints = getCodePoints(object.text);
  const totalCodePoints = codePoints.length;
  if (totalCodePoints === 0) {
    const defaultLineHeight = object.fontSize * (object.lineHeight > 0 ? object.lineHeight : 1.2);
    return {
      width: 0,
      height: defaultLineHeight,
      lines: [{
        text: '',
        x: 0,
        y: 0,
        width: 0,
        height: defaultLineHeight,
        baseline: object.fontSize,
        columnIndex: 0,
        isLastLineOfParagraph: true,
        glyphs: [],
      }],
      totalCodePoints: 0,
    };
  }

  const rawLines = object.text.split('\n');
  const lineSpacing = object.fontSize * (object.lineHeight > 0 ? object.lineHeight : 1.2);
  let maxWidth = 0;
  const layoutLines: LayoutLine[] = [];
  let currentCpOffset = 0;

  for (let lineIdx = 0; lineIdx < rawLines.length; lineIdx += 1) {
    const rawLine = rawLines[lineIdx]!;
    const lineCps = getCodePoints(rawLine);
    const lineWidth = measureTextWidth(rawLine, object.fontSize, object.fontFamily, object.letterSpacing);
    if (lineWidth > maxWidth) maxWidth = lineWidth;

    const glyphs: LayoutGlyph[] = [];
    let currentX = 0;
    for (let cpIdx = 0; cpIdx < lineCps.length; cpIdx += 1) {
      const char = lineCps[cpIdx]!;
      const charW = measureTextWidth(char, object.fontSize, object.fontFamily, 0);
      glyphs.push({
        char,
        x: currentX,
        y: 0,
        width: charW,
        codePointIndex: currentCpOffset + cpIdx,
      });
      currentX += charW + object.letterSpacing;
    }

    // Alignment offset
    let alignOffsetX = 0;
    if (object.textAlign === 'center') alignOffsetX = -lineWidth / 2;
    else if (object.textAlign === 'right') alignOffsetX = -lineWidth;

    const alignedGlyphs = alignOffsetX === 0 ? glyphs : glyphs.map((g) => ({ ...g, x: g.x + alignOffsetX }));

    layoutLines.push({
      text: rawLine,
      x: alignOffsetX,
      y: lineIdx * lineSpacing,
      width: lineWidth,
      height: lineSpacing,
      baseline: lineIdx * lineSpacing + object.fontSize,
      columnIndex: 0,
      isLastLineOfParagraph: true,
      glyphs: alignedGlyphs,
    });

    currentCpOffset += lineCps.length + 1; // +1 for the newline
  }

  return {
    width: maxWidth,
    height: Math.max(lineSpacing, rawLines.length * lineSpacing),
    lines: layoutLines,
    totalCodePoints,
  };
}

/**
 * Compute layout for paragraph text in a bounding frame with word-wrap and multi-column flow.
 */
export function computeTextFrameLayout(object: TextFrameObject): TextLayoutResult {
  const codePoints = getCodePoints(object.text);
  const totalCodePoints = codePoints.length;
  const columnCount = Math.max(1, Math.min(8, object.columnCount || 1));
  const columnGutter = object.columnGutter >= 0 ? object.columnGutter : 16;
  const totalGutter = columnGutter * (columnCount - 1);
  const availableWidth = Math.max(10, (object.width - totalGutter) / columnCount);
  const lineSpacing = object.fontSize * (object.lineHeight > 0 ? object.lineHeight : 1.2);
  const paragraphSpacing = Math.max(0, object.paragraphSpacing || 0);

  if (totalCodePoints === 0) {
    return {
      width: object.width,
      height: object.height,
      lines: [{
        text: '',
        x: 0,
        y: 0,
        width: 0,
        height: lineSpacing,
        baseline: object.fontSize,
        columnIndex: 0,
        isLastLineOfParagraph: true,
        glyphs: [],
      }],
      totalCodePoints: 0,
    };
  }

  const paragraphs = object.text.split('\n');
  const layoutLines: LayoutLine[] = [];
  let currentColumn = 0;
  let currentColumnY = 0;
  let cpOffset = 0;
  let paragraphIndex = 0;

  for (const paragraph of paragraphs) {
    const isFirstParagraph = paragraphIndex === 0;
    if (!isFirstParagraph) {
      currentColumnY += paragraphSpacing;
    }

    const words = paragraph.split(/(\s+)/);
    let currentLineWords: string[] = [];
    let isFirstLineOfPara = true;

    // List marker handling
    let listMarkerWidth = 0;
    let listMarkerText = '';
    if (object.listType === 'bullet') {
      listMarkerText = '•';
      listMarkerWidth = measureTextWidth(listMarkerText + '  ', object.fontSize, object.fontFamily, object.letterSpacing);
    } else if (object.listType === 'numbered') {
      listMarkerText = `${paragraphIndex + 1}.`;
      listMarkerWidth = measureTextWidth(listMarkerText + '  ', object.fontSize, object.fontFamily, object.letterSpacing);
    }

    const firstLineIndent = (object.indent || 0) + listMarkerWidth;
    const regularIndent = listMarkerWidth > 0 ? listMarkerWidth : 0;

    const commitLine = (wordsToCommit: string[], isLastLine: boolean): void => {
      if (wordsToCommit.length === 0 && !isLastLine) return;
      const lineIndent = isFirstLineOfPara ? firstLineIndent : regularIndent;
      const lineAvailableW = Math.max(10, availableWidth - lineIndent);

      // If we exceed column height and have remaining columns, wrap to next column
      if (currentColumnY + lineSpacing > object.height && currentColumn < columnCount - 1) {
        currentColumn += 1;
        currentColumnY = 0;
      }

      const columnX = currentColumn * (availableWidth + columnGutter);
      const lineText = wordsToCommit.join('');
      const lineCps = getCodePoints(lineText);
      const naturalWidth = measureTextWidth(lineText, object.fontSize, object.fontFamily, object.letterSpacing);

      // Justify calculation
      let extraSpacePerGap = 0;
      const isJustified = object.textAlign === 'justify' && !isLastLine;
      const spaceIndices: number[] = [];
      for (let i = 0; i < wordsToCommit.length; i += 1) {
        if (/\s+/.test(wordsToCommit[i]!)) spaceIndices.push(i);
      }
      if (isJustified && spaceIndices.length > 0 && naturalWidth < lineAvailableW) {
        const remainingSpace = lineAvailableW - naturalWidth;
        extraSpacePerGap = remainingSpace / spaceIndices.length;
      }

      // Compute glyphs
      const glyphs: LayoutGlyph[] = [];
      let cursorX = columnX + lineIndent;

      if (object.textAlign === 'center') {
        cursorX += (lineAvailableW - naturalWidth) / 2;
      } else if (object.textAlign === 'right') {
        cursorX += (lineAvailableW - naturalWidth);
      }

      let localCp = 0;
      for (const word of wordsToCommit) {
        const isSpace = /\s+/.test(word);
        const wordCps = getCodePoints(word);
        for (const char of wordCps) {
          const charW = measureTextWidth(char, object.fontSize, object.fontFamily, 0);
          glyphs.push({
            char,
            x: cursorX,
            y: currentColumnY,
            width: charW,
            codePointIndex: cpOffset + localCp,
          });
          cursorX += charW + object.letterSpacing;
          localCp += 1;
        }
        if (isSpace && isJustified) {
          cursorX += extraSpacePerGap;
        }
      }

      layoutLines.push({
        text: lineText,
        x: columnX + lineIndent,
        y: currentColumnY,
        width: naturalWidth,
        height: lineSpacing,
        baseline: currentColumnY + object.fontSize,
        columnIndex: currentColumn,
        isLastLineOfParagraph: isLastLine,
        glyphs,
        listMarker: isFirstLineOfPara && listMarkerText ? {
          text: listMarkerText,
          x: columnX + (object.indent || 0),
          y: currentColumnY + object.fontSize,
        } : undefined,
      });

      currentColumnY += lineSpacing;
      isFirstLineOfPara = false;
      cpOffset += lineCps.length;
    };

    for (let w = 0; w < words.length; w += 1) {
      const word = words[w]!;
      if (word === '') continue;
      const testWords = [...currentLineWords, word];
      const testText = testWords.join('');
      const testWidth = measureTextWidth(testText, object.fontSize, object.fontFamily, object.letterSpacing);
      const lineIndent = isFirstLineOfPara ? firstLineIndent : regularIndent;

      if (testWidth > (availableWidth - lineIndent) && currentLineWords.length > 0) {
        commitLine(currentLineWords, false);
        currentLineWords = [word.trimStart()];
      } else {
        currentLineWords.push(word);
      }
    }

    commitLine(currentLineWords, true);
    cpOffset += 1; // +1 for the newline between paragraphs
    paragraphIndex += 1;
  }

  return {
    width: object.width,
    height: object.height,
    lines: layoutLines,
    totalCodePoints,
  };
}

/**
 * Parameterize a path and place characters along its curve using arc-length sampling.
 */
export function computeTextOnPathLayout(
  object: TextObject,
  pathNodes: readonly PathNode[],
  closed: boolean,
): TextLayoutResult {
  const codePoints = getCodePoints(object.text);
  const totalCodePoints = codePoints.length;
  if (totalCodePoints === 0 || pathNodes.length < 2) {
    return computeArtisticTextLayout(object);
  }

  // Sample discrete points along path segments
  const pathSamples: Array<{ point: Vec2; tangent: Vec2; dist: number }> = [];
  let totalPathLength = 0;

  const count = closed ? pathNodes.length : pathNodes.length - 1;
  for (let i = 0; i < count; i += 1) {
    const n0 = pathNodes[i]!;
    const n1 = pathNodes[(i + 1) % pathNodes.length]!;

    const steps = 30;
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      let pt: Vec2;
      let nextPt: Vec2;

      // Check if bezier or straight line
      if (n0.outHandle || n1.inHandle) {
        const p0 = n0.point;
        const p1 = n0.outHandle ?? n0.point;
        const p2 = n1.inHandle ?? n1.point;
        const p3 = n1.point;
        const mt = 1 - t;
        pt = {
          x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
          y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
        };
        const dt = Math.min(1, t + 0.01);
        const mdt = 1 - dt;
        nextPt = {
          x: mdt * mdt * mdt * p0.x + 3 * mdt * mdt * dt * p1.x + 3 * mdt * dt * dt * p2.x + dt * dt * dt * p3.x,
          y: mdt * mdt * mdt * p0.y + 3 * mdt * mdt * dt * p1.y + 3 * mdt * dt * dt * p2.y + dt * dt * dt * p3.y,
        };
      } else {
        pt = {
          x: n0.point.x + (n1.point.x - n0.point.x) * t,
          y: n0.point.y + (n1.point.y - n0.point.y) * t,
        };
        nextPt = {
          x: n0.point.x + (n1.point.x - n0.point.x) * Math.min(1, t + 0.05),
          y: n0.point.y + (n1.point.y - n0.point.y) * Math.min(1, t + 0.05),
        };
      }

      const dx = nextPt.x - pt.x;
      const dy = nextPt.y - pt.y;
      const len = Math.hypot(dx, dy) || 1;
      const tangent = { x: dx / len, y: dy / len };

      if (pathSamples.length > 0) {
        const prev = pathSamples[pathSamples.length - 1]!;
        totalPathLength += Math.hypot(pt.x - prev.point.x, pt.y - prev.point.y);
      }
      pathSamples.push({ point: pt, tangent, dist: totalPathLength });
    }
  }

  // Distribute glyphs along path by accumulated distance
  const glyphs: LayoutGlyph[] = [];
  let currentDist = 0;

  for (let i = 0; i < codePoints.length; i += 1) {
    const char = codePoints[i]!;
    const charW = measureTextWidth(char, object.fontSize, object.fontFamily, 0);
    const targetDist = currentDist + charW / 2;

    // Find sample closest to targetDist
    let sample = pathSamples[0]!;
    for (const s of pathSamples) {
      if (s.dist >= targetDist) {
        sample = s;
        break;
      }
    }

    const angle = Math.atan2(sample.tangent.y, sample.tangent.x);
    glyphs.push({
      char,
      x: sample.point.x,
      y: sample.point.y,
      width: charW,
      rotation: angle,
      codePointIndex: i,
    });

    currentDist += charW + object.letterSpacing;
    if (currentDist > totalPathLength && !closed) break;
  }

  return {
    width: totalPathLength,
    height: object.fontSize * 1.5,
    lines: [{
      text: object.text,
      x: 0,
      y: 0,
      width: totalPathLength,
      height: object.fontSize * 1.5,
      baseline: object.fontSize,
      columnIndex: 0,
      isLastLineOfParagraph: true,
      glyphs,
    }],
    totalCodePoints,
  };
}
