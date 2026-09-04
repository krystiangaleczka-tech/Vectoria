import { describe, it, expect } from 'vitest';
import { resolveFileName, slugify } from '../src/features/export/export-naming.js';

describe('export-naming (EXPORT-020, EXPORT-021)', () => {
  it('slugifies string into safe filename parts', () => {
    expect(slugify('My Artboard 1')).toBe('my-artboard-1');
    expect(slugify('Icon / Home @2x')).toBe('icon--home-2x');
    expect(slugify('  ')).toBe('export');
  });

  it('replaces tokens in template string', () => {
    const name = resolveFileName('{artboard}@{scale}x.{ext}', {
      artboard: 'Main Screen',
      scale: 2,
      ext: 'png',
    });
    expect(name).toBe('main-screen@2x.png');
  });

  it('handles layer and object tokens', () => {
    const name = resolveFileName('{layer}_{object}.{format}', {
      layer: 'Icons Layer',
      object: 'Arrow Icon',
      format: 'svg',
      ext: 'svg',
    });
    expect(name).toBe('icons-layer_arrow-icon.svg');
  });

  it('appends extension if missing in template', () => {
    const name = resolveFileName('{artboard}', {
      artboard: 'Poster',
      ext: 'pdf',
    });
    expect(name).toBe('poster.pdf');
  });
});
