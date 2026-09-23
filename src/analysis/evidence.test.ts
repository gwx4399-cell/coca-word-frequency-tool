import { describe, expect, it } from 'vitest';
import { parseCocaCsv } from './coca';
import { findLemmaMatches, indexSentenceEvidence } from './evidence';

const coca = parseCocaCsv(`rank,lemma,PoS,freq,perMil
1,use,v,100,10
2,useful,j,90,9
3,important,j,80,8`);

describe('original sentence evidence', () => {
  it('highlights analyzed lemma forms in separate sentences without matching substrings', () => {
    const text = 'Using a useful tool matters. We used it; it was useful! Important use remains';
    const sentences = indexSentenceEvidence(text, coca).get('use') ?? [];

    expect(sentences.map(({ text: original }) => original)).toEqual([
      'Using a useful tool matters.',
      'We used it; it was useful!',
      'Important use remains',
    ]);
    expect(sentences.map(({ text: original, matches }) => matches.map(({ start, end }) => original.slice(start, end)))).toEqual([
      ['Using'], ['used'], ['use'],
    ]);
    expect(findLemmaMatches(text, 'use', coca).map(({ start, end }) => text.slice(start, end))).toEqual(['Using', 'used', 'use']);
    expect(indexSentenceEvidence(text, coca).get('useful')?.flatMap(({ matches }) => matches)).toHaveLength(2);
  });

  it('keeps each occurrence, exact case, punctuation and original offsets, including repeated sentences', () => {
    const text = '  Important, important! Important. Important.';
    const sentences = indexSentenceEvidence(text, coca).get('important') ?? [];
    expect(sentences.map(({ start, text: original, matches }) => ({ start, original, count: matches.length }))).toEqual([
      { start: 2, original: 'Important, important!', count: 2 },
      { start: 24, original: 'Important.', count: 1 },
      { start: 35, original: 'Important.', count: 1 },
    ]);
    expect(sentences.flatMap(({ text: original, matches }) => matches.map(({ start, end }) => original.slice(start, end)))).toEqual([
      'Important', 'important', 'Important', 'Important',
    ]);
  });
});
