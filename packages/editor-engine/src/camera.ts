import { clamp } from '@vectoria/shared';
import type { Vec2, Rect } from '@vectoria/shared';

export const MIN_ZOOM = 0.01; // 1%
export const MAX_ZOOM = 64;   // 6400%

/**
 * Camera controls the viewport transformation between world space and screen space.
 *
 * Screen space: CSS pixels relative to the canvas container.
 * World space: logical document coordinates.
 */
export class Camera {
  /** Camera pan offset in screen space. */
  private _pan: Vec2 = { x: 0, y: 0 };

  /** Zoom level (1 = 100%). */
  private _zoom = 1;

  /** Callback when camera changes. */
  private _onChanged: (() => void) | null = null;

  get pan(): Vec2 {
    return this._pan;
  }

  get zoom(): number {
    return this._zoom;
  }

  get zoomPercent(): number {
    return Math.round(this._zoom * 100);
  }

  set onChanged(callback: (() => void) | null) {
    this._onChanged = callback;
  }

  /**
   * Convert a point from world space to screen space.
   */
  worldToScreen(worldPoint: Vec2): Vec2 {
    return {
      x: worldPoint.x * this._zoom + this._pan.x,
      y: worldPoint.y * this._zoom + this._pan.y,
    };
  }

  /**
   * Convert a point from screen space to world space.
   */
  screenToWorld(screenPoint: Vec2): Vec2 {
    return {
      x: (screenPoint.x - this._pan.x) / this._zoom,
      y: (screenPoint.y - this._pan.y) / this._zoom,
    };
  }

  /**
   * Convert a screen-space distance to world-space distance.
   */
  screenToWorldDistance(screenDistance: number): number {
    return screenDistance / this._zoom;
  }

  /**
   * Pan the camera by a screen-space delta.
   */
  panBy(deltaScreen: Vec2): void {
    this._pan = {
      x: this._pan.x + deltaScreen.x,
      y: this._pan.y + deltaScreen.y,
    };
    this._onChanged?.();
  }

  /**
   * Set the camera pan directly.
   */
  setPan(pan: Vec2): void {
    this._pan = pan;
    this._onChanged?.();
  }

  /**
   * Zoom relative to a screen-space point (keeps that world point under cursor).
   *
   * Formula:
   *   worldBefore = screenToWorld(pointerScreen)
   *   zoom' = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM)
   *   pan' = pointerScreen - worldBefore * zoom'
   */
  zoomAtPoint(factor: number, screenPoint: Vec2): void {
    const worldBefore = this.screenToWorld(screenPoint);
    this._zoom = clamp(this._zoom * factor, MIN_ZOOM, MAX_ZOOM);

    this._pan = {
      x: screenPoint.x - worldBefore.x * this._zoom,
      y: screenPoint.y - worldBefore.y * this._zoom,
    };
    this._onChanged?.();
  }

  /**
   * Set zoom level directly, maintaining center of the viewport.
   */
  setZoom(zoom: number, viewportSize: Vec2): void {
    const center: Vec2 = { x: viewportSize.x / 2, y: viewportSize.y / 2 };
    const worldCenter = this.screenToWorld(center);
    this._zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);

    this._pan = {
      x: center.x - worldCenter.x * this._zoom,
      y: center.y - worldCenter.y * this._zoom,
    };
    this._onChanged?.();
  }

  /**
   * Fit a world-space rectangle into the viewport with optional padding.
   */
  fitRect(worldRect: Rect, viewportSize: Vec2, padding = 40): void {
    const availableWidth = viewportSize.x - padding * 2;
    const availableHeight = viewportSize.y - padding * 2;

    if (availableWidth <= 0 || availableHeight <= 0) return;

    const scaleX = availableWidth / worldRect.width;
    const scaleY = availableHeight / worldRect.height;
    this._zoom = clamp(Math.min(scaleX, scaleY), MIN_ZOOM, MAX_ZOOM);

    // Center the rect in the viewport
    const centerX = worldRect.x + worldRect.width / 2;
    const centerY = worldRect.y + worldRect.height / 2;

    this._pan = {
      x: viewportSize.x / 2 - centerX * this._zoom,
      y: viewportSize.y / 2 - centerY * this._zoom,
    };
    this._onChanged?.();
  }

  /**
   * Zoom to 100% centered on a viewport.
   */
  zoomTo100(viewportSize: Vec2): void {
    this.setZoom(1, viewportSize);
  }

  /**
   * Get the visible world-space rectangle for the current viewport.
   */
  getVisibleWorldRect(viewportSize: Vec2): Rect {
    const topLeft = this.screenToWorld({ x: 0, y: 0 });
    const bottomRight = this.screenToWorld(viewportSize);

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }
}
