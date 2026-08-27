import type { Vec2 } from '@vectoria/shared';
import { generateId } from '@vectoria/shared';
import type { TextObject, TextFrameObject } from '@vectoria/core';
import {
  createTextObject,
  createTextFrameObject,
  CreateTextObjectCommand,
  CreateTextFrameCommand,
  type Command,
} from '@vectoria/core';

export interface TextToolPreview {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly isFrame: boolean;
}

export interface TextToolCommitResult {
  readonly command: Command;
  readonly objectId: string;
  readonly isFrame: boolean;
}

/**
 * TextTool manages interactive creation of Artistic Text (on click)
 * and Paragraph Text Frames (on drag).
 */
export class TextTool {
  private startPoint: Vec2 | null = null;
  private currentPoint: Vec2 | null = null;
  private isInteracting: boolean = false;

  get isBusy(): boolean {
    return this.isInteracting;
  }

  get preview(): TextToolPreview | null {
    if (!this.startPoint || !this.currentPoint) return null;
    const minX = Math.min(this.startPoint.x, this.currentPoint.x);
    const minY = Math.min(this.startPoint.y, this.currentPoint.y);
    const width = Math.abs(this.currentPoint.x - this.startPoint.x);
    const height = Math.abs(this.currentPoint.y - this.startPoint.y);
    const isFrame = width >= 5 || height >= 5;

    return {
      x: minX,
      y: minY,
      width,
      height,
      isFrame,
    };
  }

  pointerDown(worldPoint: Vec2): void {
    this.startPoint = worldPoint;
    this.currentPoint = worldPoint;
    this.isInteracting = true;
  }

  pointerMove(worldPoint: Vec2): void {
    if (!this.isInteracting) return;
    this.currentPoint = worldPoint;
  }

  pointerUp(
    worldPoint: Vec2,
    layerId: string,
    options: {
      fontFamily?: string;
      fontSize?: number;
      defaultText?: string;
    } = {},
  ): TextToolCommitResult | null {
    if (!this.startPoint) return null;
    const endPoint = worldPoint;
    const dx = Math.abs(endPoint.x - this.startPoint.x);
    const dy = Math.abs(endPoint.y - this.startPoint.y);
    const isDrag = dx >= 5 || dy >= 5;

    const id = generateId();
    let result: TextToolCommitResult;

    if (isDrag) {
      const minX = Math.min(this.startPoint.x, endPoint.x);
      const minY = Math.min(this.startPoint.y, endPoint.y);
      const width = Math.max(20, dx);
      const height = Math.max(20, dy);

      const frameObj: TextFrameObject = createTextFrameObject(
        id,
        layerId,
        options.defaultText || 'Type your text here...',
        width,
        height,
        {
          transform: {
            position: { x: minX, y: minY },
            rotation: 0,
            scale: { x: 1, y: 1 },
            skew: { x: 0, y: 0 },
            pivot: { x: 0, y: 0 },
          },
          fontFamily: options.fontFamily,
          fontSize: options.fontSize,
        },
      );

      result = {
        command: new CreateTextFrameCommand(frameObj),
        objectId: id,
        isFrame: true,
      };
    } else {
      const textObj: TextObject = createTextObject(
        id,
        layerId,
        options.defaultText || 'Text',
        {
          transform: {
            position: { x: this.startPoint.x, y: this.startPoint.y },
            rotation: 0,
            scale: { x: 1, y: 1 },
            skew: { x: 0, y: 0 },
            pivot: { x: 0, y: 0 },
          },
          fontFamily: options.fontFamily,
          fontSize: options.fontSize,
        },
      );

      result = {
        command: new CreateTextObjectCommand(textObj),
        objectId: id,
        isFrame: false,
      };
    }

    this.cancel();
    return result;
  }

  cancel(): void {
    this.startPoint = null;
    this.currentPoint = null;
    this.isInteracting = false;
  }
}
