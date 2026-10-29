// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { emptyImportReport } from '@vectoria/core';
import { summarizeFidelityEvidence } from '../src/providers/fidelity-evidence.js';
import { FORMAT_CORPUS, runFormatCorpusFixture } from './fixtures/format-corpus.js';

describe('VEC017: honest fidelity evidence metrics', () => {
  it('counts import report events without claiming source-object fidelity', () => {
    const summary = summarizeFidelityEvidence({
      status: 'ok-partial',
      objectCount: 2,
      report: { ...emptyImportReport(), editable: 2, simplified: 1, flattened: 1, unsupported: 1 },
    });
    expect(summary.reportEvents).toBe(5);
    expect(summary.editableEventRatio).toBeCloseTo(0.4);
    expect(summary.degradedEventRatio).toBeCloseTo(0.6);
    expect(summary.importedObjects).toBe(2);
    expect(summary.sourceObjectFidelityRatio).toBeNull();
    expect(summary.scope).toBe('report-events-only');
  });

  it('does not turn an empty/rejected report into a fictitious perfect score', () => {
    const summary = summarizeFidelityEvidence({
      status: 'rejected',
      objectCount: 0,
      report: emptyImportReport(),
    });
    expect(summary.editableEventRatio).toBeNull();
    expect(summary.degradedEventRatio).toBeNull();
    expect(summary.outcome).toBe('rejected');
  });

  it('rejects bad counts instead of silently clamping evidence', () => {
    for (const value of [-1, NaN, Infinity, 1.5]) {
      expect(() => summarizeFidelityEvidence({
        status: 'ok-partial',
        objectCount: value,
        report: emptyImportReport(),
      })).toThrow('non-negative safe integers');
    }
  });

  it('keeps unsupported and rejected synthetic cases visible in measured results', async () => {
    const observations = await Promise.all(FORMAT_CORPUS.map(runFormatCorpusFixture));
    const summaries = observations.map((observation) => ({
      id: observation.id,
      metrics: summarizeFidelityEvidence({
        status: observation.status,
        objectCount: observation.objectCount,
        report: observation.report,
      }),
    }));

    const unsupported = summaries.find((entry) => entry.id === 'cdr-riff-no-vector-stream')!.metrics;
    expect(unsupported.outcome).toBe('unsupported');
    expect(unsupported.degradedEvents).toBeGreaterThan(0);
    expect(unsupported.editableEventRatio).toBe(0);

    const rejected = summaries.find((entry) => entry.id === 'eps-invalid-header')!.metrics;
    expect(rejected.outcome).toBe('rejected');
    expect(rejected.editableEventRatio).toBeNull();
  });
});
