// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { FORMAT_CORPUS, runFormatCorpusFixture } from './fixtures/format-corpus.js';
import { buildCompatibilityCaseMatrix } from './fixtures/compatibility-matrix.js';

describe('VEC015: evidence-scoped format compatibility matrix', () => {
  it('records every synthetic feature case without inventing vendor-version support', async () => {
    const observations = await Promise.all(FORMAT_CORPUS.map(runFormatCorpusFixture));
    const rows = buildCompatibilityCaseMatrix(FORMAT_CORPUS, observations);

    expect(rows).toHaveLength(FORMAT_CORPUS.reduce((total, fixture) => total + fixture.features.length, 0));
    expect(new Set(rows.map((row) => row.format))).toEqual(new Set(['pdf', 'ai', 'cdr', 'eps']));
    for (const row of rows) {
      expect(row.evidenceScope).toBe('synthetic-case-only');
      expect(row.provenance).toBe('synthetic-vectoria');
      expect(row.vendorVersion).toBeNull();
      expect(row.importedObjects).toBeGreaterThanOrEqual(0);
    }

    expect(rows.find((row) => row.fixtureId === 'cdr-riff-no-vector-stream')?.caseOutcome).toBe('unsupported');
    expect(rows.find((row) => row.fixtureId === 'ai-unrecognized-payload')?.caseOutcome).toBe('rejected');
    expect(rows.find((row) => row.fixtureId === 'pdf-advanced-operators')?.caseOutcome).toBe('partial');
    expect(rows.find((row) => row.fixtureId === 'eps-basic-vector')?.caseOutcome).toBe('editable');
  });

  it('rejects missing, mismatched, duplicate and unexpected results instead of presenting a partial matrix', async () => {
    const fixture = FORMAT_CORPUS[0]!;
    const observation = await runFormatCorpusFixture(fixture);
    expect(() => buildCompatibilityCaseMatrix([fixture], [])).toThrow('Missing corpus observation');
    expect(() => buildCompatibilityCaseMatrix([fixture], [observation, observation])).toThrow('Duplicate corpus observation');
    expect(() => buildCompatibilityCaseMatrix([fixture], [{ ...observation, format: 'cdr' }])).toThrow('Mismatched corpus format');
    expect(() => buildCompatibilityCaseMatrix([], [observation])).toThrow('Unexpected corpus observation');
  });
});
