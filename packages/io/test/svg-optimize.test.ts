// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { optimizeSvg } from '../src/export/svg-optimize.js';
import { importSvgToDocument } from '../src/svg/import.js';

describe('optimizeSvg (EXPORT-002)', () => {
  it('strips editor metadata data-vectoria-* and comments', () => {
    const rawSvg = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Created by Vectoria Editor -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M 10.12345 20.67891 L 80.99999 90.00001" stroke="#000" data-vectoria-stroke-align="center" data-vectoria-id="obj-1" />
</svg>`;

    const optimized = optimizeSvg(rawSvg);

    expect(optimized).not.toContain('<!-- Created by Vectoria Editor -->');
    expect(optimized).not.toContain('data-vectoria-stroke-align');
    expect(optimized).not.toContain('data-vectoria-id');
    expect(optimized).toContain('10.12');
    expect(optimized).toContain('20.68');
    expect(optimized).toContain('81');
    expect(optimized).toContain('90');
  });

  it('preserves valid SVG syntax that can be re-imported', () => {
    const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect x="10" y="20" width="100" height="80" fill="#ff0000" data-vectoria-stroke-align="center" />
</svg>`;

    const optimized = optimizeSvg(rawSvg);
    const importedDoc = importSvgToDocument(optimized);

    expect(importedDoc.layerIds.length).toBeGreaterThan(0);
    expect(Object.keys(importedDoc.objects).length).toBeGreaterThan(0);
  });
});
