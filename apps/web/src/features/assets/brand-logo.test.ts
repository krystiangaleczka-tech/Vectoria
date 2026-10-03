import { describe, expect, it } from 'vitest';
import { inferImageMimeType, isSvgBrandLogoFile } from './brand-logo.js';

describe('Brand Kit logo helpers', () => {
  it('preserves raster MIME types from data URLs', () => {
    expect(inferImageMimeType('data:image/jpeg;base64,AAAA')).toBe('image/jpeg');
    expect(inferImageMimeType('data:image/webp;base64,AAAA')).toBe('image/webp');
    expect(inferImageMimeType('data:image/png;base64,AAAA')).toBe('image/png');
  });

  it('infers common image MIME types from URLs without pretending unknown formats are PNG', () => {
    expect(inferImageMimeType('https://cdn.example.com/logo.JPEG?rev=2')).toBe('image/jpeg');
    expect(inferImageMimeType('/assets/logo.webp#preview')).toBe('image/webp');
    expect(inferImageMimeType('/assets/logo.svg')).toBe('image/svg+xml');
    expect(inferImageMimeType('/assets/logo.bin')).toBeUndefined();
  });

  it('recognizes SVG uploads by MIME type or file extension', () => {
    expect(isSvgBrandLogoFile({ name: 'brand-mark.bin', type: 'image/svg+xml' })).toBe(true);
    expect(isSvgBrandLogoFile({ name: 'brand-mark.SVG', type: '' })).toBe(true);
    expect(isSvgBrandLogoFile({ name: 'brand-mark.png', type: 'image/png' })).toBe(false);
  });
});
