import { analyzeEssay } from './analyzeEssay';
import type { CocaLemmaMap } from './coca';
import type { EssayRecord } from '../types/essay';

type Guide = { lemma: string; practice: string };

// These are review prompts, not automatic synonym substitutions or PoS tagging.
const ADJECTIVE_GUIDES: Guide[] = [
  { lemma: 'important', practice: '如果强调影响大小，可检查 significant；强调不可缺少，可检查 essential。先核对原句含义。' },
  { lemma: 'good', practice: '说明“好”体现在哪里：有益可考虑 beneficial，有效可考虑 effective。不要直接逐词替换。' },
  { lemma: 'bad', practice: '具体写出问题：有害可考虑 harmful，无效可考虑 ineffective；根据论点选择。' },
  { lemma: 'big', practice: '区分尺寸、数量和影响；分别核对 large、substantial 等词是否贴合语境。' },
  { lemma: 'serious', practice: '说明严重的是后果还是紧迫性，再核对 severe 或 urgent 是否准确。' },
  { lemma: 'useful', practice: '说明用途：是 practical（实用），还是 effective（确实有效）？结合例子改写。' },
  { lemma: 'effective', practice: '说明评价标准：是 successful（达到目标），还是 efficient（节省资源）？' },
  { lemma: 'different', practice: '说明差异：是 distinct（性质不同），还是 diverse（种类多样）？' },
];

export type AdviceFocus = {
  lemma: string;
  practice: string;
  totalCount: number;
  essayCount: number;
  maxInOneEssay: number;
  occurrences: { title: string; count: number }[];
  meetsCandidateRule: boolean;
};

export type WritingAdvice = {
  essayCount: number;
  focuses: AdviceFocus[];
};

export function getWritingAdvice(essays: EssayRecord[], cocaEntries: CocaLemmaMap): WritingAdvice | null {
  if (essays.length < 3) return null;

  // The repository supplies newest-first order. Re-check the latest three each time
  // so deleting an essay immediately updates or removes the advice.
  const recent = essays.slice(0, 3);
  const analyses = recent.map((essay) => analyzeEssay(essay.text, cocaEntries));

  const focuses = ADJECTIVE_GUIDES.flatMap(({ lemma, practice }): AdviceFocus[] => {
    if (!cocaEntries.has(lemma)) return [];

    const occurrences = analyses.flatMap((analysis, index) => {
      const count = analysis.lemmas.find((row) => row.lemma === lemma)?.count ?? 0;
      return count ? [{ title: recent[index].title, count }] : [];
    });
    if (!occurrences.length) return [];

    const maxInOneEssay = Math.max(...occurrences.map(({ count }) => count));
    return [{
      lemma,
      practice,
      occurrences,
      maxInOneEssay,
      essayCount: occurrences.length,
      totalCount: occurrences.reduce((sum, item) => sum + item.count, 0),
      meetsCandidateRule: maxInOneEssay >= 3 && occurrences.length >= 2,
    }];
  });

  const candidates = focuses.filter((item) => item.meetsCandidateRule);
  const shortlist = candidates.length ? candidates : focuses.filter((item) => item.essayCount >= 2 && item.totalCount >= 3);
  shortlist.sort((a, b) => b.essayCount - a.essayCount || b.totalCount - a.totalCount || a.lemma.localeCompare(b.lemma));

  return { essayCount: recent.length, focuses: shortlist.slice(0, 3) };
}
