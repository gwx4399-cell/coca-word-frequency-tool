import { describe, expect, it } from 'vitest';
import cocaCsv from '../../data/COCA_WordFrequency_top5000.csv?raw';
import { analyzeEssay } from './analyzeEssay';
import { parseCocaCsv } from './coca';

describe('essay analysis with the bundled COCA CSV', () => {
  it('keeps add forms together without confusing adding with an advertisement', () => {
    const entries = parseCocaCsv(cocaCsv);
    const result = analyzeEssay('add added adding ad', entries);
    expect(result.lemmas.find((row) => row.lemma === 'add')).toMatchObject({ count: 3, observedForms: ['add', 'added', 'adding'] });
    expect(result.lemmas.find((row) => row.lemma === 'ad')?.count).toBe(1);
  });

  it('groups supported irregular verbs while keeping ambiguous exact lemmas', () => {
    const entries = parseCocaCsv(cocaCsv);
    const result = analyzeEssay('write writes wrote written take took taken give gave given choose chose chosen saw', entries);
    for (const [lemma, count] of [['write', 4], ['take', 3], ['give', 3], ['choose', 3]] as const) {
      expect(result.lemmas.find((row) => row.lemma === lemma)?.count).toBe(count);
    }
    expect(result.lemmas.find((row) => row.lemma === 'saw')?.count).toBe(1);
  });
  it('uses real COCA lemmas without matching risky shorter words', () => {
    const cocaEntries = parseCocaCsv(cocaCsv);
    const result = analyzeEssay('use uses used using care cared caring child children', cocaEntries);

    expect(result.lemmas.find((entry) => entry.lemma === 'use')).toMatchObject({
      observedForms: ['use', 'uses', 'used', 'using'],
      count: 4,
    });
    expect(result.lemmas.find((entry) => entry.lemma === 'care')).toMatchObject({
      observedForms: ['care', 'cared', 'caring'],
      count: 3,
    });
    expect(result.lemmas.find((entry) => entry.lemma === 'child')).toMatchObject({
      observedForms: ['child', 'children'],
      count: 2,
    });
    expect(result.lemmas.some((entry) => entry.lemma === 'us' || entry.lemma === 'car')).toBe(false);
    expect(result.cocaCoveragePct).toBe(100);
  });

  it('groups the doubled-consonant run family under its base lemma', () => {
    const cocaEntries = parseCocaCsv(cocaCsv);
    const result = analyzeEssay('run ran running', cocaEntries);
    const pluralResult = analyzeEssay('run runs', cocaEntries);

    expect(result.lemmas).toEqual([
      expect.objectContaining({
        lemma: 'run',
        observedForms: ['run', 'ran', 'running'],
        count: 3,
      }),
    ]);
    expect(pluralResult.lemmas).toEqual([
      expect.objectContaining({
        lemma: 'run',
        observedForms: ['run', 'runs'],
        count: 2,
      }),
    ]);
  });
});
