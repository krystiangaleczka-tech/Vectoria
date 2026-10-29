import type { ImportReport } from '@vectoria/core';

/**
 * Evidence about reported import events. These are not file-level or
 * object-level fidelity percentages: importers can report several events per
 * object and may not know the number of source objects.
 */
export interface FidelityEvidence {
  readonly status: 'ok' | 'ok-partial' | 'unsupported' | 'rejected';
  readonly objectCount: number;
  readonly report: Pick<ImportReport, 'editable' | 'simplified' | 'flattened' | 'unsupported'>;
}

export interface FidelityEvidenceSummary {
  readonly scope: 'report-events-only';
  readonly importedObjects: number;
  readonly reportEvents: number;
  readonly editableEvents: number;
  readonly degradedEvents: number;
  readonly editableEventRatio: number | null;
  readonly degradedEventRatio: number | null;
  readonly sourceObjectFidelityRatio: null;
  readonly outcome: FidelityEvidence['status'];
}

export function summarizeFidelityEvidence(input: FidelityEvidence): FidelityEvidenceSummary {
  const { editable, simplified, flattened, unsupported } = input.report;
  const counts = [input.objectCount, editable, simplified, flattened, unsupported];
  if (counts.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error('Fidelity counters must be non-negative safe integers');
  }

  const reportEvents = editable + simplified + flattened + unsupported;
  if (!Number.isSafeInteger(reportEvents)) throw new Error('Fidelity counter overflow');
  const degradedEvents = simplified + flattened + unsupported;

  return {
    scope: 'report-events-only',
    importedObjects: input.objectCount,
    reportEvents,
    editableEvents: editable,
    degradedEvents,
    editableEventRatio: reportEvents > 0 ? editable / reportEvents : null,
    degradedEventRatio: reportEvents > 0 ? degradedEvents / reportEvents : null,
    sourceObjectFidelityRatio: null,
    outcome: input.status,
  };
}
