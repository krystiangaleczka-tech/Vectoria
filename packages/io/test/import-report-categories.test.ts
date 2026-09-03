// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { importSvgWithReport } from '../src/svg/import.js';

describe('SVG import report categories', () => {
  it('counts editable per mapped object', () => {
    const { report, document } = importSvgWithReport(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="10" height="10"/><circle cx="5" cy="5" r="4"/></svg>',
    );
    expect(report.editable).toBe(2);
    expect(report.flattened).toBe(0);
    expect(Object.keys(document.objects).length).toBe(2);
  });

  it('counts unsupported filters and simplified unresolved fills', () => {
    const { report } = importSvgWithReport(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<filter id="f"><feGaussianBlur/></filter>' +
      '<rect width="10" height="10" fill="url(#missing)"/>' +
      '</svg>',
    );
    expect(report.unsupported).toBeGreaterThanOrEqual(1);
    expect(report.simplified).toBeGreaterThanOrEqual(1);
  });
});
