import type { ObjectId } from '@vectoria/core';
import { getCodePoints } from '@vectoria/core';

export class TextEditSession {
  private readonly targetId: ObjectId;
  private textDraft: string;
  private caretIndex: number; // Unicode code point index
  private selectionRange: [number, number] | null = null; // [start, end] code points

  constructor(targetId: ObjectId, initialText: string, initialCaretIndex?: number) {
    this.targetId = targetId;
    this.textDraft = initialText;
    const cps = getCodePoints(initialText);
    this.caretIndex = typeof initialCaretIndex === 'number'
      ? Math.max(0, Math.min(cps.length, initialCaretIndex))
      : cps.length;
  }

  get targetObjectId(): ObjectId {
    return this.targetId;
  }

  get text(): string {
    return this.textDraft;
  }

  get caret(): number {
    return this.caretIndex;
  }

  get selection(): [number, number] | null {
    return this.selectionRange;
  }

  get totalCodePoints(): number {
    return getCodePoints(this.textDraft).length;
  }

  insertText(inserted: string): void {
    const cps = getCodePoints(this.textDraft);
    const insertedCps = getCodePoints(inserted);

    if (this.selectionRange) {
      const [start, end] = this.normalizedSelection(this.selectionRange);
      cps.splice(start, end - start, ...insertedCps);
      this.caretIndex = start + insertedCps.length;
      this.selectionRange = null;
    } else {
      cps.splice(this.caretIndex, 0, ...insertedCps);
      this.caretIndex += insertedCps.length;
    }

    this.textDraft = cps.join('');
  }

  deleteBackward(): void {
    const cps = getCodePoints(this.textDraft);
    if (this.selectionRange) {
      const [start, end] = this.normalizedSelection(this.selectionRange);
      cps.splice(start, end - start);
      this.caretIndex = start;
      this.selectionRange = null;
      this.textDraft = cps.join('');
    } else if (this.caretIndex > 0) {
      cps.splice(this.caretIndex - 1, 1);
      this.caretIndex -= 1;
      this.textDraft = cps.join('');
    }
  }

  deleteForward(): void {
    const cps = getCodePoints(this.textDraft);
    if (this.selectionRange) {
      const [start, end] = this.normalizedSelection(this.selectionRange);
      cps.splice(start, end - start);
      this.caretIndex = start;
      this.selectionRange = null;
      this.textDraft = cps.join('');
    } else if (this.caretIndex < cps.length) {
      cps.splice(this.caretIndex, 1);
      this.textDraft = cps.join('');
    }
  }

  moveCaret(
    direction: 'left' | 'right' | 'home' | 'end',
    extendSelection: boolean = false,
  ): void {
    const total = this.totalCodePoints;
    const oldCaret = this.caretIndex;
    let nextCaret = oldCaret;

    switch (direction) {
      case 'left':
        nextCaret = Math.max(0, oldCaret - 1);
        break;
      case 'right':
        nextCaret = Math.min(total, oldCaret + 1);
        break;
      case 'home':
        nextCaret = 0;
        break;
      case 'end':
        nextCaret = total;
        break;
    }

    if (extendSelection) {
      const anchor = this.selectionRange ? this.selectionRange[0] : oldCaret;
      this.selectionRange = anchor === nextCaret ? null : [anchor, nextCaret];
    } else {
      this.selectionRange = null;
    }

    this.caretIndex = nextCaret;
  }

  /** Move caret between newline-delimited lines while preserving its code-point column. */
  moveCaretVertical(direction: 'up' | 'down', extendSelection = false): void {
    const codePoints = getCodePoints(this.textDraft);
    const lines: Array<{ start: number; end: number }> = [];
    let start = 0;
    for (let index = 0; index <= codePoints.length; index += 1) {
      if (index === codePoints.length || codePoints[index] === '\n') {
        lines.push({ start, end: index });
        start = index + 1;
      }
    }
    const lineIndex = lines.findIndex((line) => this.caretIndex >= line.start && this.caretIndex <= line.end);
    if (lineIndex < 0) return;
    const targetIndex = direction === 'up' ? lineIndex - 1 : lineIndex + 1;
    const target = lines[targetIndex];
    if (!target) return;
    const current = lines[lineIndex]!;
    const column = this.caretIndex - current.start;
    const nextCaret = Math.min(target.end, target.start + column);
    if (extendSelection) {
      const anchor = this.selectionRange ? this.selectionRange[0] : this.caretIndex;
      this.selectionRange = anchor === nextCaret ? null : [anchor, nextCaret];
    } else {
      this.selectionRange = null;
    }
    this.caretIndex = nextCaret;
  }

  setSelection(startCp: number, endCp: number): void {
    const total = this.totalCodePoints;
    const clampedStart = Math.max(0, Math.min(total, startCp));
    const clampedEnd = Math.max(0, Math.min(total, endCp));
    this.selectionRange = clampedStart === clampedEnd ? null : [clampedStart, clampedEnd];
    this.caretIndex = clampedEnd;
  }

  selectAll(): void {
    const total = this.totalCodePoints;
    if (total === 0) return;
    this.selectionRange = [0, total];
    this.caretIndex = total;
  }

  selectWordAt(cpIndex: number): void {
    const cps = getCodePoints(this.textDraft);
    if (cps.length === 0) return;

    let start = Math.max(0, Math.min(cps.length - 1, cpIndex));
    while (start > 0 && !/\s|[.,/#!$%^&*;:{}=\-_`~()]/.test(cps[start - 1]!)) {
      start -= 1;
    }

    let end = cpIndex;
    while (end < cps.length && !/\s|[.,/#!$%^&*;:{}=\-_`~()]/.test(cps[end]!)) {
      end += 1;
    }

    if (start < end) {
      this.selectionRange = [start, end];
      this.caretIndex = end;
    }
  }

  selectParagraphAt(cpIndex: number): void {
    const cps = getCodePoints(this.textDraft);
    if (cps.length === 0) return;

    let start = Math.max(0, Math.min(cps.length - 1, cpIndex));
    while (start > 0 && cps[start - 1] !== '\n') {
      start -= 1;
    }

    let end = cpIndex;
    while (end < cps.length && cps[end] !== '\n') {
      end += 1;
    }

    this.selectionRange = [start, end];
    this.caretIndex = end;
  }

  getSelectedText(): string {
    if (!this.selectionRange) return '';
    const [start, end] = this.normalizedSelection(this.selectionRange);
    const cps = getCodePoints(this.textDraft);
    return cps.slice(start, end).join('');
  }

  private normalizedSelection(range: [number, number]): [number, number] {
    const [a, b] = range;
    return [Math.min(a, b), Math.max(a, b)];
  }
}
