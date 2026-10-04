// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  FORMAT_CORPUS,
  runFormatCorpusFixture,
  summarizeCorpus,
  type FormatCorpusFixture,
} from './fixtures/format-corpus.js';

function assertExpectation(
  fixture: FormatCorpusFixture,
  observation: Awaited<ReturnType<typeof runFormatCorpusFixture>>,
): void {
  const expected = fixture.expected;

  expect(observation.status, fixture.id).toBe(expected.status);
  expect(observation.inputBytes, fixture.id).toBeGreaterThan(0);

  if (expected.minObjects !== undefined) {
    expect(observation.objectCount, fixture.id).toBeGreaterThanOrEqual(expected.minObjects);
  }
  if (expected.minEditable !== undefined) {
    expect(observation.report.editable, fixture.id).toBeGreaterThanOrEqual(expected.minEditable);
  }
  if (expected.minSimplified !== undefined) {
    expect(observation.report.simplified, fixture.id).toBeGreaterThanOrEqual(expected.minSimplified);
  }
  if (expected.minUnsupported !== undefined) {
    expect(observation.report.unsupported, fixture.id).toBeGreaterThanOrEqual(expected.minUnsupported);
  }
  for (const code of expected.reportCodes ?? []) {
    expect(
      observation.report.entries.some((entry) => entry.code === code),
      `${fixture.id}: missing report code ${code}`,
    ).toBe(true);
  }
  if (expected.errorIncludes !== undefined) {
    expect(observation.error, fixture.id).toContain(expected.errorIncludes);
  }
}

describe('VEC014 format fidelity corpus', () => {
  it('has stable unique IDs and explicit legal provenance for every fixture', () => {
    const ids = FORMAT_CORPUS.map((fixture) => fixture.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const fixture of FORMAT_CORPUS) {
      expect(fixture.provenance).toBe('synthetic-vectoria');
      expect(fixture.license).toBe('repository');
      expect(fixture.features.length).toBeGreaterThan(0);
      expect(fixture.filename.toLowerCase().endsWith(`.${fixture.format}`)).toBe(true);
    }
  });

  it('covers PDF, AI, CDR and EPS with both successful and degraded/rejected cases', () => {
    const formats = ['pdf', 'ai', 'cdr', 'eps'] as const;
    for (const format of formats) {
      const fixtures = FORMAT_CORPUS.filter((fixture) => fixture.format === format);
      expect(fixtures.length, format).toBeGreaterThanOrEqual(2);
      expect(
        fixtures.some((fixture) => fixture.expected.status === 'ok-partial'),
        `${format}: missing supported baseline`,
      ).toBe(true);
      expect(
        fixtures.some((fixture) =>
          fixture.expected.status === 'unsupported' ||
          fixture.expected.status === 'rejected' ||
          (fixture.expected.minSimplified ?? 0) > 0,
        ),
        `${format}: missing honest degraded/rejected baseline`,
      ).toBe(true);
    }
  });

  it.each(FORMAT_CORPUS)('$id matches the declared compatibility baseline', async (fixture) => {
    const observation = await runFormatCorpusFixture(fixture);
    assertExpectation(fixture, observation);
  });

  it('produces a deterministic compatibility summary without hiding rejection or unsupported counts', async () => {
    const observations = [];
    for (const fixture of FORMAT_CORPUS) {
      observations.push(await runFormatCorpusFixture(fixture));
    }

    const summary = summarizeCorpus(observations);

    expect(summary.pdf.fixtures).toBe(4);
    expect(summary.ai.fixtures).toBe(3);
    expect(summary.cdr.fixtures).toBe(3);
    expect(summary.eps.fixtures).toBe(3);

    expect(summary.ai.rejected).toBe(1);
    expect(summary.cdr.rejected).toBe(1);
    expect(summary.cdr.unsupported).toBeGreaterThanOrEqual(1);
    expect(summary.eps.rejected).toBe(1);
    expect(summary.pdf.simplified).toBeGreaterThanOrEqual(1);

    expect(summary.pdf.editable).toBeGreaterThanOrEqual(4);
    expect(summary.ai.editable).toBeGreaterThanOrEqual(3);
    expect(summary.cdr.editable).toBeGreaterThanOrEqual(1);
    expect(summary.eps.editable).toBeGreaterThanOrEqual(2);
  });
});
