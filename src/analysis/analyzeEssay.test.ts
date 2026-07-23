import { describe, expect, it } from 'vitest';
import { analyzeEssay } from './analyzeEssay';
import { parseCocaCsv } from './coca';

const testCocaCsv = `rank,lemma,PoS,freq,perMil
1,decide,v,100,10
2,example,n,80,8
3,test,n,60,6
4,repeat,v,40,4
5,don't,v,30,3
6,stop,v,20,2
7,decide,n,50,5
8,use,v,45,4.5
9,us,p,44,4.4
10,care,v,43,4.3
11,car,n,42,4.2
12,child,n,41,4.1
13,man,n,40,4
14,go,v,39,3.9
15,be,v,38,3.8
16,have,v,37,3.7
17,do,v,36,3.6`;

const cocaEntries = parseCocaCsv(testCocaCsv);

describe('analyzeEssay', () => {
  it('normalizes case and punctuation', () => {
    const result = analyzeEssay('Example, example! TEST.', cocaEntries);

    expect(result.totalWordCount).toBe(3);
    expect(result.lexicalTokenCount).toBe(3);
    expect(result.uniqueLemmaCount).toBe(2);
    expect(result.lemmas[0]).toMatchObject({
      lemma: 'example',
      observedForms: ['Example', 'example'],
      count: 2,
    });
    expect(result.lemmas[1]).toMatchObject({
      lemma: 'test',
      observedForms: ['TEST'],
      count: 1,
    });
  });

  it('returns zeroed metrics for empty text', () => {
    const result = analyzeEssay('', cocaEntries);

    expect(result).toMatchObject({
      totalWordCount: 0,
      lexicalTokenCount: 0,
      uniqueLemmaCount: 0,
      cocaCoveragePct: 0,
      lemmas: [],
    });
  });

  it('normalizes curly apostrophes while preserving observed forms', () => {
    const result = analyzeEssay("Don't stop, don’t.", cocaEntries);

    expect(result.totalWordCount).toBe(3);
    expect(result.lemmas.find((entry) => entry.lemma === "don't")).toMatchObject({
      observedForms: ["Don't", 'don’t'],
      count: 2,
    });
  });

  it('groups common decide inflections under the decide lemma', () => {
    const result = analyzeEssay('decide decides decided deciding', cocaEntries);
    const decide = result.lemmas.find((entry) => entry.lemma === 'decide');

    expect(decide).toMatchObject({
      observedForms: ['decide', 'decides', 'decided', 'deciding'],
      count: 4,
    });
  });

  it('groups use inflections without mapping using to us', () => {
    const result = analyzeEssay('use uses used using', cocaEntries);

    expect(result.lemmas).toEqual([
      expect.objectContaining({
        lemma: 'use',
        observedForms: ['use', 'uses', 'used', 'using'],
        count: 4,
      }),
    ]);
  });

  it('groups care inflections without mapping caring to car', () => {
    const result = analyzeEssay('care cared caring', cocaEntries);

    expect(result.lemmas).toEqual([
      expect.objectContaining({
        lemma: 'care',
        observedForms: ['care', 'cared', 'caring'],
        count: 3,
      }),
    ]);
  });

  it('groups supported irregular forms under their base lemmas', () => {
    const result = analyzeEssay('child children man men go went gone', cocaEntries);

    expect(result.lemmas.find((entry) => entry.lemma === 'child')).toMatchObject({
      observedForms: ['child', 'children'],
      count: 2,
    });
    expect(result.lemmas.find((entry) => entry.lemma === 'man')).toMatchObject({
      observedForms: ['man', 'men'],
      count: 2,
    });
    expect(result.lemmas.find((entry) => entry.lemma === 'go')).toMatchObject({
      observedForms: ['go', 'went', 'gone'],
      count: 3,
    });
  });

  it('filters stop words after lemmatization', () => {
    const result = analyzeEssay('Being having doing', cocaEntries);

    expect(result.totalWordCount).toBe(3);
    expect(result.lexicalTokenCount).toBe(0);
    expect(result.lemmas).toEqual([]);
  });

  it('aggregates duplicate COCA lemma rows instead of overwriting them', () => {
    const decide = cocaEntries.get('decide');

    expect(decide).toMatchObject({
      partsOfSpeech: ['n', 'v'],
      aggregatedFreq: 150,
      aggregatedPerMil: 15,
      derivedLemmaRank: 1,
    });
    expect(decide?.sourceRecords).toHaveLength(2);
  });

  it('keeps lemma rate per 100 words stable when the same text is repeated', () => {
    const once = analyzeEssay('decide example decide', cocaEntries);
    const twice = analyzeEssay('decide example decide decide example decide', cocaEntries);
    const onceDecide = once.lemmas.find((entry) => entry.lemma === 'decide');
    const twiceDecide = twice.lemmas.find((entry) => entry.lemma === 'decide');

    expect(twice.totalWordCount).toBe(once.totalWordCount * 2);
    expect(twiceDecide?.count).toBe((onceDecide?.count ?? 0) * 2);
    expect(twiceDecide?.ratePer100Words).toBeCloseTo(onceDecide?.ratePer100Words ?? 0, 5);
  });
});
