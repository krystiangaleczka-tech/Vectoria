import { FormatProviderRegistry, svgProvider, epsProvider, cdrProvider, aiProvider, importVctFile, importPdf } from '@vectoria/io';
import { countReport } from '@vectoria/core';

export const importRegistry = new FormatProviderRegistry();

importRegistry.register(svgProvider);
importRegistry.register(epsProvider);
importRegistry.register(cdrProvider);
importRegistry.register(aiProvider);

// PDF provider (ASSET-005 & IO-012)
importRegistry.register({
  id: 'pdf',
  label: 'Dokument PDF (.pdf)',
  canImport: (file) => file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf',
  async import(file, options) {
    options?.onProgress?.('read', 0.2);
    const buffer = await file.arrayBuffer();
    options?.onProgress?.('parse', 0.5);
    const { objects, pageCount } = await importPdf(buffer);
    options?.onProgress?.('report', 0.9);
    return {
      status: 'ok-partial',
      objects,
      report: countReport(objects.map((o) => ({
        category: 'editable' as const,
        code: 'pdf.vector.extracted',
        message: `Zaimportowano obiekt wektorowy ${o.type} z PDF (stron: ${pageCount})`,
      }))),
    };
  },
});

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
