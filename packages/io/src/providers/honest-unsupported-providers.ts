import { countReport } from '@vectoria/core';
import type { FormatProvider, ProviderResult } from './format-provider.js';

export const cdrProvider: FormatProvider = {
  id: 'cdr',
  label: 'CorelDRAW (.cdr)',
  canImport: (file) => file.name.toLowerCase().endsWith('.cdr') || file.type === 'application/x-coreldraw',
  
  async import(file: File): Promise<ProviderResult> {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const isCdr = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x58; // 'RIFX'
    if (!isCdr) throw new Error('Plik nie jest poprawnym dokumentem CDR');
    
    return {
      status: 'unsupported',
      report: countReport([{
        category: 'unsupported',
        code: 'cdr.parser.p2',
        message: 'Natywny import CDR jest w przygotowaniu. Zapisz plik jako AI z kompatybilnością PDF lub jako SVG i zaimportuj ponownie.',
      }]),
    };
  },
};

export const epsProvider: FormatProvider = {
  id: 'eps',
  label: 'Encapsulated PostScript (.eps)',
  canImport: (file) => file.name.toLowerCase().endsWith('.eps') || file.type === 'application/postscript',
  
  async import(file: File): Promise<ProviderResult> {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const isEps = head[0] === 0x25 && head[1] === 0x21 && head[2] === 0x50 && head[3] === 0x53; // '%!PS'
    if (!isEps && file.name.toLowerCase().endsWith('.eps')) {
      // EPS files sometimes have a DOS EPS header (C5 D0 D3 C6) or standard text
    }
    
    return {
      status: 'unsupported',
      report: countReport([{
        category: 'unsupported',
        code: 'eps.parser.p2',
        message: 'Natywny import EPS jest w przygotowaniu. Przekonwertuj plik na SVG lub PDF i zaimportuj ponownie.',
      }]),
    };
  },
};
