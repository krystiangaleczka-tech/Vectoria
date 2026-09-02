/** Categories per epic contract: every imported element is counted exactly once. */
export type ImportCategory = 'editable' | 'simplified' | 'flattened' | 'unsupported';

export interface ImportReportEntry {
  readonly category: ImportCategory;
  readonly code: string;            // np. 'svg.filter.unsupported', 'svg.transform.non-affine'
  readonly message: string;
  readonly layerId?: string;
  readonly objectId?: string;
  readonly sourceRef?: string;      // np. XPath/tag źródłowego elementu
}

export interface ImportReport {
  readonly editable: number;
  readonly simplified: number;
  readonly flattened: number;
  readonly unsupported: number;
  readonly entries: readonly ImportReportEntry[];
}

export const emptyImportReport = (): ImportReport => ({ editable: 0, simplified: 0, flattened: 0, unsupported: 0, entries: [] });

export function countReport(entries: readonly ImportReportEntry[]): ImportReport {
  let editable = 0, simplified = 0, flattened = 0, unsupported = 0;
  for (const entry of entries) {
    if (entry.category === 'editable') editable += 1;
    else if (entry.category === 'simplified') simplified += 1;
    else if (entry.category === 'flattened') flattened += 1;
    else if (entry.category === 'unsupported') unsupported += 1;
  }
  return { editable, simplified, flattened, unsupported, entries };
}

// Interfejs do ujednoliconego importu (np. przyszły PDF, AI)
export interface ImportIRNode {
  readonly type: string;
  // Struktura będzie zdefiniowana w przyszłości
}

export interface ImportIR {
  readonly schemaVersion: number;
  readonly nodes: readonly ImportIRNode[];
  readonly report: ImportReport;
}
