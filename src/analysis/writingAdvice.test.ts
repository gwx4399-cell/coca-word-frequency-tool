import { describe, expect, it } from 'vitest';
import { parseCocaCsv } from './coca';
import { getWritingAdvice } from './writingAdvice';
import type { EssayRecord } from '../types/essay';

const coca = parseCocaCsv(`rank,lemma,PoS,freq,perMil
1,important,j,100,10
2,useful,j,90,9
3,idea,n,80,8`);

function essay(title: string, text: string): EssayRecord {
  return { id: title, title, text, writtenAt: '2026-09-23', createdAt: '2026-09-23T10:00:00Z', updatedAt: '2026-09-23T10:00:00Z' };
}

describe('writing advice from the most recent three essays', () => {
  it('starts with three essays and includes actual per-essay evidence', () => {
    const one = essay('One', 'important important important');
    const two = essay('Two', 'important idea');
    expect(getWritingAdvice([one, two], coca)).toBeNull();

    const advice = getWritingAdvice([essay('Three', 'useful idea'), two, one], coca);
    expect(advice?.focuses[0]).toMatchObject({
      lemma: 'important',
      essayCount: 2,
      totalCount: 4,
      maxInOneEssay: 3,
      meetsCandidateRule: true,
      occurrences: [{ title: 'Two', count: 1 }, { title: 'One', count: 3 }],
    });
  });

  it('offers a cautious practice prompt if a repeated word falls below the candidate threshold', () => {
    const advice = getWritingAdvice([
      essay('Three', 'important important'), essay('Two', 'important'), essay('One', 'useful'),
    ], coca);
    expect(advice?.focuses).toHaveLength(1);
    expect(advice?.focuses[0]).toMatchObject({ lemma: 'important', meetsCandidateRule: false });
  });

  it('keeps one- and two-use totals out of the visible advice list', () => {
    const advice = getWritingAdvice([
      essay('Three', 'important'), essay('Two', 'important'), essay('One', 'useful'),
    ], coca);
    expect(advice?.focuses).toEqual([]);
  });

  it('returns a generic practice prompt when there is no evidence in the sample groups', () => {
    const advice = getWritingAdvice([
      essay('Three', 'idea'), essay('Two', 'idea'), essay('One', 'idea'),
    ], coca);
    expect(advice?.focuses).toEqual([]);
  });
});
