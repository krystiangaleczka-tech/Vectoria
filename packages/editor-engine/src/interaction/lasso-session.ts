import type { Vec2 } from '@vectoria/shared';

export class LassoSession {
  private _polygon: Vec2[] = [];
  
  constructor(startPoint: Vec2) {
    this._polygon.push(startPoint);
  }

  get polygon(): readonly Vec2[] {
    return this._polygon;
  }

  update(currentPoint: Vec2): void {
    const lastPoint = this._polygon[this._polygon.length - 1];
    if (lastPoint && Math.hypot(currentPoint.x - lastPoint.x, currentPoint.y - lastPoint.y) > 2) {
      this._polygon.push(currentPoint);
    }
  }

  finish(): readonly Vec2[] {
    return this._polygon;
  }
}
