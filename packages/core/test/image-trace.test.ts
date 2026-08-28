import { describe, it, expect } from 'vitest';
import { traceImageToPaths, type PixelBuffer } from '../src/geometry/image-trace';

describe('Image Tracing Algorithm (EPIC-12)', () => {
  it('traces high-contrast black and white pixel buffer to closed vector paths', () => {
    // Create a 10x10 test image with a 6x6 black square in the middle on white background
    const width = 10;
    const height = 10;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isBlack = x >= 2 && x <= 7 && y >= 2 && y <= 7;
        data[idx] = isBlack ? 0 : 255;
        data[idx + 1] = isBlack ? 0 : 255;
        data[idx + 2] = isBlack ? 0 : 255;
        data[idx + 3] = 255; // Alpha
      }
    }

    const pixels: PixelBuffer = { data, width, height };
    const paths = traceImageToPaths(pixels, { mode: 'black-and-white', threshold: 128, simplifyTolerance: 1.0 });

    expect(paths.length).toBeGreaterThan(0);
    const path = paths[0]!;
    expect(path.closed).toBe(true);
    expect(path.nodes.length).toBeGreaterThanOrEqual(3);
    expect(path.style.fill.type).toBe('solid');
    if (path.style.fill.type === 'solid') {
      expect(path.style.fill.color).toBe('#000000');
    }
  });

  it('traces multi-color logo buffer into separate colored vector paths', () => {
    // 10x10 image with a red region and a blue region
    const width = 10;
    const height = 10;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (x < 5 && y < 5) {
          // Red
          data[idx] = 255;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        } else if (x >= 5 && y >= 5) {
          // Blue
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        } else {
          // Transparent / White
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = 0;
        }
      }
    }

    const pixels: PixelBuffer = { data, width, height };
    const paths = traceImageToPaths(pixels, { mode: 'color', colorCount: 3 });

    expect(paths.length).toBeGreaterThanOrEqual(1);
    for (const p of paths) {
      expect(p.closed).toBe(true);
      expect(p.style.fill.type).toBe('solid');
    }
  });

  it('handles empty / tiny pixel buffer safely without errors', () => {
    expect(traceImageToPaths({ data: new Uint8ClampedArray([]), width: 0, height: 0 })).toEqual([]);
  });
});
