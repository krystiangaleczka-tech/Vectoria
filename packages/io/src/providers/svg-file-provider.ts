import type { FormatProvider, ProviderResult, ProviderImportOptions } from './format-provider.js';
import { importSvgWithReport } from '../svg/import.js';

export const svgProvider: FormatProvider = {
  id: 'svg',
  label: 'Plik SVG (.svg)',
  canImport: (file) => file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml',
  
  async import(file: File, options?: ProviderImportOptions): Promise<ProviderResult> {
    options?.onProgress?.('read', 0);
    const text = await file.text();
    
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    options?.onProgress?.('sanitize', 0.3);
    
    // Zrób to w trybie "yield", by nie blokować main thread, jak określono w planie
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    
    options?.onProgress?.('parse', 0.6);
    
    const { document, report } = importSvgWithReport(text, file.name);
    
    options?.onProgress?.('report', 1);
    
    return {
      status: 'ok',
      document,
      report,
    };
  }
};
