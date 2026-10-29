import type {
  CorpusFormat,
  CorpusStatus,
  FormatCorpusFixture,
  FormatCorpusObservation,
} from './format-corpus.js';

/**
 * A row describes a *synthetic case containing a feature*, not proof that the
 * feature works independently in a real vendor document.
 */
export interface CompatibilityCaseRow {
  readonly fixtureId: string;
  readonly format: CorpusFormat;
  readonly feature: string;
  readonly provenance: 'synthetic-vectoria';
  readonly vendorVersion: null;
  readonly evidenceScope: 'synthetic-case-only';
  readonly caseOutcome: 'editable' | 'partial' | 'unsupported' | 'rejected' | 'unverified';
  readonly providerStatus: CorpusStatus;
  readonly importedObjects: number;
  readonly reportCodes: readonly string[];
}

function caseOutcome(observation: FormatCorpusObservation): CompatibilityCaseRow['caseOutcome'] {
  if (observation.status === 'rejected') return 'rejected';
  if (observation.status === 'unsupported') return 'unsupported';
  if (observation.report.unsupported > 0 || observation.report.simplified > 0 || observation.report.flattened > 0) {
    return 'partial';
  }
  if (observation.objectCount > 0 && observation.report.editable > 0) return 'editable';
  return 'unverified';
}

/** Build a reproducible evidence matrix from observed imports, never claims. */
export function buildCompatibilityCaseMatrix(
  fixtures: readonly FormatCorpusFixture[],
  observations: readonly FormatCorpusObservation[],
): readonly CompatibilityCaseRow[] {
  const observed = new Map<string, FormatCorpusObservation>();
  for (const observation of observations) {
    if (observed.has(observation.id)) throw new Error('Duplicate corpus observation: ' + observation.id);
    observed.set(observation.id, observation);
  }
  const fixtureIds = new Set<string>();

  const rows = fixtures.flatMap((fixture) => {
    if (fixtureIds.has(fixture.id)) throw new Error('Duplicate corpus fixture: ' + fixture.id);
    fixtureIds.add(fixture.id);
    const observation = observed.get(fixture.id);
    if (!observation) throw new Error('Missing corpus observation: ' + fixture.id);
    if (observation.format !== fixture.format) {
      throw new Error('Mismatched corpus format: ' + fixture.id);
    }
    const outcome = caseOutcome(observation);
    const codes = [...new Set(observation.report.entries.map((entry) => entry.code))].sort();
    return fixture.features.map((feature) => ({
      fixtureId: fixture.id,
      format: fixture.format,
      feature,
      provenance: fixture.provenance,
      vendorVersion: null,
      evidenceScope: 'synthetic-case-only' as const,
      caseOutcome: outcome,
      providerStatus: observation.status,
      importedObjects: observation.objectCount,
      reportCodes: codes,
    }));
  });
  for (const id of observed.keys()) {
    if (!fixtureIds.has(id)) throw new Error('Unexpected corpus observation: ' + id);
  }
  return rows;
}
