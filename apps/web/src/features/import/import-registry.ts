import { FormatProviderRegistry, svgProvider, epsProvider, cdrProvider, aiProvider, importVctFile } from '@vectoria/io';
import { countReport } from '@vectoria/core';

export const importRegistry = new FormatProviderRegistry();

importRegistry.register(svgProvider);
importRegistry.register(epsProvider);
importRegistry.register(cdrProvider);
importRegistry.register(aiProvider);

// VCT provider
importRegistry.register({
  id: 'vct',
  label: 'Projekt Vectoria (.vct)',
  canImport: (file) => file.name.toLowerCase().endsWith('.vct') || file.type === 'application/x-vectoria-vct',
  async import(file, options) {
    options?.onProgress?.('read', 0.2);
    const document = await importVctFile(file);
    return {
      status: 'ok',
      document,
      report: countReport([]), // brak błędów = pusty raport
    };
  }
});
