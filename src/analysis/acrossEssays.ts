import { analyzeEssay } from './analyzeEssay';
import type { CocaLemmaMap } from './coca';
import type { EssayRecord } from '../types/essay';

export type EssayOccurrence = {
  essayId: string;
  title: string;
  writtenAt: string;
  count: number;
  observedForms: string[];
};

export type CrossEssayWord = {
  lemma: string;
  totalCount: number;
  essayCount: number;
  observedForms: string[];
  occurrences: EssayOccurrence[];
};

export type PilotGroupMember = {
  lemma: string;
  count: number;
  sharePct: number;
};

export type PilotGroup = {
  label: string;
  totalCount: number;
  essayCount: number;
  members: PilotGroupMember[];
  leadingMember: PilotGroupMember | null;
  enoughForDisplay: boolean;
};

export type AcrossEssayAnalysis = {
  essayCount: number;
  repeatedWords: CrossEssayWord[];
  pilotGroup: PilotGroup;
};

// A small, inspectable pilot group. Membership is a design hypothesis: these
// words may serve different meanings in a real sentence.
const IMPORTANCE_WORDS = ['important', 'significant', 'essential', 'crucial'] as const;

export function analyzeAcrossEssays(essays: EssayRecord[], cocaEntries: CocaLemmaMap): AcrossEssayAnalysis {
  const byLemma = new Map<string, CrossEssayWord>();

  for (const essay of essays) {
    for (const row of analyzeEssay(essay.text, cocaEntries).lemmas) {
      let word = byLemma.get(row.lemma);
      if (!word) {
        word = { lemma: row.lemma, totalCount: 0, essayCount: 0, observedForms: [], occurrences: [] };
        byLemma.set(row.lemma, word);
      }

      word.totalCount += row.count;
      word.essayCount += 1;
      word.occurrences.push({
        essayId: essay.id,
        title: essay.title,
        writtenAt: essay.writtenAt,
        count: row.count,
        observedForms: row.observedForms,
      });
      for (const form of row.observedForms) {
        if (!word.observedForms.includes(form)) word.observedForms.push(form);
      }
    }
  }

  const repeatedWords = [...byLemma.values()]
    .filter((word) => word.essayCount >= 2 && word.totalCount >= 3)
    .sort((a, b) => b.essayCount - a.essayCount || b.totalCount - a.totalCount || a.lemma.localeCompare(b.lemma));

  const groupWords = IMPORTANCE_WORDS.map((lemma) => byLemma.get(lemma));
  const totalCount = groupWords.reduce((sum, word) => sum + (word?.totalCount ?? 0), 0);
  const essayIds = new Set(groupWords.flatMap((word) => word?.occurrences.map((item) => item.essayId) ?? []));
  const members = IMPORTANCE_WORDS.map((lemma, index) => ({
    lemma,
    count: groupWords[index]?.totalCount ?? 0,
    sharePct: totalCount ? ((groupWords[index]?.totalCount ?? 0) / totalCount) * 100 : 0,
  }));
  const leadingMember = [...members].sort((a, b) => b.count - a.count || a.lemma.localeCompare(b.lemma))[0];

  return {
    essayCount: essays.length,
    repeatedWords,
    pilotGroup: {
      label: '表达重要性 / Importance (pilot)',
      totalCount,
      essayCount: essayIds.size,
      members,
      leadingMember: totalCount ? leadingMember : null,
      enoughForDisplay: totalCount >= 3 && essayIds.size >= 2,
    },
  };
}
