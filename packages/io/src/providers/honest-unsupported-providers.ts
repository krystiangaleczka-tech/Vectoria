import type { FormatProvider, ProviderResult } from './format-provider.js';
import { parseCdr } from '../cdr/cdr-parser.js';
import { parseEps } from '../eps/eps-parser.js';
import { importAi } from '../ai/ai-importer.js';

export const cdrProvider: FormatProvider = {
  id: 'cdr',
  label: 'CorelDRAW (.cdr)',
  canImport: (file) => file.name.toLowerCase().endsWith('.cdr') || file.type === 'application/x-coreldraw',

  async import(file: File): Promise<ProviderResult> {
    const buffer = await file.arrayBuffer();
    const result = await parseCdr(buffer);

    return {
      status: 'ok-partial',
      objects: result.objects,
      report: result.report,
    };
  },
};

export const epsProvider: FormatProvider = {
  id: 'eps',
  label: 'Encapsulated PostScript (.eps)',
  canImport: (file) => file.name.toLowerCase().endsWith('.eps') || file.type === 'application/postscript',

  async import(file: File): Promise<ProviderResult> {
    const buffer = await file.arrayBuffer();
    const result = parseEps(buffer);

    return {
      status: 'ok-partial',
      objects: result.objects,
      report: result.report,
    };
  },
};

/**
 * Format provider for Adobe Illustrator (.ai) files providing native vector recovery.
 */
export const aiProvider: FormatProvider = {
  id: 'ai',
  label: 'Adobe Illustrator (.ai)',
  canImport: (file) => file.name.toLowerCase().endsWith('.ai'),

  async import(file: File): Promise<ProviderResult> {
    const buffer = await file.arrayBuffer();
    const result = await importAi(buffer);

    return {
      status: 'ok-partial',
      objects: result.objects,
      report: result.report,
    };
  },
};
