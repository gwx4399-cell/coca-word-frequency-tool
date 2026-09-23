import { describe, expect, it } from 'vitest';
import demoEssays from '../../data/demo/IELTS_TASK2_FIVE_ESSAYS.json';
import cocaCsv from '../../data/COCA_WordFrequency_top5000.csv?raw';
import { analyzeEssay } from './analyzeEssay';
import { analyzeAcrossEssays } from './acrossEssays';
import { parseCocaCsv } from './coca';
import { getWritingAdvice } from './writingAdvice';
import type { EssayRecord } from '../types/essay';

const coca = parseCocaCsv(cocaCsv);

describe('five original IELTS Task 2 demonstration essays', () => {
  it('keeps low single-essay counts and verifies all-history evidence against the bundled corpus', () => {
    expect(demoEssays).toHaveLength(5);
    expect(new Set(demoEssays.map((item) => item.title)).size).toBe(5);
    const essays: EssayRecord[] = demoEssays.map((item, index) => ({
      ...item,
      id: `demo-${index + 1}`,
      createdAt: `2026-09-${String(index * 2 + 1).padStart(2, '0')}T12:00:00Z`,
      updatedAt: `2026-09-${String(index * 2 + 1).padStart(2, '0')}T12:00:00Z`,
    })).reverse(); // Repository order is newest first.

    for (const essay of essays) {
      const analysis = analyzeEssay(essay.text, coca);
      expect(analysis.totalWordCount).toBeGreaterThanOrEqual(250);
      expect(analysis.lemmas.find((row) => row.lemma === 'significant')?.count).toBe(1);
    }

    const across = analyzeAcrossEssays(essays, coca);
    expect(across.repeatedWords.find((word) => word.lemma === 'significant')).toMatchObject({
      essayCount: 5,
      totalCount: 5,
      occurrences: [
        { title: '[Demo] 05 Flexible Working', count: 1 },
        { title: '[Demo] 04 Healthy School Meals', count: 1 },
        { title: '[Demo] 03 Urban Green Space', count: 1 },
        { title: '[Demo] 02 Digital Classrooms', count: 1 },
        { title: '[Demo] 01 Public Transport', count: 1 },
      ],
    });
    expect(across.words.find((word) => word.lemma === 'crucial')).toMatchObject({ totalCount: 2, essayCount: 2 });
    expect(across.repeatedWords.some((word) => word.lemma === 'crucial')).toBe(false);
    expect(across.pilotGroup.members.map((member) => member.count)).toEqual([13, 5, 5, 2]);
    expect(across.pilotGroup).toMatchObject({ totalCount: 25, essayCount: 5, enoughForDisplay: true });
    expect(across.pilotGroup.leadingMember).toMatchObject({ lemma: 'important', sharePct: 52 });

    const advice = getWritingAdvice(essays, coca);
    expect(advice?.essayCount).toBe(3);
    expect(advice?.focuses.find((focus) => focus.lemma === 'important')).toMatchObject({
      essayCount: 3,
      totalCount: 7,
    });
  });
});
