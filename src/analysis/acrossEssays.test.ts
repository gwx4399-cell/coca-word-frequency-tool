import { describe, expect, it } from 'vitest';
import { parseCocaCsv } from './coca';
import { analyzeAcrossEssays } from './acrossEssays';
import type { EssayRecord } from '../types/essay';

const coca = parseCocaCsv(`rank,lemma,PoS,freq,perMil
1,important,j,100,10
2,significant,j,90,9
3,essential,j,80,8
4,crucial,j,70,7
5,issue,n,60,6`);

function essay(id: string, text: string): EssayRecord {
  return { id, title: `Essay ${id}`, text, writtenAt: `2026-09-${id.padStart(2, '0')}`, createdAt: '2026-09-23T10:00:00Z', updatedAt: '2026-09-23T10:00:00Z' };
}

describe('cross-essay analysis', () => {
  it('counts one- and two-use essay rows toward a visible cross-essay total', () => {
    const result = analyzeAcrossEssays([
      essay('3', 'Important important important significant issue'),
      essay('2', 'important essential issue issue'),
      essay('1', 'crucial important'),
    ], coca);

    expect(result.repeatedWords.map((word) => word.lemma)).toEqual(['important', 'issue']);
    expect(result.words.map((word) => word.lemma)).toEqual(['important', 'issue', 'crucial', 'essential', 'significant']);
    expect(result.words.find((word) => word.lemma === 'essential')).toMatchObject({ totalCount: 1, essayCount: 1 });
    expect(result.repeatedWords[0]).toMatchObject({
      totalCount: 5,
      essayCount: 3,
      observedForms: ['Important', 'important'],
      occurrences: [
        { essayId: '3', count: 3 }, { essayId: '2', count: 1 }, { essayId: '1', count: 1 },
      ],
    });
    expect(result.repeatedWords[1]).toMatchObject({ totalCount: 3, essayCount: 2 });
    expect(result.pilotGroup).toMatchObject({ totalCount: 8, essayCount: 3, enoughForDisplay: true });
    expect(result.pilotGroup.leadingMember).toMatchObject({ lemma: 'important', count: 5, sharePct: 62.5 });
    expect(result.pilotGroup.members.map((member) => member.count)).toEqual([5, 1, 1, 1]);
  });

  it('removes deleted evidence and does not divide by zero for an empty group', () => {
    const withTwo = analyzeAcrossEssays([essay('2', 'important important'), essay('1', 'important')], coca);
    expect(withTwo.repeatedWords[0]).toMatchObject({ lemma: 'important', totalCount: 3, essayCount: 2 });
    expect(withTwo.pilotGroup.enoughForDisplay).toBe(true);

    const afterDeletion = analyzeAcrossEssays([essay('1', 'important')], coca);
    expect(afterDeletion.words[0]).toMatchObject({ lemma: 'important', totalCount: 1, essayCount: 1 });
    expect(afterDeletion.repeatedWords).toEqual([]);
    expect(afterDeletion.pilotGroup.enoughForDisplay).toBe(false);

    const empty = analyzeAcrossEssays([essay('1', 'issue')], coca);
    expect(empty.pilotGroup.leadingMember).toBeNull();
    expect(empty.pilotGroup.members.every((member) => member.sharePct === 0)).toBe(true);
  });
});
