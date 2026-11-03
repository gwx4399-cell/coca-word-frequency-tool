import { describe, expect, it } from 'vitest';
import cocaCsv from '../../data/COCA_WordFrequency_top5000.csv?raw';
import { parseCocaCsv } from './coca';
import { analyzeEssay } from './analyzeEssay';
import { findLemmaMatches, getSentenceEvidence } from './evidence';

const entries = parseCocaCsv(cocaCsv);
describe('source sentence evidence', () => {
  it('matches the same inflections as the count, retaining exact original offsets', () => {
    const text = '🙂 “I wrote it.”\nShe has written twice. We write and write; a writer reads.';
    const matches = findLemmaMatches(text, 'write', entries);
    expect(matches.map(({ start, end }) => text.slice(start, end))).toEqual(['wrote', 'written', 'write', 'write']);
    expect(matches).toHaveLength(analyzeEssay(text, entries).lemmas.find((row) => row.lemma === 'write')!.count);
    expect(getSentenceEvidence(text, 'write', entries).reduce((sum, row) => sum + row.matches.length, 0)).toBe(4);
  });
  it('shows a sentence once when it contains multiple occurrences', () => {
    const text = 'Important ideas are important. An unimportant detail follows.';
    const evidence = getSentenceEvidence(text, 'important', entries);
    expect(evidence).toHaveLength(1);
    expect(evidence[0].matches).toHaveLength(2);
    expect(text.slice(evidence[0].start, evidence[0].end).trim()).toBe('Important ideas are important.');
    expect(findLemmaMatches(text, 'missing', entries)).toEqual([]);
  });
});
