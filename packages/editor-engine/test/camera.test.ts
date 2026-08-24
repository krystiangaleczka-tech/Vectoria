import { describe, it, expect } from 'vitest';
import { Camera } from '../src/index.js';
import { vec2 } from '@vectoria/shared';

describe('Camera Coordinate Transforms & Navigation', () => {
  it('guarantees worldToScreen(screenToWorld(p)) roundtrip within 1e-6 tolerance', () => {
    const camera = new Camera();
    camera.panBy({ x: 250, y: -180 });
    camera.zoomAtPoint(2.5, { x: 500, y: 400 });

    const testPoints = [
      vec2(0, 0),
      vec2(100, 200),
      vec2(-450.5, 890.25),
      vec2(1920, 1080),
    ];

    for (const screenP of testPoints) {
      const worldP = camera.screenToWorld(screenP);
      const restoredScreenP = camera.worldToScreen(worldP);

      expect(restoredScreenP.x).toBeCloseTo(screenP.x, 5);
      expect(restoredScreenP.y).toBeCloseTo(screenP.y, 5);
    }
  });

  it('keeps world point directly under cursor during zoomAtPoint', () => {
    const camera = new Camera();
    camera.setPan({ x: 100, y: 150 });

    const cursorScreen = vec2(400, 300);
    const worldBefore = camera.screenToWorld(cursorScreen);

    // Zoom in
    camera.zoomAtPoint(1.5, cursorScreen);
    const worldAfter = camera.screenToWorld(cursorScreen);

    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 5);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 5);
  });

  it('round-trips coordinates when camera is rotated', () => {
    const camera = new Camera();
    camera.setPan({ x: 120, y: 80 });
    camera.setRotation(Math.PI / 6);
    camera.setZoom(1.75, { x: 800, y: 600 });
    const point = { x: 240, y: -90 };
    const screen = camera.worldToScreen(point);
    expect(camera.screenToWorld(screen).x).toBeCloseTo(point.x, 5);
    expect(camera.screenToWorld(screen).y).toBeCloseTo(point.y, 5);
  });

  it('returns bounds covering rotated viewport corners', () => {
    const camera = new Camera();
    camera.setRotation(Math.PI / 4);
    const visible = camera.getVisibleWorldRect({ x: 200, y: 100 });
    expect(visible.width).toBeCloseTo(visible.height, 5);
    expect(visible.width).toBeGreaterThan(200);
  });
});
