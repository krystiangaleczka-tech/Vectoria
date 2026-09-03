import { describe, it, expect } from 'vitest';
import { sanitizeSvg } from '../src/svg/sanitizer.js';

describe('SVG Sanitizer — URI filters', () => {
  it('strips vbscript: in href and returns svg.uri.blocked warning', () => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg"><a href="vbscript:alert(1)"><rect width="10" height="10"/></a></svg>';
    const result = sanitizeSvg(input);
    expect(result.text).not.toContain('vbscript:');
    expect(result.warnings.some((w) => w.code === 'svg.uri.blocked')).toBe(true);
  });

  it('strips non-image data: URIs such as data:text/html', () => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="/></svg>';
    const result = sanitizeSvg(input);
    expect(result.text).not.toContain('data:text/html');
    expect(result.warnings.some((w) => w.code === 'svg.uri.blocked')).toBe(true);
  });

  it('preserves valid raster data: URIs (e.g. PNG) without warning', () => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="/></svg>';
    const result = sanitizeSvg(input);
    expect(result.text).toContain('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
    expect(result.warnings.some((w) => w.code === 'svg.uri.blocked')).toBe(false);
  });

  it('strips data:image/svg+xml URIs because SVG can carry scripts', () => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxzY3JpcHQ+YWxlcnQoMSk8L3NjcmlwdD48L3N2Zz4="/></svg>';
    const result = sanitizeSvg(input);
    expect(result.text).not.toContain('data:image/svg+xml');
    expect(result.warnings.some((w) => w.code === 'svg.uri.blocked')).toBe(true);
  });
});
